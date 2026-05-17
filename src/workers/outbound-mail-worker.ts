import { createWorker } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { receiptGenerationQueue, webhookDeliveryQueue } from '../queues/index.js';

const processOutboundMail = async (job: any) => {
  logger.info({ jobId: job.id, payload: job.data }, 'Processing outbound mail');

  const message = job.data;

  if (message.webhookUrl) {
    await webhookDeliveryQueue.add('deliver-webhook', {
      mailId: message.id,
      webhookUrl: message.webhookUrl,
      payload: message.payload,
      deliveryToken: message.deliveryToken
    }, {
      jobId: `webhook-${message.id}`,
      attempts: 10,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: { count: 1000 }
    });
  }

  await receiptGenerationQueue.add('generate-receipt', {
    mailId: message.id,
    deliveryToken: message.deliveryToken,
    recipientHandle: message.recipientHandle
  }, {
    jobId: `receipt-${message.id}`,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: { count: 1000 }
  });

  return { status: 'queued' };
};

createWorker('outbound-mail', processOutboundMail, {
  concurrency: 5,
  lockDuration: 20000,
  autorun: true
});
