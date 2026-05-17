import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './lib/config.js';
import { requestLogger, logger } from './lib/logger.js';
import { metricsHandler, httpRequestCounter, httpRequestDuration } from './lib/metrics.js';

const app = express();
const prisma = new PrismaClient();
const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 10000,
  reconnectOnError: () => true
});

app.use(helmet());
app.use(express.json());
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;
    httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route: req.path, status: res.statusCode }, duration);
  });
  next();
});

app.get('/healthz', async (_req, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redisClient.ping();
    res.status(200).send('ok');
  } catch (error) {
    logger.warn({ err: error }, 'Health check failed');
    res.status(503).send('unavailable');
  }
});
app.get('/metrics', metricsHandler);

app.use((_req, res: Response) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled exception');
  res.status(500).json({ error: 'internal_server_error' });
  next();
});

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  logger.info({ port, env: config.env }, 'Postal Zero API is running');
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');
  await Promise.allSettled([redisClient.quit(), prisma.$disconnect()]);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});
