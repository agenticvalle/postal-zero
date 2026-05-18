export const PLANS: Record<string,any> = {
  FREE:     {messages:100,   keys:3,  webhooks:0,  webhookEnabled:false, aiTriage:false, price:0 },
  STARTER:  {messages:2000,  keys:10, webhooks:5,  webhookEnabled:true,  aiTriage:false, price:9 },
  PRO:      {messages:20000, keys:-1, webhooks:-1, webhookEnabled:true,  aiTriage:true,  price:29},
  BUSINESS: {messages:200000,keys:-1, webhooks:-1, webhookEnabled:true,  aiTriage:true,  price:99},
  ENTERPRISE:{messages:-1,  keys:-1, webhooks:-1, webhookEnabled:true,  aiTriage:true,  price:0 },
}
export const STRIPE_PRICES: Record<string,string> = {
  STARTER:  process.env.STRIPE_PRICE_STARTER  || '',
  PRO:      process.env.STRIPE_PRICE_PRO      || '',
  BUSINESS: process.env.STRIPE_PRICE_BUSINESS || '',
}
export function canSend(plan:string, used:number): true|string {
  const p = PLANS[plan]||PLANS.FREE
  if(p.messages===-1) return true
  if(used>=p.messages) return `Limit of ${p.messages} messages reached. Upgrade at /pricing.`
  return true
}
export function canAddKey(plan:string, count:number): true|string {
  const p = PLANS[plan]||PLANS.FREE
  if(p.keys===-1) return true
  if(count>=p.keys) return `Key limit of ${p.keys} reached. Upgrade at /pricing.`
  return true
}
export function canAddWebhook(plan:string, count:number): true|string {
  const p = PLANS[plan]||PLANS.FREE
  if(!p.webhookEnabled) return 'Webhooks require Starter plan. Upgrade at /pricing.'
  if(p.webhooks!==-1 && count>=p.webhooks) return `Webhook limit of ${p.webhooks} reached. Upgrade at /pricing.`
  return true
}