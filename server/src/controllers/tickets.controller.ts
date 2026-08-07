import { Request, Response } from 'express';
import { prisma } from '../db';
import { WhatsAppService } from '../services/whatsapp.service';
import { WSService } from '../services/ws.service';
import { MessageSender, TicketStatus } from '@prisma/client';

export class TicketsController {
  static async getTickets(req: Request, res: Response) {
    try {
      const { status, category, search } = req.query;

      const whereClause: any = {};

      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      if (category && category !== 'ALL') {
        whereClause.category = category;
      }

      if (search) {
        const query = String(search).trim();
        whereClause.OR = [
          { code: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { affiliate: { fullName: { contains: query, mode: 'insensitive' } } },
          { affiliate: { dni: { contains: query } } },
          { affiliate: { matricula: { contains: query, mode: 'insensitive' } } }
        ];
      }

      const tickets = await prisma.ticket.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        include: {
          affiliate: true,
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return res.json({ success: true, data: tickets });
    } catch (error: any) {
      console.error('[GET TICKETS ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al obtener la lista de tickets' });
    }
  }

  static async getTicketById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          affiliate: true,
          messages: {
            orderBy: { createdAt: 'asc' }
          },
          assignedTo: {
            select: { id: true, name: true, username: true }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket no encontrado' });
      }

      return res.json({ success: true, data: ticket });
    } catch (error: any) {
      console.error('[GET TICKET BY ID ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al obtener detalles del ticket' });
    }
  }

  static async updateTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, category, priority, assignedToId } = req.body;

      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(category && { category }),
          ...(priority && { priority }),
          ...(assignedToId !== undefined && { assignedToId })
        },
        include: {
          affiliate: true,
          assignedTo: { select: { id: true, name: true, username: true } }
        }
      });

      WSService.broadcast('TICKET_UPDATED', updated);

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[UPDATE TICKET ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al actualizar el ticket' });
    }
  }

  static async sendOperatorReply(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { body } = req.body;

      if (!body || !body.trim()) {
        return res.status(400).json({ success: false, error: 'El contenido del mensaje no puede estar vacío' });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: { affiliate: true }
      });

      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket no encontrado' });
      }

      // Save message in DB
      const message = await prisma.message.create({
        data: {
          ticketId: ticket.id,
          sender: MessageSender.OPERADOR,
          body: body.trim()
        }
      });

      // Update ticket status to EN_REVISION or PENDIENTE_AFILIADO
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.PENDIENTE_AFILIADO,
          updatedAt: new Date()
        }
      });

      // Send to WhatsApp via Meta API
      const whatsappResult = await WhatsAppService.sendTextMessage({
        toPhone: ticket.phone,
        text: `💬 *Respuesta de Colegio de Fonoaudiólogos (Ticket ${ticket.code}):*\n\n${body.trim()}`
      });

      if (whatsappResult.messageId) {
        await prisma.message.update({
          where: { id: message.id },
          data: { whatsappId: whatsappResult.messageId }
        });
      }

      WSService.broadcast('NEW_MESSAGE', { ticketId: ticket.id, message });
      WSService.broadcast('TICKET_UPDATED', updatedTicket);

      return res.json({ success: true, data: { message, ticket: updatedTicket } });
    } catch (error: any) {
      console.error('[REPLY TICKET ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al enviar la respuesta al afiliado' });
    }
  }
}
