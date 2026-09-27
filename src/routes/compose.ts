import { Router } from "express"
import { PrismaClient } from "@prisma/client"
import { createHmac } from "crypto"
import { resolveRecipient } from "../lib/recipient"
import { verifyAccess, getJwtSecret } from "../lib/auth"

const prisma = new PrismaClient()
export const composeRouter = Router()

composeRouter.post("/:handle", async (req, res) => {
  try {
    let senderId = (req as any).userId
    if (!senderId) {
      const tok = req.headers.authorization?.replace("Bearer ", "")
      if (!tok) return res.status(401).json({ error: "Unauthorized" })
      try {
        senderId = verifyAccess(tok)
      } catch {
        return res.status(401).json({ error: "Unauthorized" })
      }
    }
    const sender = await prisma.user.findUnique({ where: { id: senderId } })
    if (!sender) return res.status(401).json({ error: "Sender not found" })
    const { subject, body, payload } = req.body
    if (!subject || !body) return res.status(400).json({ error: "subject and body required" })

    if (payload?.sealed === true) {
      const required = ["version", "algorithm", "salt", "nonce", "ciphertext", "contentHash"]
      for (const key of required) {
        if (typeof payload[key] !== "string" || payload[key].length === 0) {
          return res.status(400).json({ error: `sealed payload missing ${key}` })
        }
      }
      if (payload.version !== "pz-sealed-v1") return res.status(400).json({ error: "unsupported sealed payload version" })
      if (payload.algorithm !== "AES-GCM") return res.status(400).json({ error: "unsupported sealed payload algorithm" })
    }
    const recipient = await resolveRecipient(req.params.handle.toLowerCase())
    if (!recipient) return res.status(404).json({ error: "Recipient not found" })
    const senderEmail = `${sender.handle}@postal.zero`
    const sig = createHmac("sha256", getJwtSecret()).update(`${recipient.addressId}:${senderEmail}:${Date.now()}`).digest("hex")
    const mail = await prisma.$transaction(async (tx: any) => {
      const m = await tx.mail.create({
        data: {
          userId: recipient.custodyUserId,
          recipientAddressId: recipient.addressId,
          senderName: sender.displayName,
          senderEmail,
          senderHandle: sender.handle,
          senderVerified: true,
          senderIp: req.ip ?? null,
          subject, body, bodyPreview: body.slice(0, 200),
          payload: payload ?? undefined,
          mailType: "PERSONAL", receiptSig: sig
        }
      })
      await tx.deliveryReceipt.create({ data: { mailId: m.id, event: "DELIVERED", ipAddress: req.ip ?? null, signature: sig } })
      return m
    })
    return res.status(201).json({ ok: true, messageId: mail.id, deliveryToken: mail.deliveryToken, deliveredAt: mail.deliveredAt })
  } catch (e: any) { return res.status(500).json({ error: e.message }) }
})
