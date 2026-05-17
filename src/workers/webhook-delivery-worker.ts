import { createWorker } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { signWebhookPayload } from '../lib/webhook.js';

const processWebhookDelivery = async (job: any) => {
  const { mailId, webhookUrl, payload, deliveryToken } = job.data;
  logger.info({ jobId: job.id, mailId, webhookUrl }, 'Delivering webhook');

  const body = JSON.stringify({
    mailId,
    deliveryToken,
    payload,
    deliveredAt: new Date().toISOString()
  });

  const signature = signWebhookPayload(body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-postal-zero-signature': signature
    },
    body,
    redirect: 'follow',
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const text = await response.text().catch(() => 'no body');
    logger.warn({ status: response.status, body: text }, 'Webhook delivery failed');
    throw new Error(`Webhook delivery failed: ${response.status}`);
  }

  logger.info({ mailId, webhookUrl }, 'Webhook delivered successfully');
  return { status: 'ok', deliveredAt: new Date().toISOString() };
};

createWorker('webhook-delivery', processWebhookDelivery, {
  concurrency: 3,
  lockDuration: 30000,
  autorun: true
});
