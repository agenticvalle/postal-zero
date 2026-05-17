import { createQueue } from '../lib/queue.js';

export const outboundMailQueue = createQueue('outbound-mail');
export const webhookDeliveryQueue = createQueue('webhook-delivery');
export const receiptGenerationQueue = createQueue('receipt-generation');
