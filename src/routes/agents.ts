import { Router } from "express"
import { createHash, randomBytes } from "crypto"
import jwt from "jsonwebtoken"
import { Prisma, PrismaClient } from "@prisma/client"
import { isReservedHandle, isValidHandle, normalizeHandle } from "../lib/handles"
import { canAddAgent, canAddCredential } from "../lib/plans"

const prisma = new PrismaClient()
export const agentsRouter = Router()

const SECRET = process.env.JWT_SECRET
if (!SECRET) throw new Error("JWT_SECRET environment variable is not set")

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex")

function ownerId(req: any): string | null {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token) return null
    return (jwt.verify(token, SECRET) as any).sub || null
  } catch {
    return null
  }
}

agentsRouter.post("/", async (req, res) => {
  const userId = ownerId(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  const handle = normalizeHandle(req.body.handle)
  const displayName = typeof req.body.displayName === "string"
    ? req.body.displayName.trim()
    : ""

  if (!isValidHandle(handle))
    return res.status(400).json({ error: "Handle must be 3-32 lowercase letters, numbers, _ or -" })

  if (isReservedHandle(handle))
    return res.status(400).json({ error: "Handle is reserved" })

  if (!displayName)
    return res.status(400).json({ error: "displayName required" })

  try {
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true }
    })
    if (!owner) return res.status(404).json({ error: "Owner not found" })

    const agentCount = await prisma.agent.count({ where: { ownerId: userId } })
    const agentCheck = canAddAgent(owner.plan, agentCount)
    if (agentCheck !== true)
      return res.status(402).json({ error: agentCheck, upgradeUrl: "/pricing" })

    const [legacyUser, existingAddress] = await Promise.all([
      prisma.user.findUnique({ where: { handle }, select: { id: true } }),
      prisma.address.findUnique({ where: { handle }, select: { id: true } })
    ])

    if (legacyUser || existingAddress)
      return res.status(409).json({ error: "Handle taken" })

    const agent = await prisma.$transaction(async (tx) => {
      const created = await tx.agent.create({
        data: {
          ownerId: userId,
          displayName
        }
      })

      const address = await tx.address.create({
        data: {
          handle,
          agentId: created.id
        },
        select: {
          id: true,
          handle: true
        }
      })

      return { created, address }
    })

    return res.status(201).json({
      agent: {
        id: agent.created.id,
        addressId: agent.address.id,
        handle: agent.address.handle,
        address: `${agent.address.handle}@postal.zero`,
        displayName: agent.created.displayName,
        status: agent.created.status,
        createdAt: agent.created.createdAt
      }
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return res.status(409).json({ error: "Handle taken" })

    console.error("Agent creation failed", e)
    return res.status(500).json({ error: "Agent creation failed" })
  }
})

agentsRouter.get("/", async (req, res) => {
  const userId = ownerId(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  try {
    const agents = await prisma.agent.findMany({
      where: { ownerId: userId },
      include: {
        address: {
          select: { id: true, handle: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return res.json({
      agents: agents.map(agent => ({
        id: agent.id,
        addressId: agent.address?.id || null,
        handle: agent.address?.handle || null,
        address: agent.address ? `${agent.address.handle}@postal.zero` : null,
        displayName: agent.displayName,
        status: agent.status,
        createdAt: agent.createdAt
      }))
    })
  } catch {
    return res.status(500).json({ error: "Failed to load agents" })
  }
})

agentsRouter.post("/:id/tokens", async (req, res) => {
  const userId = ownerId(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  const label = typeof req.body.label === "string" && req.body.label.trim()
    ? req.body.label.trim()
    : "default"

  if (label.length > 64)
    return res.status(400).json({ error: "Token label must be 64 characters or fewer" })

  try {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        ownerId: userId
      },
      select: {
        id: true,
        status: true,
        owner: {
          select: {
            plan: true
          }
        },
        address: {
          select: {
            handle: true
          }
        }
      }
    })

    if (!agent)
      return res.status(404).json({ error: "Agent not found" })

    if (agent.status === "SUSPENDED")
      return res.status(403).json({ error: "Suspended agents cannot create tokens" })

    const [keyCount, agentTokenCount] = await Promise.all([
      prisma.key.count({ where: { userId } }),
      prisma.agentToken.count({ where: { agent: { ownerId: userId } } })
    ])

    const credentialCheck = canAddCredential(
      agent.owner.plan,
      keyCount + agentTokenCount
    )

    if (credentialCheck !== true)
      return res.status(402).json({ error: credentialCheck, upgradeUrl: "/pricing" })

    const raw = `pz_agent_${randomBytes(32).toString("hex")}`

    const token = await prisma.agentToken.create({
      data: {
        agentId: agent.id,
        label,
        tokenHash: sha256(raw),
        scopes: ["send"]
      },
      select: {
        id: true,
        label: true,
        scopes: true,
        createdAt: true
      }
    })

    return res.status(201).json({
      token: {
        id: token.id,
        agentId: agent.id,
        handle: agent.address?.handle || null,
        label: token.label,
        scopes: token.scopes,
        value: raw,
        createdAt: token.createdAt
      },
      note: "Store this token securely — shown only once.",
      header: `X-Agent-Token: ${raw}`
    })
  } catch (e) {
    console.error("Agent token creation failed", e)
    return res.status(500).json({ error: "Agent token creation failed" })
  }
})

agentsRouter.get("/:id/tokens", async (req, res) => {
  const userId = ownerId(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  try {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        ownerId: userId
      },
      select: { id: true }
    })

    if (!agent)
      return res.status(404).json({ error: "Agent not found" })

    const tokens = await prisma.agentToken.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        scopes: true,
        deliveries: true,
        lastUsed: true,
        createdAt: true
      }
    })

    return res.json({ tokens })
  } catch {
    return res.status(500).json({ error: "Failed to load agent tokens" })
  }
})

