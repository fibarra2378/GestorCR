import { Request, Response } from 'express';
import { prisma } from '../db';
import { config } from '../config';
import { WhatsAppService } from '../services/whatsapp.service';
import { QueueService } from '../services/queue.service';
import { WSService } from '../services/ws.service';
import { TicketCategory, TicketStatus, MessageSender } from '@prisma/client';

export class WhatsAppController {
  /**
   * GET /api/whatsapp/webhook
   * Verification endpoint required by Meta WhatsApp Cloud API
   */
  static verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      console.log('[WHATSAPP WEBHOOK] Webhook verificado correctamente por Meta.');
      return res.status(200).send(challenge);
    }

    console.error('[WHATSAPP WEBHOOK] Fallo en la verificación del token.');
    return res.sendStatus(403);
  }

  /**
   * POST /api/whatsapp/webhook
   * Webhook listener for incoming WhatsApp messages
   */
  static async handleWebhook(req: Request, res: Response) {
    // Meta requires immediate 200 OK acknowledgment
    res.status(200).send('EVENT_RECEIVED');

    try {
      const body = req.body;

      if (body.object !== 'whatsapp_business_account') {
        return;
      }

      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== 'messages') continue;

          const value = change.value;
          if (!value || !value.messages || value.messages.length === 0) continue;

          const messageObj = value.messages[0];
          const fromPhone = messageObj.from; // e.g. "5491133334444"
          const waMessageId = messageObj.id;
          
          let textBody = '';
          if (messageObj.type === 'text' && messageObj.text?.body) {
            textBody = messageObj.text.body.trim();
          } else if (messageObj.type === 'interactive' && messageObj.interactive?.button_reply) {
            textBody = messageObj.interactive.button_reply.title;
          } else {
            textBody = '[Mensaje multimedia o no de texto]';
          }

          if (!textBody) continue;

          // Process the incoming message
          await WhatsAppController.processIncomingMessage(fromPhone, textBody, waMessageId);
        }
      }
    } catch (error) {
      console.error('[WHATSAPP WEBHOOK ERROR]', error);
    }
  }

  /**
   * Core logic to process an incoming WhatsApp message
   */
  public static async processIncomingMessage(fromPhone: string, textBody: string, waMessageId?: string) {
    const cleanPhone = fromPhone.replace(/\D/g, '');

    // 1. Search for existing affiliate by phone number
    const affiliate = await prisma.affiliate.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: cleanPhone.startsWith('549') ? cleanPhone.replace('549', '54') : cleanPhone },
          { phone: cleanPhone.startsWith('54') ? cleanPhone.replace('54', '549') : cleanPhone }
        ]
      }
    });

    if (affiliate) {
      // Affiliate is recognized!
      await WhatsAppController.handleAffiliateMessage(affiliate, cleanPhone, textBody, waMessageId);
      return;
    }

    // 2. Affiliate NOT linked to this phone -> Check BotSession
    let session = await prisma.botSession.findUnique({
      where: { phone: cleanPhone }
    });

    if (!session) {
      // Start identity verification session
      await prisma.botSession.create({
        data: {
          phone: cleanPhone,
          step: 'AWAITING_IDENTITY'
        }
      });
      await WhatsAppService.sendIdentityPrompt(cleanPhone);
      return;
    }

    if (session.step === 'AWAITING_IDENTITY') {
      // Try to match input against DNI or Matrícula
      const inputClean = textBody.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      const matchedAffiliate = await prisma.affiliate.findFirst({
        where: {
          OR: [
            { dni: inputClean },
            { matricula: { equals: inputClean, mode: 'insensitive' } },
            { matricula: { equals: `M-${inputClean}`, mode: 'insensitive' } }
          ]
        }
      });

      if (matchedAffiliate) {
        // Link phone to affiliate
        await prisma.affiliate.update({
          where: { id: matchedAffiliate.id },
          data: { phone: cleanPhone }
        });

        // Clear session
        await prisma.botSession.delete({ where: { phone: cleanPhone } });

        // Process message under newly linked affiliate!
        await WhatsAppController.handleAffiliateMessage(matchedAffiliate, cleanPhone, textBody, waMessageId);
      } else {
        // Validation failed
        const newAttempts = session.attempts + 1;
        if (newAttempts >= 3) {
          // Fallback: create unlinked Guest ticket for operator intervention
          await prisma.botSession.delete({ where: { phone: cleanPhone } });
          const ticketCode = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;

          const ticket = await prisma.ticket.create({
            data: {
              code: ticketCode,
              phone: cleanPhone,
              category: TicketCategory.CONSULTA,
              status: TicketStatus.NUEVO,
              messages: {
                create: {
                  sender: MessageSender.AFILIADO,
                  body: `[Afiliado No Identificado - Intento DNI/Matrícula: ${textBody}]\n${textBody}`,
                  whatsappId: waMessageId
                }
              }
            },
            include: { messages: true }
          });

          WSService.broadcast('NEW_TICKET', ticket);
          await QueueService.enqueueTicketAck(cleanPhone, ticketCode);
        } else {
          await prisma.botSession.update({
            where: { phone: cleanPhone },
            data: { attempts: newAttempts }
          });
          await WhatsAppService.sendIdentityNotFound(cleanPhone);
        }
      }
    }
  }

  /**
   * Handle incoming message for an identified affiliate
   */
  private static async handleAffiliateMessage(
    affiliate: any,
    cleanPhone: string,
    textBody: string,
    waMessageId?: string
  ) {
    // Check for an active (non-resolved, non-closed) ticket
    const activeTicket = await prisma.ticket.findFirst({
      where: {
        affiliateId: affiliate.id,
        status: {
          in: [TicketStatus.NUEVO, TicketStatus.EN_REVISION, TicketStatus.PENDIENTE_AFILIADO]
        }
      },
      orderBy: { createdAt: 'desc' },
      include: { affiliate: true, messages: true }
    });

    if (activeTicket) {
      // Append message to active ticket
      const newMessage = await prisma.message.create({
        data: {
          ticketId: activeTicket.id,
          sender: MessageSender.AFILIADO,
          body: textBody,
          whatsappId: waMessageId
        }
      });

      // Update ticket status to EN_REVISION if it was PENDIENTE_AFILIADO
      if (activeTicket.status === TicketStatus.PENDIENTE_AFILIADO) {
        await prisma.ticket.update({
          where: { id: activeTicket.id },
          data: { status: TicketStatus.EN_REVISION }
        });
      }

      WSService.broadcast('NEW_MESSAGE', { ticketId: activeTicket.id, message: newMessage });
    } else {
      // Create new ticket for affiliate
      const ticketCode = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;

      // Simple category detection
      let category: TicketCategory = TicketCategory.CONSULTA;
      const lower = textBody.toLowerCase();
      if (lower.includes('reclamo') || lower.includes('queja') || lower.includes('error')) {
        category = TicketCategory.RECLAMO;
      } else if (lower.includes('matricula') || lower.includes('matrícula') || lower.includes('colegiacion')) {
        category = TicketCategory.MATRICULA;
      } else if (lower.includes('cuota') || lower.includes('pago') || lower.includes('factura')) {
        category = TicketCategory.CUOTA;
      }

      const ticket = await prisma.ticket.create({
        data: {
          code: ticketCode,
          phone: cleanPhone,
          affiliateId: affiliate.id,
          category,
          status: TicketStatus.NUEVO,
          messages: {
            create: {
              sender: MessageSender.AFILIADO,
              body: textBody,
              whatsappId: waMessageId
            }
          }
        },
        include: { affiliate: true, messages: true }
      });

      // Broadcast to WebSocket Dashboard listeners
      WSService.broadcast('NEW_TICKET', ticket);

      // Send async acknowledgment via queue
      await QueueService.enqueueTicketAck(cleanPhone, ticketCode, affiliate.fullName);
    }
  }
}
