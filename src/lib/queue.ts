import { Queue, Worker, QueueEvents, WorkerOptions } from 'bullmq';
import { RedisOptions } from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

const redisUrl = new URL(config.redisUrl);
const redisConnectionOptions: RedisOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || '6379'),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  reconnectOnError: () => true,
  connectTimeout: 10000
};

export const createQueue = (name: string) => new Queue(name, { connection: redisConnectionOptions });

export const createWorker = (
  name: string,
  processor: (job: any) => Promise<unknown>,
  options: Partial<WorkerOptions> = {}
) => {
  const worker = new Worker(name, processor, { ...options, connection: redisConnectionOptions });
  const queueEvents = new QueueEvents(name, { connection: redisConnectionOptions });

  worker.on('error', (error) => logger.error({ queue: name, err: error }, 'Worker error'));
  queueEvents.on('error', (error) => logger.error({ queue: name, err: error }, 'Queue events error'));
  queueEvents.on('failed', ({ jobId, failedReason }) => logger.warn({ queue: name, jobId, failedReason }, 'Queue job failed'));
  queueEvents.on('completed', ({ jobId, returnvalue }) => logger.info({ queue: name, jobId, returnvalue }, 'Queue job completed'));

  const shutdown = async (signal: string) => {
    logger.info({ queue: name, signal }, 'Shutting down queue worker');
    await worker.close();
    await queueEvents.close();
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  return worker;
};
