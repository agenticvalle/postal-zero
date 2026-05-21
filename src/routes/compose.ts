import { Router } from "express"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { createHmac } from "crypto"

const prisma = new PrismaClient()
export const composeRouter = Router()
const SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod"

composeRouter.post("/:handle", async (req, res) => {
  try {
    const tok = req.headers.authorization?.replace("Bearer ", "")
    if (!tok) return res.status(401).json({ error: "Unauthorized" })
    const p = jwt.verify(tok, SECRET) as any
    const sender = await prisma.user.findUnique({ where: { id: p.sub } })
    if (!sender) return res.status(401).json({ error: "Sender not found" })
    const { subject, body } = req.body
    if (!subject || !body) return res.status(400).json({ error: "subject and body required" })
    const recipient = await prisma.user.findUnique({
      where: { handle: req.params.handle.toLowerCase() },
      include: { mailbox: { include: { folders: { where: { slug: "inbox" } } } } }
    })
    if (!recipient?.mailbox) return res.status(404).json({ error: "Recipient not found" })
    const inbox = recipient.mailbox.folders[0]
    if (!inbox) return res.status(500).json({ error: "Inbox missing" })
    const sig = createHmac("sha256", SECRET).update(`${recipient.mailbox.id}:${sender.email}:${Date.now()}`).digest("hex")
    const mail = await prisma.$transaction(async (tx: any) => {
      const m = await tx.mail.create({
        data: {
          userId: recipient.id,
          senderName: sender.displayName,
          senderEmail: sender.email,
          senderHandle: sender.handle,
          senderVerified: true,
          senderIp: req.ip ?? null,
          subject, body, bodyPreview: body.slice(0, 200),
          mailType: "PERSONAL", receiptSig: sig,
          folders: { create: { folderId: inbox.id } }
        }
      })
      await tx.deliveryReceipt.create({ data: { mailId: m.id, event: "DELIVERED", ipAddress: req.ip ?? null, signature: sig } })
      return m
    })
    return res.status(201).json({ ok: true, messageId: mail.id, deliveryToken: mail.deliveryToken, deliveredAt: mail.deliveredAt })
  } catch (e: any) { return res.status(500).json({ error: e.message }) }
})
