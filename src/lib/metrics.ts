import client from 'prom-client';
import type { Response } from 'express';
import { logger } from './logger.js';

client.collectDefaultMetrics();

export const queueJobCounter = new client.Counter({
  name: 'postal_zero_queue_jobs_total',
  help: 'Count of BullMQ jobs processed by queue type',
  labelNames: ['queue', 'status']
});

export const httpRequestCounter = new client.Counter({
  name: 'postal_zero_http_requests_total',
  help: 'Count of incoming HTTP requests',
  labelNames: ['method', 'route', 'status']
});

export const httpRequestDuration = new client.Histogram({
  name: 'postal_zero_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.02, 0.05, 0.1, 0.3, 1, 3]
});

export const metricsHandler = async (_req: unknown, res: Response) => {
  try {
    const body = await client.register.metrics();
    res.setHeader('Content-Type', client.register.contentType);
    res.send(body);
  } catch (error) {
    logger.error({ err: error }, 'Failed to collect metrics');
    res.status(500).send('metrics collection failed');
  }
};
