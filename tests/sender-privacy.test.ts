import { test, before, after, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import express from "express"

process.env.JWT_SECRET = "test_only_secret_do_not_print_" + "x".repeat(24)

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex")

// ── In-Memory Prisma & SMTP Stand-ins ───────────────────────────────────────────
// The real routers (and lib/recipient, routes/keys) each build their own
// `new PrismaClient()` at load time, and send.ts builds a nodemailer transport.
// Installing these stand-ins in the require cache before requiring the routers
// lets the real route code run unmodified. The Prisma stand-in honours nested
// `select`/`include`, so a route that selects senderEmail (or forgets to select
// senderHandle) behaves exactly as it would against real Prisma.
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
    readAt: null, deliveredAt: new Date(), createdAt: new Date(),
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
const { composeRouter } = require("../src/routes/compose")
const { sendRouter } = require("../src/routes/send")
const { receiptsRouter, formatReceiptFrom } = require("../src/routes/receipts")
const { mailRouter } = require("../src/routes/mail")
const { createAgentInboxRouter, makePrismaAgentInboxData } = require("../src/routes/agent-inbox")
const { signAccess } = require("../src/lib/auth")

// ── Fixtures ────────────────────────────────────────────────────────────────────
const ALICE_PRIVATE = "user@secret.com"
const OWNER_PRIVATE = "owner@secret.com"
const RAW_KEY = "raw-account-key-alice"
const RAW_AGENT_TOKEN = "pz_agent_support_send_receive"
const RAW_SEND_TOKEN = "send-token-external-bob"

beforeEach(() => {
  Object.values(db).forEach((m) => m.clear())
  smtpSent.length = 0
  const usage = { plan: "FREE", messagesThisMonth: 0, usagePeriodStart: new Date() }
  db.user.set("user-alice", { id: "user-alice", email: ALICE_PRIVATE, handle: "alice", displayName: "Alice", ...usage })
  db.user.set("user-bob", { id: "user-bob", email: "bob@private.example", handle: "bob", displayName: "Bob", ...usage })
  db.user.set("user-owner", { id: "user-owner", email: OWNER_PRIVATE, handle: "owner", displayName: "Owner", ...usage })
  db.session.set("s-alice", { id: "s-alice", userId: "user-alice", expiresAt: new Date(Date.now() + 3600e3) })
  db.address.set("addr-alice", { id: "addr-alice", handle: "alice", userId: "user-alice", agentId: null })
  db.address.set("addr-bob", { id: "addr-bob", handle: "bob", userId: "user-bob", agentId: null })
  db.agent.set("agent-1", { id: "agent-1", ownerId: "user-owner", displayName: "Support Agent", status: "VERIFIED" })
  db.address.set("addr-agent", { id: "addr-agent", handle: "support-bot", userId: null, agentId: "agent-1" })
  db.agentToken.set("tok-1", { id: "tok-1", agentId: "agent-1", tokenHash: sha256(RAW_AGENT_TOKEN), scopes: ["send", "receive"], deliveries: 0, lastUsed: null })
  db.key.set("key-1", { id: "key-1", userId: "user-alice", keyHash: sha256(RAW_KEY), deliveries: 0, lastUsed: null })
  db.sendToken.set("st-1", {
    id: "st-1", token: RAW_SEND_TOKEN, senderEmail: "bob@external.org", recipientHandle: "alice",
    verified: true, usedAt: null, expiresAt: new Date(Date.now() + 3600e3),
  })
})

// ── Test App (real routers, mounted as in src/index.ts) ─────────────────────────
const app = express()
app.use(express.json())
app.use("/api/v1/send", sendRouter)
app.use("/api/v1/agents/me", createAgentInboxRouter(makePrismaAgentInboxData(new FakePrismaClient() as any)))
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

const post = (path: string, headers: Record<string, string>, body: any) =>
  fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) })
const bearer = (userId: string) => ({ Authorization: `Bearer ${signAccess(userId)}` })
const onlyMail = () => {
  assert.equal(db.mail.size, 1, "exactly one mail stored")
  return [...db.mail.values()][0]
}
const assertNoLeak = (value: unknown, secret: string, where: string) =>
  assert.ok(!JSON.stringify(value).includes(secret), `${where} leaks ${secret}`)

