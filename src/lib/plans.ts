export const PLANS: Record<string,any> = {
  FREE:     {messages:100,   keys:3,  agents:1,   webhooks:0,  webhookEnabled:false, aiTriage:false, price:0 },
  STARTER:  {messages:2000,  keys:10, agents:5,   webhooks:5,  webhookEnabled:true,  aiTriage:false, price:9 },
  PRO:      {messages:20000, keys:-1, agents:25,  webhooks:-1, webhookEnabled:true,  aiTriage:true,  price:5},
  BUSINESS: {messages:200000,keys:-1, agents:100, webhooks:-1, webhookEnabled:true,  aiTriage:true,  price:99},
  ENTERPRISE:{messages:-1,  keys:-1, agents:-1,  webhooks:-1, webhookEnabled:true,  aiTriage:true,  price:0 },
}
export const STRIPE_PRICES: Record<string,string> = {
  STARTER:  process.env.STRIPE_PRICE_STARTER  || '',
  PRO:      process.env.STRIPE_PRICE_PRO      || '',
  BUSINESS: process.env.STRIPE_PRICE_BUSINESS || '',
}
// Stored plan values are canonically uppercase, but older rows may differ in
// case ("pro"). Normalize on every lookup; unknown values fail closed to FREE.
export function normalizePlan(plan: unknown): string {
  const key = typeof plan === "string" ? plan.trim().toUpperCase() : ""
  return Object.prototype.hasOwnProperty.call(PLANS, key) ? key : "FREE"
}
export function planLimits(plan: unknown) {
  return PLANS[normalizePlan(plan)]
}
export function canSend(plan:string, used:number): true|string {
  const p = planLimits(plan)
  if(p.messages===-1) return true
  if(used>=p.messages) return `Limit of ${p.messages} messages reached. Upgrade at /pricing.`
  return true
}
export function canAddCredential(plan:string, count:number): true|string {
  const p = planLimits(plan)
  if(p.keys===-1) return true
  if(count>=p.keys) return `API credential limit of ${p.keys} reached. Upgrade at /pricing.`
  return true
}

export function canAddKey(plan:string, count:number): true|string {
  const p = planLimits(plan)
  if(p.keys===-1) return true
  if(count>=p.keys) return `Key limit of ${p.keys} reached. Upgrade at /pricing.`
  return true
}
export function canAddWebhook(plan:string, count:number): true|string {
  const p = planLimits(plan)
  if(!p.webhookEnabled) return 'Webhooks require Starter plan. Upgrade at /pricing.'
  if(p.webhooks!==-1 && count>=p.webhooks) return `Webhook limit of ${p.webhooks} reached. Upgrade at /pricing.`
  return true
}

export function canAddAgent(plan:string, count:number): true|string {
  const p = planLimits(plan)
  if(p.agents===-1) return true
  if(count>=p.agents) return `Agent limit of ${p.agents} reached. Upgrade at /pricing.`
  return true
}
