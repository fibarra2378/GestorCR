import { prisma } from '../db';
import { EmailService } from './email.service';
import { WSService } from './ws.service';
import { TicketCategory, TicketStatus, MessageSender, TicketChannel } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export interface IncomingEmailPayload {
  fromEmail: string;
  fromName?: string;
  subject: string;
  body: string;
  emailMessageId?: string;
}

export class EmailWorkerService {
  private static isPollingRunning = false;
  private static pollTimer: NodeJS.Timeout | null = null;
  private static processedMessageIds = new Set<string>();

  /**
   * Validate if the subject contains keywords 'consulta' or 'reclamo' (case-insensitive)
   */
  public static shouldProcessEmail(subject: string): boolean {
    if (!subject) return false;
    const lower = subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower.includes('consulta') || lower.includes('reclamo');
  }

  /**
   * Start background IMAP polling loop for deptotemporariosantafe@gmail.com
   */
  public static startPolling() {
    if (this.isPollingRunning) return;
    this.isPollingRunning = true;

    const emailUser = process.env.EMAIL_USER || 'deptotemporariosantafe@gmail.com';
    const emailPass = process.env.EMAIL_PASS;
    const pollInterval = Number(process.env.EMAIL_POLL_INTERVAL_MS) || 15000; // 15 seconds

    console.log(`[EMAIL IMAP WORKER] Iniciando servicio de escucha para ${emailUser}...`);

    if (!emailPass) {
      console.log(`⚠️ [EMAIL IMAP ADVERTENCIA] Falta EMAIL_PASS (Contraseña de Aplicación) en .env.`);
      console.log(`📌 Para sincronización automática 24/7 con Gmail, configure EMAIL_PASS en server/.env.`);
      return;
    }

    // Execute initial check immediately
    this.checkImapInbox(emailUser, emailPass);

    // Schedule periodic polling
    this.pollTimer = setInterval(() => {
      this.checkImapInbox(emailUser, emailPass);
    }, pollInterval);
  }

  /**
   * Connect to imap.gmail.com:993 and fetch UNSEEN / recent emails across all folders
   */
  private static async checkImapInbox(emailUser: string, emailPass: string) {
    const client = new ImapFlow({
      host: process.env.EMAIL_IMAP_HOST || 'imap.gmail.com',
      port: Number(process.env.EMAIL_IMAP_PORT) || 993,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass
      },
      logger: false,
      emitLogs: false
    });

    client.on('error', (err) => {
      console.error(`[EMAIL IMAP SOCKET ERROR] (${emailUser}):`, err.message);
    });

