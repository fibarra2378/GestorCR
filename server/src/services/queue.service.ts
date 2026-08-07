import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';

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

  connection.on('error', () => {
    // Silent failover if Redis is not available
  });

  messageQueue = new Queue('outbound-messages', { connection });

  new Worker(
    'outbound-messages',
    async (job) => {
      console.log('[QUEUE JOB PROCESSED]', job.data);
    },
    { connection }
  );
} catch (e) {
  console.log('[QUEUE] Fallback a procesamiento directo sin cola Redis');
}

export class QueueService {
  static async enqueueJob(type: string, data: any) {
    if (messageQueue) {
      try {
        await messageQueue.add(type, data);
        return;
      } catch (err) {
        // Fallback
      }
    }
  }
}
