import { test, before, after, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import express from "express"

process.env.JWT_SECRET = "test_only_secret_do_not_print_" + "x".repeat(24)

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex")

// ── In-Memory Prisma & SMTP Stand-ins ───────────────────────────────────────────
// Same approach as receipt-modes / sender-privacy: stand-ins are installed in the
// require cache before the real routers load, so route code runs unmodified.
// Adds `where.<field>.in` for the owner batch endpoint in agents.ts.
const db = {
  user: new Map<string, any>(),
  session: new Map<string, any>(),
  address: new Map<string, any>(),
  agent: new Map<string, any>(),
  agentToken: new Map<string, any>(),
  key: new Map<string, any>(),
  sendToken: new Map<string, any>(),
  mail: new Map<string, any>(),
  deliveryReceipt: new Map<string, any>(),
}
type Model = keyof typeof db
const smtpSent: any[] = []

const relations: Partial<Record<Model, Record<string, [Model, (row: any) => any]>>> = {
  mail: {
    user: ["user", (m) => db.user.get(m.userId)],
    recipientAddress: ["address", (m) => db.address.get(m.recipientAddressId)],
  },
  address: {
    user: ["user", (a) => (a.userId ? db.user.get(a.userId) : null)],
    agent: ["agent", (a) => (a.agentId ? db.agent.get(a.agentId) : null)],
  },
  agentToken: { agent: ["agent", (t) => db.agent.get(t.agentId)] },
  agent: {
    owner: ["user", (a) => db.user.get(a.ownerId)],
    address: ["address", (a) => [...db.address.values()].find((x) => x.agentId === a.id) ?? null],
  },
}

function shape(model: Model, row: any, args: any): any {
  if (!row) return null
  const rel = relations[model] ?? {}
  const nested = (key: string, spec: any) => {
    const [target, resolve] = rel[key]
    return shape(target, resolve(row), spec === true ? {} : spec)
  }
  if (args?.select) {
    const out: any = {}
    for (const [k, v] of Object.entries<any>(args.select)) if (v) out[k] = k in rel ? nested(k, v) : row[k]
    return out
  }
  const out = { ...row }
  for (const [k, v] of Object.entries<any>(args?.include ?? {})) if (v) out[k] = nested(k, v)
  return out
}

const matches = (model: Model, row: any, where: any = {}) =>
  Object.entries<any>(where).every(([k, v]) => {
    // Only NOT shape used (mail.ts): exclude mail addressed to agent addresses.
    if (k === "NOT") return !(db.address.get(row.recipientAddressId)?.agentId)
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("gt" in v) return row[k] > v.gt
      if ("in" in v) return v.in.includes(row[k])
      throw new Error(`stub: unsupported where.${String(k)} on ${model}`)
    }
    return v instanceof Date ? row[k]?.getTime() === v.getTime() : row[k] === v
  })

const applyData = (row: any, data: any) => {
  for (const [k, v] of Object.entries<any>(data)) row[k] = v && typeof v === "object" && "increment" in v ? row[k] + v.increment : v
}

const defaults: Partial<Record<Model, () => any>> = {
  mail: () => ({
    deliveryToken: randomUUID(), senderVerified: false, mailType: "PERSONAL", isRead: false, isStarred: false,
    isArchived: false, isTrashed: false, aiSummary: null, aiUrgency: "NORMAL", receiptMode: "DELIVERY",
    receiptSig: null, readAt: null, deliveredAt: new Date(), createdAt: new Date(),
  }),
  deliveryReceipt: () => ({ timestamp: new Date(), ipAddress: null }),
}

function delegate(model: Model) {
  const rows = () => [...db[model].values()]
  return {
    findUnique: async (args: any) => shape(model, rows().find((r) => matches(model, r, args.where)), args),
    findFirst: async (args: any) => shape(model, rows().find((r) => matches(model, r, args.where)), args),
    findMany: async (args: any = {}) => {
      let list = rows().filter((r) => matches(model, r, args.where))
      if (args.orderBy?.createdAt) list.sort((a, b) => (b.createdAt - a.createdAt) * (args.orderBy.createdAt === "desc" ? 1 : -1))
      list = list.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? list.length))
      return list.map((r) => shape(model, r, args))
    },
    count: async (args: any = {}) => rows().filter((r) => matches(model, r, args.where)).length,
    create: async ({ data }: any) => {
      const row = { id: randomUUID(), ...(defaults[model]?.() ?? {}), ...data }
      db[model].set(row.id, row)
      return { ...row }
    },
    update: async ({ where, data }: any) => {
      const row = rows().find((r) => matches(model, r, where))
      if (!row) throw new Error(`stub: ${model} to update not found`)
      applyData(row, data)
      return { ...row }
    },
    updateMany: async ({ where, data }: any) => {
      const list = rows().filter((r) => matches(model, r, where))
      list.forEach((r) => applyData(r, data))
      return { count: list.length }
    },
  }
}