agentsRouter.delete("/:id/tokens/:tokenId", async (req, res) => {
  const userId = ownerId(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  try {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        ownerId: userId
      },
      select: { id: true }
    })

    if (!agent)
      return res.status(404).json({ error: "Agent not found" })

    const result = await prisma.agentToken.deleteMany({
      where: {
        id: req.params.tokenId,
        agentId: agent.id
      }
    })

    if (result.count === 0)
      return res.status(404).json({ error: "Token not found" })

    return res.json({ revoked: true })
  } catch {
    return res.status(500).json({ error: "Failed to revoke agent token" })
  }
})

agentsRouter.get("/:id/mail", async (req, res) => {
  const userId = ownerId(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  try {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        ownerId: userId
      },
      include: {
        address: {
          select: {
            id: true,
            handle: true
          }
        }
      }
    })

    if (!agent || !agent.address)
      return res.status(404).json({ error: "Agent not found" })

    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1),
      100
    )
    const skip = (page - 1) * limit

    const where = {
      userId,
      recipientAddressId: agent.address.id,
      isTrashed: false,
      isArchived: false
    }

    const [mail, total] = await Promise.all([
      prisma.mail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          subject: true,
          senderName: true,
          senderHandle: true,
          senderVerified: true,
          bodyPreview: true,
          payload: true,
          mailType: true,
          isRead: true,
          isStarred: true,
          aiSummary: true,
          aiUrgency: true,
          deliveredAt: true
        }
      }),
      prisma.mail.count({ where })
    ])

    return res.json({
      agent: {
        id: agent.id,
        handle: agent.address.handle,
        address: `${agent.address.handle}@postal.zero`,
        displayName: agent.displayName,
        status: agent.status
      },
      mail,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch {
    return res.status(500).json({ error: "Failed to load agent mail" })
  }
})

agentsRouter.get("/:id/mail/:mailId", async (req, res) => {
  const userId = ownerId(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  try {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        ownerId: userId
      },
      include: {
        address: {
          select: {
            id: true,
            handle: true
          }
        }
      }
    })

    if (!agent || !agent.address)
      return res.status(404).json({ error: "Agent not found" })

    const mail = await prisma.mail.findFirst({
      where: {
        id: req.params.mailId,
        userId,
        recipientAddressId: agent.address.id
      },
      select: {
        id: true,
        subject: true,
        body: true,
        senderName: true,
        senderHandle: true,
        senderVerified: true,
        mailType: true,
        isRead: true,
        isStarred: true,
        aiSummary: true,
        aiUrgency: true,
        deliveredAt: true,
        deliveryToken: true,
        payload: true
      }
    })

    if (!mail)
      return res.status(404).json({ error: "Mail not found" })

    if (!mail.isRead) {
      await prisma.mail.update({
        where: { id: mail.id },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })
    }

    return res.json({
      ...mail,
      isRead: true,
      recipient: {
        agentId: agent.id,
        handle: agent.address.handle,
        address: `${agent.address.handle}@postal.zero`
      }
    })
  } catch {
    return res.status(500).json({ error: "Failed to load agent mail" })
  }
})

agentsRouter.patch("/:id/mail/batch", async (req, res) => {
  const userId = ownerId(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  const { ids, action } = req.body

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100)
    return res.status(400).json({ error: "ids must contain 1-100 message IDs" })

  if (!ids.every((id: unknown) => typeof id === "string"))
    return res.status(400).json({ error: "Invalid message IDs" })

  const actions: Record<string, any> = {
    read: { isRead: true, readAt: new Date() },
    unread: { isRead: false, readAt: null },
    star: { isStarred: true },
    unstar: { isStarred: false },
    archive: { isArchived: true },
    trash: { isTrashed: true },
    restore: { isTrashed: false, isArchived: false }
  }

  const data = actions[action]
  if (!data) return res.status(400).json({ error: "Invalid action" })

  try {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        ownerId: userId
      },
      include: {
        address: {
          select: { id: true }
        }
      }
    })

    if (!agent || !agent.address)
      return res.status(404).json({ error: "Agent not found" })

    const result = await prisma.mail.updateMany({
      where: {
        id: { in: ids },
        userId,
        recipientAddressId: agent.address.id
      },
      data
    })

    return res.json({ updated: result.count })
  } catch {
    return res.status(500).json({ error: "Failed to update agent mail" })
  }
})
