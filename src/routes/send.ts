import { Router } from "express"
import { createHash, createHmac, randomInt } from "crypto"
import { createTransport } from "nodemailer"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { resolveKey } from "./keys"
import { canSend } from "../lib/plans"
import { resolveRecipient } from "../lib/recipient"
const prisma = new PrismaClient()
export const sendRouter = Router()
const SECRET = process.env.JWT_SECRET || "dev-secret"
const mailer = createTransport({host:process.env.SMTP_HOST||"localhost",port:parseInt(process.env.SMTP_PORT||"1025"),secure:false})
const otps = new Map<string,{code:string,exp:number,tries:number}>()
const sha256 = (value:string) => createHash("sha256").update(value).digest("hex")

async function deliver(handle:string,senderName:string,senderEmail:string,subject:string,body:string,mailType:string,payload:any,ip:string|null,verified:boolean,custodyUserId:string,recipientAddressId:string,senderUserId:string|null,senderHandle:string|null=null,confirmationEmail:string|null=senderEmail,agentTokenId:string|null=null) {
  const sig = createHmac("sha256",SECRET).update(`${custodyUserId}:${senderEmail}:${Date.now()}`).digest("hex")
  const mail = await prisma.$transaction(async(tx:any)=>{
    const m = await tx.mail.create({data:{userId:custodyUserId,recipientAddressId,senderName,senderEmail,senderHandle,senderVerified:verified,senderIp:ip,subject,body,bodyPreview:body.slice(0,200),payload:payload||undefined,mailType,receiptSig:sig}})
    await tx.deliveryReceipt.create({data:{mailId:m.id,event:"DELIVERED",ipAddress:ip,signature:sig}})
    if(senderUserId) await tx.user.update({where:{id:senderUserId},data:{messagesThisMonth:{increment:1}}})
    if(agentTokenId) await tx.agentToken.update({where:{id:agentTokenId},data:{lastUsed:new Date(),deliveries:{increment:1}}})
    return m
  })
  if(confirmationEmail) mailer.sendMail({from:'"Postal Zero" <noreply@postal.zero>',to:confirmationEmail,subject:`Delivered: ${subject}`,text:`Your message was delivered to ${handle}@postal.zero`}).catch(()=>{})
  return mail
}

sendRouter.get("/:handle", async (req,res) => {
  const recipient = await resolveRecipient(req.params.handle.toLowerCase())
  if(!recipient) return res.status(404).json({error:"Address not found"})
  return res.json({handle:recipient.handle,displayName:recipient.displayName,address:`${recipient.handle}@postal.zero`})
})

