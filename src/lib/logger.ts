import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime
});

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  req.requestId = requestId;
  req.log = logger.child({ requestId, path: req.path, method: req.method });
  next();
};