class FakePrismaClient {
  user = delegate("user")
  session = delegate("session")
  address = delegate("address")
  agent = delegate("agent")
  agentToken = delegate("agentToken")
  key = delegate("key")
  sendToken = delegate("sendToken")
  mail = delegate("mail")
  deliveryReceipt = delegate("deliveryReceipt")
  async $transaction(fn: (tx: any) => Promise<any>) { return fn(this) }
}

const stub = (name: string, exports: any) => {
  const path = require.resolve(name)
  require.cache[path] = { id: path, filename: path, loaded: true, exports } as any
}
stub("@prisma/client", { PrismaClient: FakePrismaClient, Prisma: {} })
stub("nodemailer", { createTransport: () => ({ sendMail: async (msg: any) => { smtpSent.push(msg); return {} } }) })

// Real modules under test — required after the stubs are installed.
/* eslint-disable @typescript-eslint/no-require-imports -- must load after the stubs; hoisted imports would run first */
const { composeRouter } = require("../src/routes/compose")
const { sendRouter } = require("../src/routes/send")
const { mailRouter } = require("../src/routes/mail")
const { receiptsRouter } = require("../src/routes/receipts")
const { agentsRouter } = require("../src/routes/agents")
const { createAgentInboxRouter, makePrismaAgentInboxData } = require("../src/routes/agent-inbox")
const { signAccess } = require("../src/lib/auth")
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Fixtures ────────────────────────────────────────────────────────────────────
const RAW_SEND_RECEIVE = "pz_agent_one_send_receive"
const RAW_SEND_ONLY = "pz_agent_one_send_only"
const RAW_RECEIVE_ONLY = "pz_agent_one_receive_only"
const RAW_AGENT_TWO = "pz_agent_two_send_receive"

beforeEach(() => {
  Object.values(db).forEach((m) => m.clear())
  smtpSent.length = 0
  const usage = () => ({ plan: "FREE", messagesThisMonth: 0, usagePeriodStart: new Date() })
  db.user.set("user-alice", { id: "user-alice", email: "alice@secret.com", handle: "alice", displayName: "Alice", ...usage() })
  db.user.set("user-bob", { id: "user-bob", email: "bob@secret.com", handle: "bob", displayName: "Bob", ...usage() })
  db.user.set("user-owner", { id: "user-owner", email: "owner@secret.com", handle: "owner", displayName: "Owner", ...usage() })
  db.session.set("s-alice", { id: "s-alice", userId: "user-alice", expiresAt: new Date(Date.now() + 3600e3) })
  db.address.set("addr-alice", { id: "addr-alice", handle: "alice", userId: "user-alice", agentId: null })
  db.address.set("addr-bob", { id: "addr-bob", handle: "bob", userId: "user-bob", agentId: null })
  db.address.set("addr-owner", { id: "addr-owner", handle: "owner", userId: "user-owner", agentId: null })
  db.agent.set("agent-1", { id: "agent-1", ownerId: "user-owner", displayName: "Ops Agent", status: "VERIFIED" })
  db.agent.set("agent-2", { id: "agent-2", ownerId: "user-owner", displayName: "Other Agent", status: "VERIFIED" })
  db.address.set("addr-agent-1", { id: "addr-agent-1", handle: "ops-bot", userId: null, agentId: "agent-1" })
  db.address.set("addr-agent-2", { id: "addr-agent-2", handle: "other-bot", userId: null, agentId: "agent-2" })
  const token = (id: string, agentId: string, raw: string, scopes: string[]) =>
    db.agentToken.set(id, { id, agentId, tokenHash: sha256(raw), scopes, deliveries: 0, lastUsed: null })
  token("tok-sr", "agent-1", RAW_SEND_RECEIVE, ["send", "receive"])
  token("tok-s", "agent-1", RAW_SEND_ONLY, ["send"])
  token("tok-r", "agent-1", RAW_RECEIVE_ONLY, ["receive"])
  token("tok-two", "agent-2", RAW_AGENT_TWO, ["send", "receive"])
})

