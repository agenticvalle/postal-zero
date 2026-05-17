import { createWorker } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { signReceipt } from '../lib/receipt.js';

const processReceiptGeneration = async (job: any) => {
  logger.info({ jobId: job.id, payload: job.data }, 'Generating receipt signature');

  const payload = JSON.stringify({
    mailId: job.data.mailId,
    deliveryToken: job.data.deliveryToken,
    recipientHandle: job.data.recipientHandle,
    generatedAt: new Date().toISOString()
  });

  const receiptSig = signReceipt(payload);

  logger.info({ mailId: job.data.mailId, receiptSig }, 'Receipt generated');

  return { receiptSig };
};

createWorker('receipt-generation', processReceiptGeneration, {
  concurrency: 2,
  lockDuration: 15000,
  autorun: true
});
