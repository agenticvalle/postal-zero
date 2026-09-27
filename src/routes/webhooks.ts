import { Router } from "express"
import { randomBytes } from "crypto"
import { PrismaClient } from "@prisma/client"
import { canAddWebhook } from "../lib/plans"
import { verifyAccess } from "../lib/auth"
const prisma = new PrismaClient()
export const webhooksRouter = Router()
const uid = (req:any) => {
  if (req.userId) return req.userId
  try {
    const token = req.headers.authorization?.replace("Bearer ","")
    if (!token) return null
    return verifyAccess(token)
  } catch {
    return null
  }
}

webhooksRouter.post("/", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const {url,events=["mail.received"]} = req.body
  if(!url||!url.startsWith("http")) return res.status(400).json({error:"Valid url required"})
  const user = await prisma.user.findUnique({where:{id:userId},select:{plan:true}})
  if(!user) return res.status(404).json({error:"Not found"})
  const count = await prisma.webhook.count({where:{userId}})
  const check = canAddWebhook(user.plan,count)
  if(check!==true) return res.status(402).json({error:check,upgradeUrl:"/pricing"})
  const secret = randomBytes(24).toString("hex")
  const hook = await prisma.webhook.create({data:{userId,url,secret,events}})
  return res.status(201).json({id:hook.id,url,events,secret,note:"Verify with X-Postal-Signature header."})
})

webhooksRouter.get("/", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const hooks = await prisma.webhook.findMany({where:{userId},select:{id:true,url:true,events:true,active:true,deliveryCount:true,failureCount:true,lastStatus:true,lastFiredAt:true,createdAt:true}})
  return res.json({webhooks:hooks})
})

webhooksRouter.delete("/:id", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  await prisma.webhook.deleteMany({where:{id:req.params.id,userId}})
  return res.json({deleted:true})
})