import nodemailer from 'nodemailer';
import { config } from '../config';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter() {
    if (!this.transporter) {
      const emailUser = process.env.EMAIL_USER || 'deptotemporariosantafe@gmail.com';
      const emailPass = process.env.EMAIL_PASS;

      if (emailPass) {
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.EMAIL_SMTP_PORT) || 465,
          secure: true,
          auth: {
            user: emailUser,
            pass: emailPass
          }
        });
      }
    }
    return this.transporter;
  }

  /**
   * Send an outgoing email via Nodemailer SMTP or log mock
   */
  static async sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const fromAddress = process.env.EMAIL_USER || 'deptotemporariosantafe@gmail.com';
    const transporter = this.getTransporter();

    if (!transporter) {
      console.log(`[EMAIL MOCK OUTBOUND] From: ${fromAddress} | To: ${to} | Subject: ${subject}`);
      console.log(`[EMAIL BODY]:\n${text}`);
      return { success: true, messageId: `mock_email_${Date.now()}` };
    }

    try {
      const info = await transporter.sendMail({
        from: `"Colegio de Fonoaudiólogos" <${fromAddress}>`,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br/>')
      });

      console.log(`[EMAIL ENVIADO] MessageID: ${info.messageId} a ${to}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EMAIL ERROR] Fallo al enviar correo a ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send standardized async receipt acknowledgment for email tickets
   */
  static async sendEmailTicketAck(toEmail: string, ticketCode: string, affiliateName?: string): Promise<void> {
    const greeting = affiliateName ? `Estimado/a ${affiliateName}` : 'Estimado/a Afiliado/a';
    const subject = `📌 Acuse de Recibo - Ticket Nº ${ticketCode} | Colegio de Fonoaudiólogos`;
    const text = `${greeting},\n\nHemos recibido su requerimiento por correo electrónico y se ha generado su ticket de atención:\n\n🎫 Ticket Nº: ${ticketCode}\n\nUn operador de nuestro equipo revisará su consulta/reclamo y le responderá por este mismo medio.\n\nAtentamente,\nColegio de Fonoaudiólogos de Santa Fe`;

    await this.sendEmail({ to: toEmail, subject, text });
  }
}
