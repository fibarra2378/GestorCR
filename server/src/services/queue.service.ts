import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { WhatsAppService } from './whatsapp.service';

let messageQueue: Queue | null = null;

try {
  const redisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  };

  const connection = new Redis(config.redisUrl, redisOptions);

  connection.on('connect', () => {
    console.log('[QUEUE] Conectado exitosamente a Redis');
  });

  connection.on('error', (err) => {
    // Graceful silent failover if Redis is not reachable
  });

  messageQueue = new Queue('whatsapp-outbound', { connection });

  new Worker(
    'whatsapp-outbound',
    async (job) => {
      const { type, toPhone, ticketCode, affiliateName, text } = job.data;

      if (type === 'TICKET_ACK') {
        await WhatsAppService.sendAsyncTicketAck(toPhone, ticketCode, affiliateName);
      } else if (type === 'CUSTOM_TEXT') {
        await WhatsAppService.sendTextMessage({ toPhone, text });
      }
    },
    { connection }
  );
} catch (e) {
  console.log('[QUEUE] Fallback a procesamiento en línea sin cola Redis');
}

export class QueueService {
  static async enqueueTicketAck(toPhone: string, ticketCode: string, affiliateName?: string) {
    if (messageQueue) {
      try {
        await messageQueue.add('ack', { type: 'TICKET_ACK', toPhone, ticketCode, affiliateName });
        return;
      } catch (err) {
        // Fallback if Redis queue fails
      }
    }
    setImmediate(async () => {
      await WhatsAppService.sendAsyncTicketAck(toPhone, ticketCode, affiliateName);
    });
  }

  static async enqueueCustomText(toPhone: string, text: string) {
    if (messageQueue) {
      try {
        await messageQueue.add('custom', { type: 'CUSTOM_TEXT', toPhone, text });
        return;
      } catch (err) {
        // Fallback
      }
    }
    setImmediate(async () => {
      await WhatsAppService.sendTextMessage({ toPhone, text });
    });
  }
}
