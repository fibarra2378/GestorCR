import { prisma } from '../db';
import { EmailService } from './email.service';
import { WSService } from './ws.service';
import { TicketCategory, TicketStatus, MessageSender, TicketChannel } from '@prisma/client';

export interface IncomingEmailPayload {
  fromEmail: string;
  fromName?: string;
  subject: string;
  body: string;
  emailMessageId?: string;
}

export class EmailWorkerService {
  /**
   * Validate if the subject contains keywords 'consulta' or 'reclamo' (case-insensitive)
   */
  public static shouldProcessEmail(subject: string): boolean {
    if (!subject) return false;
    const lower = subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower.includes('consulta') || lower.includes('reclamo');
  }

  /**
   * Core logic to ingest an incoming email sent to deptotemporariosantafe@gmail.com
   */
  public static async processIncomingEmail(payload: IncomingEmailPayload): Promise<{ processed: boolean; ticketCode?: string; reason?: string }> {
    const { fromEmail, fromName, subject, body, emailMessageId } = payload;
    const cleanEmail = fromEmail.trim().toLowerCase();

    // 1. Verify Subject Filter ("consulta" or "reclamo")
    if (!this.shouldProcessEmail(subject)) {
      console.log(`[EMAIL INGESTION IGNORED] Mail de ${cleanEmail} omitido. Asunto sin palabra clave 'consulta'/'reclamo': "${subject}"`);
      return { processed: false, reason: 'Asunto no contiene consulta o reclamo' };
    }

    console.log(`[EMAIL INGESTION MATCH] Procesando correo válido de ${cleanEmail} | Asunto: "${subject}"`);

    // 2. Search for existing affiliate by email
    const affiliate = await prisma.affiliate.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' }
      }
    });

    // 3. Determine Category (RECLAMO vs CONSULTA)
    let category: TicketCategory = TicketCategory.CONSULTA;
    const lowerSubj = subject.toLowerCase();
    if (lowerSubj.includes('reclamo') || body.toLowerCase().includes('reclamo')) {
      category = TicketCategory.RECLAMO;
    }

    // 4. Check for active open ticket from this email
    const activeTicket = await prisma.ticket.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        channel: TicketChannel.EMAIL,
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
          body: `[Email: ${subject}]\n\n${body}`,
          emailMessageId
        }
      });

      if (activeTicket.status === TicketStatus.PENDIENTE_AFILIADO) {
        await prisma.ticket.update({
          where: { id: activeTicket.id },
          data: { status: TicketStatus.EN_REVISION }
        });
      }

      WSService.broadcast('NEW_MESSAGE', { ticketId: activeTicket.id, message: newMessage });
      return { processed: true, ticketCode: activeTicket.code };
    }

    // 5. Create new ticket for email
    const ticketCode = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;
    const ticket = await prisma.ticket.create({
      data: {
        code: ticketCode,
        phone: affiliate?.phone || cleanEmail,
        email: cleanEmail,
        channel: TicketChannel.EMAIL,
        category,
        status: TicketStatus.NUEVO,
        affiliateId: affiliate?.id,
        messages: {
          create: {
            sender: MessageSender.AFILIADO,
            body: `[Email Entrante a deptotemporariosantafe@gmail.com]\nAsunto: ${subject}\nDe: ${fromName || cleanEmail} <${cleanEmail}>\n\n${body}`,
            emailMessageId
          }
        }
      },
      include: { affiliate: true, messages: true }
    });

    WSService.broadcast('NEW_TICKET', ticket);

    // Send async acknowledgment email
    await EmailService.sendEmailTicketAck(cleanEmail, ticketCode, affiliate?.fullName || fromName);

    return { processed: true, ticketCode };
  }
}