sendRouter.post("/:handle", async (req,res) => {
  try {
    const handle = req.params.handle.toLowerCase()
    const agentToken = req.headers["x-agent-token"] as string
    const agentKey = req.headers["x-agent-key"] as string
    const authHeader = req.headers.authorization

    if(agentToken) {
      const token = await prisma.agentToken.findUnique({
        where:{tokenHash:sha256(agentToken)},
        include:{
          agent:{
            select:{
              id:true,
              displayName:true,
              status:true,
              owner:{
                select:{
                  id:true,
                  plan:true,
                  messagesThisMonth:true
                }
              },
              address:{
                select:{
                  id:true,
                  handle:true
                }
              }
            }
          }
        }
      })

      if(!token || !token.scopes.includes("send"))
        return res.status(401).json({error:"Invalid agent token"})

      const agent = token.agent

      if(agent.status === "SUSPENDED")
        return res.status(403).json({error:"Agent suspended"})

      if(!agent.address)
        return res.status(409).json({error:"Agent has no address"})

      const check = canSend(agent.owner.plan,agent.owner.messagesThisMonth)
      if(check!==true)
        return res.status(402).json({error:check,upgradeUrl:"/pricing"})

      const recipient = await resolveRecipient(handle)
      if(!recipient) return res.status(404).json({error:"Recipient not found"})

      const {subject,body,payload} = req.body
      if(!subject||!body)
        return res.status(400).json({error:"subject,body required"})

      const senderEmail = `${agent.address.handle}@postal.zero`
      const senderName = agent.displayName || agent.address.handle

      const mail = await deliver(
        handle,
        senderName,
        senderEmail,
        subject,
        body,
        "AGENT",
        payload,
        req.ip||null,
        agent.status === "VERIFIED",
        recipient.custodyUserId,
        recipient.addressId,
        agent.owner.id,
        agent.address.handle,
        null,
        token.id
      )

      return res.status(201).json({
        ok:true,
        sender:{
          type:"AGENT",
          id:agent.id,
          handle:agent.address.handle,
          address:senderEmail,
          status:agent.status
        },
        messageId:mail.id,
        deliveryToken:mail.deliveryToken,
        deliveredAt:mail.deliveredAt
      })
    }

    if(agentKey) {
      const key = await resolveKey(agentKey)
      if(!key) return res.status(401).json({error:"Invalid agent key"})
      const sender = await prisma.user.findUnique({
        where:{id:key.userId},
        select:{id:true,handle:true,displayName:true,email:true,plan:true,messagesThisMonth:true}
      })
      if(!sender) return res.status(404).json({error:"Sender not found"})
      const check = canSend(sender.plan,sender.messagesThisMonth)
      if(check!==true) return res.status(402).json({error:check,upgradeUrl:"/pricing"})
      const recipient = await resolveRecipient(handle)
      if(!recipient) return res.status(404).json({error:"Recipient not found"})
      const {subject,body,mailType="AGENT",payload} = req.body
      if(!subject||!body) return res.status(400).json({error:"subject,body required"})
      const mail = await deliver(handle,sender.displayName,sender.email,subject,body,mailType,payload,req.ip||null,true,recipient.custodyUserId,recipient.addressId,sender.id,sender.handle)
      return res.status(201).json({ok:true,messageId:mail.id,deliveryToken:mail.deliveryToken,deliveredAt:mail.deliveredAt})
    }

    if(authHeader) {
      try {
        const p = jwt.verify(authHeader.replace("Bearer ",""),SECRET) as any
        const sender = await prisma.user.findUnique({
          where:{id:p.sub},
          select:{id:true,handle:true,displayName:true,email:true,plan:true,messagesThisMonth:true}
        })
        if(!sender) return res.status(401).json({error:"Sender not found"})
        const check = canSend(sender.plan,sender.messagesThisMonth)
        if(check!==true) return res.status(402).json({error:check,upgradeUrl:"/pricing"})
        const recipient = await resolveRecipient(handle)
        if(!recipient) return res.status(404).json({error:"Recipient not found"})
        const {subject,body,mailType="PERSONAL",payload} = req.body
        if(!subject||!body) return res.status(400).json({error:"subject,body required"})
        const mail = await deliver(handle,sender.displayName,sender.email,subject,body,mailType,payload,req.ip||null,true,recipient.custodyUserId,recipient.addressId,sender.id,sender.handle)
        return res.status(201).json({ok:true,messageId:mail.id,deliveryToken:mail.deliveryToken,deliveredAt:mail.deliveredAt})
      } catch { return res.status(401).json({error:"Invalid token"}) }
    }

    const {sendToken,senderName,subject,body,mailType="PERSONAL",payload} = req.body
    if(!sendToken) return res.status(400).json({error:"Provide X-Agent-Token, X-Agent-Key, Bearer token, or sendToken"})
    const tok = await prisma.sendToken.findUnique({where:{token:sendToken}})
    if(!tok||!tok.verified||tok.usedAt||tok.expiresAt<new Date()) return res.status(401).json({error:"Invalid or expired token"})
    if(tok.recipientHandle!==handle) return res.status(401).json({error:"Token mismatch"})
    const recipient = await resolveRecipient(handle)
    if(!recipient) return res.status(404).json({error:"Recipient not found"})
    const mail = await deliver(handle,senderName,tok.senderEmail,subject,body,mailType,payload,req.ip||null,false,recipient.custodyUserId,recipient.addressId,null)
    await prisma.sendToken.update({where:{id:tok.id},data:{usedAt:new Date()}})
    return res.status(201).json({ok:true,messageId:mail.id,deliveryToken:mail.deliveryToken,deliveredAt:mail.deliveredAt})
  } catch(e:any){return res.status(500).json({error:e.message})}
})

sendRouter.post("/:handle/verify", async (req,res) => {
  const {senderEmail} = req.body
  if(!senderEmail) return res.status(400).json({error:"senderEmail required"})
  const r = await resolveRecipient(req.params.handle.toLowerCase())
  if(!r) return res.status(404).json({error:"Not found"})
  const code = String(randomInt(100000,999999))
  otps.set(`${senderEmail}:${r.handle}`,{code,exp:Date.now()+600000,tries:0})
  await mailer.sendMail({from:'"Postal Zero" <noreply@postal.zero>',to:senderEmail,subject:`Code: ${code}`,html:`<div style="font-family:monospace;padding:24px"><p>Code for <b>${r.handle}@postal.zero</b>:</p><div style="font-size:36px;font-weight:700;letter-spacing:.2em;background:#f4f4f4;padding:16px;text-align:center">${code}</div></div>`}).catch(()=>{})
  console.log(`[OTP] ${senderEmail} -> ${r.handle}: ${code}`)
  return res.json({ok:true,expiresIn:600})
})

sendRouter.post("/:handle/confirm", async (req,res) => {
  const {senderEmail,code} = req.body
  if(!senderEmail||!code) return res.status(400).json({error:"senderEmail and code required"})
  const key = `${senderEmail}:${req.params.handle}`
  const stored = otps.get(key)
  if(!stored||Date.now()>stored.exp) { otps.delete(key); return res.status(400).json({error:"Code expired"}) }
  if(stored.tries>=5) { otps.delete(key); return res.status(429).json({error:"Too many attempts"}) }
  if(stored.code!==code) { stored.tries++; return res.status(400).json({error:"Invalid code"}) }
  otps.delete(key)
  const tok = await prisma.sendToken.create({data:{senderEmail,recipientHandle:req.params.handle.toLowerCase(),verified:true,verifiedAt:new Date(),expiresAt:new Date(Date.now()+1800000)}})
  return res.json({sendToken:tok.token,expiresIn:1800})
})