const seedMail = (overrides: any) => {
  const row = {
    id: randomUUID(), deliveryToken: randomUUID(), userId: "user-bob", recipientAddressId: "addr-bob",
    subject: "Seeded", body: "seeded body", bodyPreview: "seeded body", senderName: "Alice",
    senderEmail: "alice@postal.zero", senderHandle: "alice", senderVerified: true, mailType: "PERSONAL",
    isRead: false, isStarred: false, isArchived: false, isTrashed: false, aiSummary: null, aiUrgency: "NORMAL",
    receiptMode: "DELIVERY", receiptSig: "sig-seeded", readAt: null,
    deliveredAt: new Date("2026-09-27T00:00:00Z"), createdAt: new Date("2026-09-27T00:00:00Z"),
    ...overrides,
  }
  db.mail.set(row.id, row)
  return row
}

// ── Test Suites A–H ─────────────────────────────────────────────────────────────

test("A: Authenticated compose derives internal identity and hides User.email", async () => {
  const res = await post("/api/v1/compose/bob", bearer("user-alice"), { subject: "Hi", body: "Hello" })
  assert.equal(res.status, 201)
  const body = await res.json()
  const mail = onlyMail()

  assert.equal(mail.senderEmail, "alice@postal.zero")
  assert.equal(mail.senderHandle, "alice")
  assert.equal(mail.senderName, "Alice")
  assert.equal(mail.senderVerified, true)
  assertNoLeak(mail, ALICE_PRIVATE, "stored mail")
  assertNoLeak(body, ALICE_PRIVATE, "compose response")
  assert.equal(smtpSent.length, 0)
})

test("B: Bearer send uses @postal.zero and suppresses confirmation SMTP", async () => {
  const res = await post("/api/v1/send/bob", bearer("user-alice"), { subject: "Hi", body: "Hello" })
  assert.equal(res.status, 201)
  const body = await res.json()
  const mail = onlyMail()

  assert.equal(mail.senderEmail, "alice@postal.zero")
  assert.equal(mail.senderHandle, "alice")
  assert.equal(mail.senderName, "Alice")
  assertNoLeak(mail, ALICE_PRIVATE, "stored mail")
  assertNoLeak(body, ALICE_PRIVATE, "send response")
  assert.equal(smtpSent.length, 0, "no confirmation email for internal senders")
})

test("C: Legacy X-Agent-Key/account-key send uses @postal.zero and suppresses confirmation SMTP", async () => {
  const res = await post("/api/v1/send/bob", { "X-Agent-Key": RAW_KEY }, { subject: "Hi", body: "Hello" })
  assert.equal(res.status, 201)
  const body = await res.json()
  const mail = onlyMail()

  assert.equal(mail.senderEmail, "alice@postal.zero")
  assert.equal(mail.senderHandle, "alice")
  assert.equal(mail.senderName, "Alice")
  assert.equal(mail.mailType, "AGENT")
  assertNoLeak(mail, ALICE_PRIVATE, "stored mail")
  assertNoLeak(body, ALICE_PRIVATE, "send response")
  assert.equal(smtpSent.length, 0, "no confirmation email for account-key sends")
})

test("D: Agent-token send preserves agent identity and does not substitute owner", async () => {
  const res = await post("/api/v1/send/bob", { "X-Agent-Token": RAW_AGENT_TOKEN }, { subject: "Hi", body: "Hello" })
  assert.equal(res.status, 201)
  const body = await res.json()
  const mail = onlyMail()

  assert.equal(mail.senderEmail, "support-bot@postal.zero")
  assert.equal(mail.senderHandle, "support-bot")
  assert.equal(mail.senderName, "Support Agent")
  assert.equal(mail.mailType, "AGENT")
  assert.deepEqual(body.sender, {
    type: "AGENT", id: "agent-1", handle: "support-bot", address: "support-bot@postal.zero", status: "VERIFIED",
  })
  for (const leaked of [OWNER_PRIVATE, "owner@postal.zero", "Owner"]) {
    assertNoLeak(mail, leaked, "stored mail")
    assertNoLeak(body, leaked, "send response")
  }
  assert.equal(smtpSent.length, 0, "no confirmation email for agent sends")
})

