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

// Position in the agent's mailbox ordered by (createdAt ASC, id ASC). The id
// breaks createdAt ties so equal-timestamp rows are never skipped.
export interface AgentMailCursor {
  createdAt: Date
  id: string
}

// Wire format: base64url("<createdAt as ISO-8601 UTC with ms>|<mail id>").
// Clients must treat it as opaque.
export function encodeCursor(cursor: AgentMailCursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, "utf8").toString("base64url")
}

const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const CURSOR_ID = /^[A-Za-z0-9_-]{1,64}$/

// Returns null for anything encodeCursor could not have produced.
export function decodeCursor(raw: string): AgentMailCursor | null {
  if (!raw || raw.length > 200 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null
  const text = Buffer.from(raw, "base64url").toString("utf8")
  if (Buffer.from(text, "utf8").toString("base64url") !== raw) return null
  const sep = text.indexOf("|")
  if (sep < 0) return null
  const iso = text.slice(0, sep)
  const id = text.slice(sep + 1)
  if (!ISO_MS.test(iso) || !CURSOR_ID.test(id)) return null
  const createdAt = new Date(iso)
  if (isNaN(createdAt.getTime()) || createdAt.toISOString() !== iso) return null
  return { createdAt, id }
}

// Data layer is injected so production uses Prisma and tests use an in-memory store.
export interface AgentInboxData {
  findTokenByHash(hash: string): Promise<AgentTokenRecord | null>
  listAgentMail(addressId: string, opts: { skip: number; take: number }): Promise<{ mail: any[]; total: number }>
  // Rows strictly after `after` in (createdAt ASC, id ASC) order; each row includes createdAt.
  listAgentMailAfter(addressId: string, opts: { after: AgentMailCursor | null; take: number }): Promise<any[]>
  findMailById(id: string): Promise<MailRecord | null>
}

const LOAD_FAILED = { error: "Failed to load agent mail" }

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
  // ?cursor=<opaque> (or an empty ?cursor= to start from the oldest) switches to
  // stable oldest-first polling; otherwise newest-first page/limit as before.
  // Read-only in both modes.
  router.get("/mail", authAgent, async (req, res) => {
    const agent = (req as any).agent as AgentContext
    const addr = agent.address!
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 100)
    const agentInfo = { id: agent.id, handle: addr.handle, address: `${addr.handle}@postal.zero` }

    try {
      if (req.query.cursor !== undefined) {
        if (req.query.page !== undefined)
          return res.status(400).json({ error: "cursor cannot be combined with page" })
        const raw = req.query.cursor
        if (typeof raw !== "string") return res.status(400).json({ error: "Invalid cursor" })
        const after = raw === "" ? null : decodeCursor(raw)
        if (raw !== "" && !after) return res.status(400).json({ error: "Invalid cursor" })

        const rows = await data.listAgentMailAfter(addr.id, { after, take: limit + 1 })
        const page = rows.slice(0, limit)
        const last = page[page.length - 1]
        return res.json({
          agent: agentInfo,
          mail: page.map((row) => {
            const out = { ...row }
            delete out.createdAt
            return out
          }),
          cursor: {
            next: last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : raw || null,
            hasMore: rows.length > limit
          }
        })
      }

      const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1)
      const skip = (page - 1) * limit
      const { mail, total } = await data.listAgentMail(addr.id, { skip, take: limit })
      return res.json({
        agent: agentInfo,
        mail,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      })
    } catch {
      return res.status(500).json(LOAD_FAILED)
    }
  })

  // GET /api/v1/agents/me/mail/:mailId — 403 for another agent's mail or the owner
  // inbox; 404 for trashed/archived mail, matching the list's visibility.
  // Read-only: an agent fetch never touches isRead/readAt, so it can never
  // produce human OPENED receipt semantics.
  router.get("/mail/:mailId", authAgent, async (req, res) => {
    const agent = (req as any).agent as AgentContext
    const addr = agent.address!

    try {
      const mail = await data.findMailById(req.params.mailId)
      if (!mail) return res.status(404).json({ error: "Mail not found" })
      if (mail.recipientAddressId !== addr.id)
        return res.status(403).json({ error: "Forbidden" })
      const { isTrashed, isArchived, ...visible } = mail
      if (isTrashed || isArchived) return res.status(404).json({ error: "Mail not found" })

      return res.json({
        ...visible,
        recipient: { agentId: agent.id, handle: addr.handle, address: `${addr.handle}@postal.zero` }
      })
    } catch {
      return res.status(500).json(LOAD_FAILED)
    }
  })

  return router
}

const LIST_SELECT = {
  id: true, subject: true, senderName: true, senderHandle: true, senderVerified: true,
  bodyPreview: true, payload: true, mailType: true, isRead: true, isStarred: true,
  aiSummary: true, aiUrgency: true, deliveredAt: true
} as const

// Production data layer backed by Prisma. No new models — reads existing
// AgentToken / Mail / Address. Every mail query is scoped by recipientAddressId.
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
          select: LIST_SELECT
        }),
        prisma.mail.count({ where })
      ])
      return { mail, total }
    },

    listAgentMailAfter: (addressId, { after, take }) =>
      prisma.mail.findMany({
        where: {
          recipientAddressId: addressId,
          isTrashed: false,
          isArchived: false,
          ...(after && {
            OR: [
              { createdAt: { gt: after.createdAt } },
              { createdAt: after.createdAt, id: { gt: after.id } }
            ]
          })
        },
        take,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { ...LIST_SELECT, createdAt: true }
      }),

    findMailById: (id) =>
      prisma.mail.findUnique({
        where: { id },
        select: {
          id: true, recipientAddressId: true, subject: true, body: true, senderName: true,
          senderHandle: true, senderVerified: true, mailType: true, isRead: true, isStarred: true,
          aiSummary: true, aiUrgency: true, deliveredAt: true, deliveryToken: true, payload: true,
          isTrashed: true, isArchived: true
        }
      })
  }
}