// ── Test App (real routers, mounted in src/index.ts order) ──────────────────────
// agentsRouter authenticates the owner itself via verifyAccess; the requireAuth
// session gate from index.ts is covered by auth-hardening tests.
const app = express()
app.use(express.json())
app.use("/api/v1/send", sendRouter)
app.use("/api/v1/agents/me", createAgentInboxRouter(makePrismaAgentInboxData(new FakePrismaClient() as any)))
app.use("/api/v1/agents", agentsRouter)
app.use("/api/v1/receipt", receiptsRouter)
app.use("/api/v1/compose", composeRouter)
app.use("/api/v1/mail", mailRouter)

let base = ""
let server: ReturnType<typeof app.listen>
before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`
      resolve()
    })
  })
})
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const bearer = (userId: string) => ({ Authorization: `Bearer ${signAccess(userId)}` })
const agentGet = (path: string, raw: string) => fetch(`${base}/api/v1/agents/me${path}`, { headers: { "X-Agent-Token": raw } })
const ownerGet = (path: string) => fetch(`${base}/api/v1/agents${path}`, { headers: bearer("user-owner") })
const ownerBatch = (agentId: string, ids: string[], action: string) =>
  fetch(`${base}/api/v1/agents/${agentId}/mail/batch`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...bearer("user-owner") }, body: JSON.stringify({ ids, action }),
  })
const compose = async (to: string, receiptMode: string, subject = "Tracked") => {
  const res = await fetch(`${base}/api/v1/compose/${to}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...bearer("user-alice") },
    body: JSON.stringify({ subject, body: `hello ${to}`, receiptMode }),
  })
  assert.equal(res.status, 201)
  return (await res.json()) as { messageId: string; deliveryToken: string }
}
const agentSend = (raw: string, to: string) =>
  fetch(`${base}/api/v1/send/${to}`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Agent-Token": raw },
    body: JSON.stringify({ subject: "Re: Tracked", body: "pong" }),
  })
const eventsFor = (mailId: string) => [...db.deliveryReceipt.values()].filter((r) => r.mailId === mailId).map((r) => r.event)
const receipt = async (token: string) => (await fetch(`${base}/api/v1/receipt/${token}`)).json()

// Sender-facing state that must not move when only a bot or the custodian looks.
async function assertNotOpened(messageId: string, deliveryToken: string) {
  assert.equal(db.mail.get(messageId).readAt, null, "readAt untouched")
  assert.deepEqual(eventsFor(messageId), ["DELIVERED"], "no OPENED receipt row")
  const r = await receipt(deliveryToken)
  assert.equal(r.status, "DELIVERED")
  assert.equal(r.readAt, null)
}

// ── Agent reads never create human OPENED semantics ─────────────────────────────

test("1. agent fetch of OPENED mail returns it without setting readAt/isRead or creating an OPENED receipt", async () => {
  const { messageId, deliveryToken } = await compose("ops-bot", "OPENED")

  const list = await agentGet("/mail", RAW_SEND_RECEIVE)
  assert.equal(list.status, 200)
  assert.deepEqual((await list.json()).mail.map((m: any) => m.id), [messageId])

  for (let i = 0; i < 2; i++) {
    const res = await agentGet(`/mail/${messageId}`, RAW_SEND_RECEIVE)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.id, messageId)
    assert.equal(body.body, "hello ops-bot")
    assert.equal(body.isRead, false, "response reports stored read state")
  }

  assert.equal(db.mail.get(messageId).isRead, false, "isRead untouched")
  await assertNotOpened(messageId, deliveryToken)
})

test("2. owner single open of agent mail sets isRead only; receipt stays DELIVERED", async () => {
  const { messageId, deliveryToken } = await compose("ops-bot", "OPENED")

  const res = await ownerGet(`/agent-1/mail/${messageId}`)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).isRead, true)
  assert.equal(db.mail.get(messageId).isRead, true)
  await assertNotOpened(messageId, deliveryToken)
})

test("3. owner batch read of agent mail sets isRead only; receipt stays DELIVERED", async () => {
  const { messageId, deliveryToken } = await compose("ops-bot", "OPENED")

  const res = await ownerBatch("agent-1", [messageId], "read")
  assert.equal(res.status, 200)
  assert.equal((await res.json()).updated, 1)
  assert.equal(db.mail.get(messageId).isRead, true)
  await assertNotOpened(messageId, deliveryToken)
})

