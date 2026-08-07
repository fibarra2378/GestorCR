import axios from 'axios';
import { config } from '../config';

export interface SendWhatsAppTextOptions {
  toPhone: string;
  text: string;
}

export class WhatsAppService {
  /**
   * Send a text message via WhatsApp Meta Cloud API
   */
  static async sendTextMessage({ toPhone, text }: SendWhatsAppTextOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanPhone = toPhone.replace(/\D/g, '');

    // Check if Meta API token is provided
    if (!config.whatsapp.apiToken || !config.whatsapp.phoneNumberId) {
      console.log(`[WHATSAPP MOCK OUTBOUND] To: ${cleanPhone} | Message: ${text}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    try {
      const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      const messageId = response.data?.messages?.[0]?.id;
      return { success: true, messageId };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Error de conexión con WhatsApp API';
      console.error(`[WHATSAPP ERROR] Fallo al enviar mensaje a ${cleanPhone}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send standardized async receipt acknowledgment with ticket code
   */
  static async sendAsyncTicketAck(toPhone: string, ticketCode: string, affiliateName?: string): Promise<void> {
    const greeting = affiliateName ? `Estimado/a ${affiliateName}` : 'Estimado/a Afiliado/a';
    const text = `📌 *Colegio de Fonoaudiólogos - Acuse de Recibo*\n\n${greeting},\n\nHemos recibido su requerimiento correctamente y se ha generado el ticket de atención:\n\n🎫 *Ticket Nº:* \`${ticketCode}\`\n\nUn operador de nuestro equipo revisará su consulta y le responderá a la brevedad por este medio.\n\n*Horario de Atención:* Lunes a Viernes de 08:00 a 16:00 hs.`;

    await this.sendTextMessage({ toPhone, text });
  }

  /**
   * Send identity prompt message when phone is unlinked
   */
  static async sendIdentityPrompt(toPhone: string): Promise<void> {
    const text = `👋 *Bienvenido al Colegio de Fonoaudiólogos*\n\nPara iniciar su atención y procesar su consulta o reclamo, necesitamos verificar su afiliación.\n\nPor favor, responda a este mensaje indicando su *DNI* (ej: 30123456) o su *Número de Matrícula* (ej: M-5432).`;
    await this.sendTextMessage({ toPhone, text });
  }

  /**
   * Send identity validation failed message
   */
  static async sendIdentityNotFound(toPhone: string): Promise<void> {
    const text = `⚠️ *Identificación no encontrada*\n\nNo pudimos encontrar un afiliado activo registrado con ese DNI o Matrícula.\n\nPor favor, verifique los datos ingresados y vuelva a escribir su *DNI* o *Matrícula*. Si requiere asistencia para colegiarse, indique "Asistencia".`;
    await this.sendTextMessage({ toPhone, text });
  }
}
