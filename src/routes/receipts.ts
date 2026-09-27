import { Router } from "express"
import { createHmac } from "crypto"
import { PrismaClient } from "@prisma/client"
import { getJwtSecret } from "../lib/auth"
const prisma = new PrismaClient()
export const receiptsRouter = Router()

export function formatReceiptFrom(mail: { senderName: string; senderEmail: string; senderHandle?: string | null }): string {
  const senderAddress = mail.senderHandle ? `${mail.senderHandle}@postal.zero` : mail.senderEmail
  return `${mail.senderName} <${senderAddress}>`
}

receiptsRouter.get("/:token", async (req,res) => {
  const mail = await prisma.mail.findUnique({
    where:{deliveryToken:req.params.token},
    include:{
      user:{select:{handle:true}},
      recipientAddress:{select:{handle:true}}
    }
  })
  if(!mail) return res.status(404).json({error:"Receipt not found"})
  const recipientHandle = mail.recipientAddress?.handle || mail.user.handle
  const secret = getJwtSecret()
  const verifyHash = createHmac("sha256",secret).update(`${mail.id}:${mail.deliveredAt.toISOString()}:${recipientHandle}`).digest("hex")
  return res.json({verified:true,mailId:mail.id,subject:mail.subject,from:formatReceiptFrom(mail),to:`${recipientHandle}@postal.zero`,senderVerified:mail.senderVerified,mailType:mail.mailType,deliveredAt:mail.deliveredAt,readAt:mail.readAt||null,status:mail.readAt?"READ":"DELIVERED",receiptSig:mail.receiptSig,verifyHash})
})