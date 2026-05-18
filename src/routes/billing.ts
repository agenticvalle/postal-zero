import { Router, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import Stripe from "stripe"
import { PLANS, STRIPE_PRICES } from "../lib/plans"
const prisma = new PrismaClient()
export const billingRouter = Router()
const SECRET = process.env.JWT_SECRET || "dev-secret"
const WEB = process.env.WEB_URL || "http://localhost:3000"
const uid = (req:any) => { try { return (jwt.verify(req.headers.authorization?.replace("Bearer ",""),SECRET) as any).sub } catch { return null } }
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY||"", {apiVersion:"2024-06-20"})

billingRouter.get("/status", async (req:Request,res:Response) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const user = await prisma.user.findUnique({where:{id:userId},select:{plan:true,messagesThisMonth:true,usagePeriodStart:true}})
  if(!user) return res.status(404).json({error:"Not found"})
  return res.json({plan:user.plan,limits:PLANS[user.plan]||PLANS.FREE,usage:{messagesThisMonth:user.messagesThisMonth,periodStart:user.usagePeriodStart}})
})

billingRouter.post("/checkout", async (req:Request,res:Response) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const {plan} = req.body
  const priceId = STRIPE_PRICES[plan]
  if(!priceId) return res.status(400).json({error:"Invalid plan or Stripe not configured"})
  const user = await prisma.user.findUnique({where:{id:userId}})
  if(!user) return res.status(404).json({error:"Not found"})
  const stripe = getStripe()
  let customerId = user.stripeCustomerId
  if(!customerId) {
    const c = await stripe.customers.create({email:user.email,name:user.displayName,metadata:{userId:user.id,handle:user.handle}})
    customerId = c.id
    await prisma.user.update({where:{id:userId},data:{stripeCustomerId:customerId}})
  }
  const session = await stripe.checkout.sessions.create({customer:customerId,mode:"subscription",line_items:[{price:priceId,quantity:1}],success_url:`${WEB}/dashboard?upgraded=true`,cancel_url:`${WEB}/pricing`,metadata:{userId,plan}})
  return res.json({url:session.url})
})

billingRouter.post("/portal", async (req:Request,res:Response) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const user = await prisma.user.findUnique({where:{id:userId},select:{stripeCustomerId:true}})
  if(!user?.stripeCustomerId) return res.status(400).json({error:"No active subscription"})
  const portal = await getStripe().billingPortal.sessions.create({customer:user.stripeCustomerId,return_url:`${WEB}/dashboard`})
  return res.json({url:portal.url})
})

export async function stripeWebhookHandler(req:Request,res:Response) {
  const sig = req.headers["stripe-signature"] as string
  let event:Stripe.Event
  try { event = getStripe().webhooks.constructEvent(req.body,sig,process.env.STRIPE_WEBHOOK_SECRET||"") }
  catch(e:any) { return res.status(400).json({error:`Webhook error: ${e.message}`}) }
  if(event.type==="checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session
    if(s.metadata?.userId&&s.metadata?.plan) await prisma.user.update({where:{id:s.metadata.userId},data:{plan:s.metadata.plan,stripeSubId:s.subscription as string}})
  }
  if(event.type==="customer.subscription.deleted") {
    const s = event.data.object as Stripe.Subscription
    await prisma.user.updateMany({where:{stripeSubId:s.id},data:{plan:"FREE",stripeSubId:null}})
  }
  return res.json({received:true})
}