    try {
      await client.connect();

      // Get list of all available mailboxes
      const mailboxes = await client.list();
      const folderNames = mailboxes.map(b => b.path);
      console.log(`[EMAIL IMAP FOLDERS DETECTED] (${folderNames.length} carpetas):`, folderNames.join(', '));

      const targetFolders = ['INBOX'];
      for (const path of folderNames) {
        if (path.includes('Spam') || path.includes('Junk') || path.includes('Todos') || path.includes('All') || path.includes('Sent') || path.includes('Enviados')) {
          if (!targetFolders.includes(path)) {
            targetFolders.push(path);
          }
        }
      }


      for (const folder of targetFolders) {
        await this.scanMailbox(client, folder);
      }

      await client.logout();
    } catch (error: any) {
      console.error(`[EMAIL IMAP ERROR] Error al conectar a Gmail (${emailUser}):`, error.message);
    }
  }


  /**
   * Scan specific mailbox for the latest 25 messages received
   */
  private static async scanMailbox(client: ImapFlow, mailboxName: string) {
    let lock;
    try {
      lock = await client.getMailboxLock(mailboxName);
    } catch {
      return; // Mailbox not found
    }

    try {
      const total = client.mailbox ? client.mailbox.exists : 0;
      if (!total || total === 0) return;

      const startSeq = Math.max(1, total - 25);
      const range = `${startSeq}:${total}`;

      console.log(`[EMAIL IMAP SCAN] Escaneando '${mailboxName}' (Mensajes ${range} de ${total})...`);

      const messages = client.fetch(range, { source: true, envelope: true, uid: true });
      const fetchedMsgs = [];

      for await (const msg of messages) {
        fetchedMsgs.push(msg);
      }

      // Process newest messages first (highest sequence number first)
      fetchedMsgs.reverse();

      for (const msg of fetchedMsgs) {
        try {
          if (!msg || !msg.source) continue;

          const msgId = msg.envelope?.messageId || `seq_${mailboxName}_${msg.seq}`;
          if (this.processedMessageIds.has(msgId)) continue;

          const parsed = await simpleParser(msg.source);
          const envFrom = msg.envelope?.from && msg.envelope.from.length > 0 ? msg.envelope.from[0] : undefined;
          const fromEmail = parsed.from?.value[0]?.address || envFrom?.address || '';
          const fromName = parsed.from?.value[0]?.name || envFrom?.name || fromEmail;
          const subject = parsed.subject || msg.envelope?.subject || '';
          const body = parsed.text || parsed.html || '';

          if (!fromEmail) continue;

          console.log(`[EMAIL IMAP FETCH] Mail #${msg.seq} en '${mailboxName}' | De: ${fromEmail} | Asunto: "${subject}"`);

          const result = await this.processIncomingEmail({
            fromEmail,
            fromName,
            subject,
            body,
            emailMessageId: msgId
          });

          if (result.processed || result.reason) {
            this.processedMessageIds.add(msgId);
          }

          if (msg.uid) {
            await client.messageFlagsAdd(msg.uid.toString(), ['\\Seen'], { uid: true });
          }
        } catch (fetchErr: any) {
          console.error(`[EMAIL IMAP FETCH ERROR] Error procesando mensaje en '${mailboxName}':`, fetchErr.message);
        }
      }
    } finally {
      lock.release();
    }
  }


  /**
   * Core logic to ingest an incoming email sent to deptotemporariosantafe@gmail.com
   */
  public static async processIncomingEmail(payload: IncomingEmailPayload): Promise<{ processed: boolean; ticketCode?: string; reason?: string }> {
    const { fromEmail, fromName, subject, body, emailMessageId } = payload;
    const cleanEmail = fromEmail.trim().toLowerCase();
    const systemUser = (process.env.EMAIL_USER || 'deptotemporariosantafe@gmail.com').trim().toLowerCase();

    // 0. Ignore system outbound copies (e.g. sent to self or auto-ack copies)
    if (cleanEmail === systemUser) {
      console.log(`[EMAIL SYSTEM OUTBOUND SKIPPED] Mail emitido por la propia casilla del sistema omitido: ${cleanEmail}`);
      return { processed: false, reason: 'Mail propio del sistema' };
    }

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

    // 4. Extract ticket code from subject if it's a reply (e.g., "Re: Ticket Nº TICK-123456")
    const ticketCodeMatch = subject.match(/TICK-\d{6}/i);
    let activeTicket = null;

    if (ticketCodeMatch) {
      activeTicket = await prisma.ticket.findFirst({
        where: {
          code: { equals: ticketCodeMatch[0].toUpperCase() }
        },
        include: { affiliate: true, messages: true }
      });
    }

    // If no explicit ticket code in subject, check for active open ticket from this email
    if (!activeTicket) {
      activeTicket = await prisma.ticket.findFirst({
        where: {
          email: { equals: cleanEmail, mode: 'insensitive' },
          channel: TicketChannel.EMAIL,
          status: {
            in: [TicketStatus.NUEVO, TicketStatus.EN_REVISION, TicketStatus.PENDIENTE_AFILIADO]
          }
        },
        orderBy: { updatedAt: 'desc' },
        include: { affiliate: true, messages: true }
      });
    }

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

      // Update ticket updatedAt, status to NUEVO to alert operators, and affiliateId if not linked
      const updatedTicket = await prisma.ticket.update({
        where: { id: activeTicket.id },
        data: {
          status: TicketStatus.NUEVO,
          updatedAt: new Date(),
          ...(!activeTicket.affiliateId && affiliate ? { affiliateId: affiliate.id } : {})
        },
        include: {
          affiliate: true,
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      WSService.broadcast('NEW_MESSAGE', { ticketId: activeTicket.id, message: newMessage });
      WSService.broadcast('TICKET_UPDATED', updatedTicket);

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
