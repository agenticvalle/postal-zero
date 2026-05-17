import crypto from 'crypto';
import { config } from './config.js';

export const signReceipt = (payload: string) => {
  return crypto.createHmac('sha256', config.receiptSigningSecret)
    .update(payload)
    .digest('base64url');
};

export const verifyReceipt = (payload: string, signature: string) => {
  const expected = signReceipt(payload);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};