test("4. owner batch unread clears isRead but never rewrites readAt", async () => {
  const { messageId } = await compose("ops-bot", "OPENED")
  const legacyReadAt = new Date("2026-01-01T00:00:00.000Z")
  Object.assign(db.mail.get(messageId), { isRead: true, readAt: legacyReadAt })

  const res = await ownerBatch("agent-1", [messageId], "unread")
  assert.equal(res.status, 200)
  assert.equal(db.mail.get(messageId).isRead, false)
  assert.equal(db.mail.get(messageId).readAt, legacyReadAt, "readAt left as-is")
})

test("5. control: human open still sets readAt once, creates exactly one signed OPENED receipt, status READ", async () => {
  const { messageId, deliveryToken } = await compose("bob", "OPENED")

  const first = await (await fetch(`${base}/api/v1/mail/${messageId}`, { headers: bearer("user-bob") })).json()
  assert.ok(first.readAt)
  assert.deepEqual(eventsFor(messageId), ["DELIVERED", "OPENED"])
  const opened = [...db.deliveryReceipt.values()].find((r) => r.mailId === messageId && r.event === "OPENED")
  assert.ok(opened.signature)
  assert.equal(opened.timestamp.toISOString(), first.readAt)

  const r = await receipt(deliveryToken)
  assert.equal(r.status, "READ")
  assert.equal(r.readAt, first.readAt)

  const second = await (await fetch(`${base}/api/v1/mail/${messageId}`, { headers: bearer("user-bob") })).json()
  assert.equal(second.readAt, first.readAt)
  assert.deepEqual(eventsFor(messageId), ["DELIVERED", "OPENED"], "no duplicate OPENED receipt")
})

// ── Token scope and mailbox isolation ───────────────────────────────────────────

test("6. send-only token cannot receive", async () => {
  const { messageId } = await compose("ops-bot", "DELIVERY")
  for (const path of ["/mail", `/mail/${messageId}`]) {
    const res = await agentGet(path, RAW_SEND_ONLY)
    assert.equal(res.status, 403)
    assert.equal((await res.json()).error, "Token missing receive scope")
  }
})

test("7. receive-only token cannot send", async () => {
  const res = await agentSend(RAW_RECEIVE_ONLY, "alice")
  assert.equal(res.status, 401)
  assert.equal((await res.json()).error, "Invalid agent token")
  assert.equal(db.mail.size, 0)
  assert.equal(db.user.get("user-owner").messagesThisMonth, 0)
  assert.equal(db.agentToken.get("tok-r").deliveries, 0)
})

test("8. revoked token is rejected for receive and send", async () => {
  const { messageId } = await compose("ops-bot", "DELIVERY")
  db.agentToken.delete("tok-sr")
  for (const path of ["/mail", `/mail/${messageId}`]) {
    const res = await agentGet(path, RAW_SEND_RECEIVE)
    assert.equal(res.status, 401)
    assert.equal((await res.json()).error, "Invalid agent token")
  }
  assert.equal((await agentSend(RAW_SEND_RECEIVE, "alice")).status, 401)
})

test("9. one agent cannot read another agent's mail", async () => {
  const { messageId, deliveryToken } = await compose("other-bot", "OPENED")

  const list = await (await agentGet("/mail", RAW_SEND_RECEIVE)).json()
  assert.ok(!list.mail.some((m: any) => m.id === messageId))
  const res = await agentGet(`/mail/${messageId}`, RAW_SEND_RECEIVE)
  assert.equal(res.status, 403)
  assert.equal((await res.json()).error, "Forbidden")

  assert.equal(db.mail.get(messageId).isRead, false)
  await assertNotOpened(messageId, deliveryToken)
})

test("10. an agent cannot read its owner's human mail", async () => {
  const { messageId, deliveryToken } = await compose("owner", "OPENED")

  const list = await (await agentGet("/mail", RAW_SEND_RECEIVE)).json()
  assert.ok(!list.mail.some((m: any) => m.id === messageId))
  const res = await agentGet(`/mail/${messageId}`, RAW_SEND_RECEIVE)
  assert.equal(res.status, 403)
  assert.equal((await res.json()).error, "Forbidden")

  assert.equal(db.mail.get(messageId).isRead, false)
  await assertNotOpened(messageId, deliveryToken)
})