test("E: External OTP/sendToken send preserves external senderEmail", async () => {
  const res = await post("/api/v1/send/alice", {}, { sendToken: RAW_SEND_TOKEN, senderName: "External Bob", subject: "Hi", body: "Hello" })
  assert.equal(res.status, 201)
  const mail = onlyMail()

  assert.equal(mail.senderEmail, "bob@external.org")
  assert.equal(mail.senderHandle, null)
  assert.equal(mail.senderName, "External Bob")
  assert.equal(mail.senderVerified, false)
  assert.equal(smtpSent.length, 1, "external senders still get a delivery confirmation")
  assert.equal(smtpSent[0].to, "bob@external.org")
  assert.ok(db.sendToken.get("st-1").usedAt, "send token is consumed")
})

test("F: Public receipt display sanitization", async () => {
  const current = seedMail({ subject: "Current Mail", senderEmail: "alice@postal.zero", senderHandle: "alice", receiptSig: "sig-current" })
  const legacy = seedMail({ subject: "Legacy Mail", senderEmail: ALICE_PRIVATE, senderHandle: "alice", receiptSig: "sig-legacy-original" })
  const external = seedMail({
    subject: "External Mail", senderName: "External Bob", senderEmail: "bob@external.org", senderHandle: null,
    senderVerified: false, userId: "user-alice", recipientAddressId: "addr-alice", receiptSig: "sig-external",
  })

  const b1 = await (await fetch(`${base}/api/v1/receipt/${current.deliveryToken}`)).json()
  assert.equal(b1.from, "Alice <alice@postal.zero>")
  assert.equal(b1.to, "bob@postal.zero")

  const r2 = await fetch(`${base}/api/v1/receipt/${legacy.deliveryToken}`)
  assert.equal(r2.status, 200)
  const b2 = await r2.json()
  assert.equal(b2.from, "Alice <alice@postal.zero>")
  assertNoLeak(b2, ALICE_PRIVATE, "legacy receipt")

  const b3 = await (await fetch(`${base}/api/v1/receipt/${external.deliveryToken}`)).json()
  assert.equal(b3.from, "External Bob <bob@external.org>")
  assert.equal(b3.to, "alice@postal.zero")

  // The route's display helper is the exported one
  assert.equal(formatReceiptFrom(legacy), "Alice <alice@postal.zero>")
})

test("G: Receipt display sanitization does NOT rewrite or invalidate historical signatures", async () => {
  const legacy = seedMail({ senderEmail: ALICE_PRIVATE, senderHandle: "alice", receiptSig: "sig-legacy-original" })

  const body = await (await fetch(`${base}/api/v1/receipt/${legacy.deliveryToken}`)).json()
  assert.equal(body.receiptSig, "sig-legacy-original")
  assert.equal(body.verified, true)
  assert.match(body.verifyHash, /^[0-9a-f]{64}$/)

  // Stored row is untouched by the read
  assert.equal(db.mail.get(legacy.id).senderEmail, ALICE_PRIVATE)
  assert.equal(db.mail.get(legacy.id).receiptSig, "sig-legacy-original")
})

test("H: Recipient inbox and agent inbox attribute sender without leaking User.email", async () => {
  const toBob = seedMail({ senderEmail: ALICE_PRIVATE, senderHandle: "alice" })
  const toAgent = seedMail({ userId: "user-owner", recipientAddressId: "addr-agent", senderEmail: ALICE_PRIVATE, senderHandle: "alice" })

  const checkRow = (row: any, where: string) => {
    assert.equal(row.senderName, "Alice", where)
    assert.equal(row.senderHandle, "alice", where)
    assert.equal(row.senderVerified, true, where)
    assert.ok(!("senderEmail" in row), `${where} exposes senderEmail`)
    assertNoLeak(row, ALICE_PRIVATE, where)
  }

  const list = await (await fetch(`${base}/api/v1/mail`, { headers: bearer("user-bob") })).json()
  assert.equal(list.mail.length, 1)
  checkRow(list.mail[0], "inbox list")
  checkRow(await (await fetch(`${base}/api/v1/mail/${toBob.id}`, { headers: bearer("user-bob") })).json(), "inbox detail")

  const agentHeaders = { "X-Agent-Token": RAW_AGENT_TOKEN }
  const agentList = await (await fetch(`${base}/api/v1/agents/me/mail`, { headers: agentHeaders })).json()
  assert.equal(agentList.mail.length, 1)
  checkRow(agentList.mail[0], "agent inbox list")
  checkRow(await (await fetch(`${base}/api/v1/agents/me/mail/${toAgent.id}`, { headers: agentHeaders })).json(), "agent inbox detail")
})
