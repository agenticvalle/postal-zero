import crypto from 'crypto';
import { config } from './config.js';

export const signWebhookPayload = (payload: string) => {
  const signature = crypto.createHmac('sha256', config.webhookHmacSecret)
    .update(payload)
    .digest('base64url');
  return `sha256=${signature}`;
};

export const verifyWebhookSignature = (payload: string, headerSignature: string) => {
  if (!headerSignature?.startsWith('sha256=')) {
    return false;
  }

  const expected = signWebhookPayload(payload);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(headerSignature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};
