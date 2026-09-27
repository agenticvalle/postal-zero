import { Router, type Request, type Response, type NextFunction } from "express"
import { createHash } from "crypto"
import type { PrismaClient } from "@prisma/client"

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")

// Scope that a token must carry explicitly to read an agent's mail. Send-only
// tokens (scopes: ["send"]) do not have it and are rejected.
export const RECEIVE_SCOPE = "receive"

export interface AgentContext {
  id: string
  status: string
  ownerId: string
  address: { id: string; handle: string } | null
}
export interface AgentTokenRecord {
  scopes: string[]
  agent: AgentContext
}
export interface MailRecord {
  id: string
  recipientAddressId: string | null
  [key: string]: any
}

// Data layer is injected so production uses Prisma and tests use an in-memory store.
export interface AgentInboxData {
  findTokenByHash(hash: string): Promise<AgentTokenRecord | null>
  listAgentMail(addressId: string, opts: { skip: number; take: number }): Promise<{ mail: any[]; total: number }>
  findMailById(id: string): Promise<MailRecord | null>
  markMailRead(id: string): Promise<void>
}

export function createAgentInboxRouter(data: AgentInboxData) {
  const router = Router()

  // Authenticate by X-Agent-Token and require the explicit receive scope.
  const authAgent = async (req: Request, res: Response, next: NextFunction) => {
    const raw = req.headers["x-agent-token"]
    const token = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : ""
    if (!token) return res.status(401).json({ error: "Agent token required" })

    let rec: AgentTokenRecord | null
    try {
      rec = await data.findTokenByHash(sha256(token))
    } catch {
      return res.status(500).json({ error: "Auth check failed" })
    }
    if (!rec) return res.status(401).json({ error: "Invalid agent token" })
    if (!rec.scopes.includes(RECEIVE_SCOPE))
      return res.status(403).json({ error: "Token missing receive scope" })
    if (rec.agent.status === "SUSPENDED")
      return res.status(403).json({ error: "Agent suspended" })
    if (!rec.agent.address)
      return res.status(409).json({ error: "Agent has no address" })

    ;(req as any).agent = rec.agent
    next()
  }

  // GET /api/v1/agents/me/mail — only mail addressed to this agent.
  router.get("/mail", authAgent, async (req, res) => {
    const agent = (req as any).agent as AgentContext
    const addr = agent.address!
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 100)
    const skip = (page - 1) * limit

    const { mail, total } = await data.listAgentMail(addr.id, { skip, take: limit })
    return res.json({
      agent: { id: agent.id, handle: addr.handle, address: `${addr.handle}@postal.zero` },
      mail,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  })

  // GET /api/v1/agents/me/mail/:mailId — 403 for another agent's mail or the owner inbox.
  router.get("/mail/:mailId", authAgent, async (req, res) => {
    const agent = (req as any).agent as AgentContext
    const addr = agent.address!

    const mail = await data.findMailById(req.params.mailId)
    if (!mail) return res.status(404).json({ error: "Mail not found" })
    if (mail.recipientAddressId !== addr.id)
      return res.status(403).json({ error: "Forbidden" })

    await data.markMailRead(mail.id).catch(() => {})
    return res.json({
      ...mail,
      isRead: true,
      recipient: { agentId: agent.id, handle: addr.handle, address: `${addr.handle}@postal.zero` }
    })
  })

  return router
}

// Production data layer backed by Prisma. No new models — reads existing
// AgentToken / Mail / Address.
export function makePrismaAgentInboxData(prisma: PrismaClient): AgentInboxData {
  return {
    findTokenByHash: (hash) =>
      prisma.agentToken.findUnique({
        where: { tokenHash: hash },
        select: {
          scopes: true,
          agent: {
            select: {
              id: true,
              status: true,
              ownerId: true,
              address: { select: { id: true, handle: true } }
            }
          }
        }
      }) as Promise<AgentTokenRecord | null>,

    listAgentMail: async (addressId, { skip, take }) => {
      const where = { recipientAddressId: addressId, isTrashed: false, isArchived: false }
      const [mail, total] = await Promise.all([
        prisma.mail.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, subject: true, senderName: true, senderHandle: true, senderVerified: true,
            bodyPreview: true, payload: true, mailType: true, isRead: true, isStarred: true,
            aiSummary: true, aiUrgency: true, deliveredAt: true
          }
        }),
        prisma.mail.count({ where })
      ])
      return { mail, total }
    },

    findMailById: (id) =>
      prisma.mail.findUnique({
        where: { id },
        select: {
          id: true, recipientAddressId: true, subject: true, body: true, senderName: true,
          senderHandle: true, senderVerified: true, mailType: true, isRead: true, isStarred: true,
          aiSummary: true, aiUrgency: true, deliveredAt: true, deliveryToken: true, payload: true
        }
      }),

    markMailRead: async (id) => {
      await prisma.mail.update({ where: { id }, data: { isRead: true, readAt: new Date() } })
    }
  }
}
