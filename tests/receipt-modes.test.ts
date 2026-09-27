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
// lets the real route code run unmodified. The Prisma stand-in mirrors the schema
// defaults/constraints that matter for receipts (receiptMode enum + DELIVERY
// default, required DeliveryReceipt.signature) and honours nested
// `select`/`include`, so a route that forgets to select a field sees `undefined`
// exactly as it would with real Prisma.
const RECEIPT_MODES = ["OFF", "DELIVERY", "OPENED"]

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
    isArchived: false, isTrashed: false, aiSummary: null, aiUrgency: "NORMAL",
    readAt: null, deliveredAt: new Date(), createdAt: new Date(),
  }),
  deliveryReceipt: () => ({ timestamp: new Date(), ipAddress: null }),
}

const constraints: Partial<Record<Model, (row: any) => void>> = {
  mail: (row) => {
    row.receiptMode = row.receiptMode ?? "DELIVERY"
    row.receiptSig = row.receiptSig ?? null
    if (!RECEIPT_MODES.includes(row.receiptMode)) throw new Error(`Invalid value for enum ReceiptMode: ${row.receiptMode}`)
  },
  deliveryReceipt: (row) => {
    if (typeof row.signature !== "string" || !row.signature) throw new Error("Argument `signature` is missing")
  },
}

function delegate(model: Model) {
  const rows = () => [...db[model].values()]
  return {
    findUnique: async (args: any) => shape(model, rows().find((r) => matches(model, r, args.where)), args),
    findFirst: async (args: any) => shape(model, rows().find((r) => matches(model, r, args.where)), args),
    create: async ({ data }: any) => {
      const row = { id: randomUUID(), ...(defaults[model]?.() ?? {}), ...data }
      constraints[model]?.(row)
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
const { signAccess } = require("../src/lib/auth")
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Fixtures ────────────────────────────────────────────────────────────────────
const RAW_KEY = "raw-account-key-alice"
const RAW_AGENT_TOKEN = "pz_agent_support_send"
const RAW_SEND_TOKEN = "send-token-external-carol"

function seed() {
  Object.values(db).forEach((m) => m.clear())
  smtpSent.length = 0
  const usage = () => ({ plan: "FREE", messagesThisMonth: 0, usagePeriodStart: new Date() })
  db.user.set("user-alice", { id: "user-alice", email: "alice@secret.com", handle: "alice", displayName: "Alice", ...usage() })
  db.user.set("user-bob", { id: "user-bob", email: "bob@secret.com", handle: "bob", displayName: "Bob", ...usage() })
  db.user.set("user-owner", { id: "user-owner", email: "owner@secret.com", handle: "owner", displayName: "Owner", ...usage() })
  db.session.set("s-alice", { id: "s-alice", userId: "user-alice", expiresAt: new Date(Date.now() + 3600e3) })
  db.address.set("addr-alice", { id: "addr-alice", handle: "alice", userId: "user-alice", agentId: null })
  db.address.set("addr-bob", { id: "addr-bob", handle: "bob", userId: "user-bob", agentId: null })
  db.agent.set("agent-1", { id: "agent-1", ownerId: "user-owner", displayName: "Support Agent", status: "VERIFIED" })
  db.address.set("addr-agent", { id: "addr-agent", handle: "support-bot", userId: null, agentId: "agent-1" })
  db.agentToken.set("tok-1", { id: "tok-1", agentId: "agent-1", tokenHash: sha256(RAW_AGENT_TOKEN), scopes: ["send"], deliveries: 0, lastUsed: null })
  db.key.set("key-1", { id: "key-1", userId: "user-alice", keyHash: sha256(RAW_KEY), deliveries: 0, lastUsed: null })
  db.sendToken.set("st-1", {
    id: "st-1", token: RAW_SEND_TOKEN, senderEmail: "carol@external.org", recipientHandle: "bob",
    verified: true, usedAt: null, expiresAt: new Date(Date.now() + 3600e3),
  })
}

beforeEach(seed)

// ── Test App (real routers, mounted as in src/index.ts) ─────────────────────────
const app = express()
app.use(express.json())
app.use("/api/v1/send", sendRouter)
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
const compose = (body: Record<string, unknown>) => post("/api/v1/compose/bob", bearer("user-alice"), body)
const readAs = (userId: string, mailId: string) => fetch(`${base}/api/v1/mail/${mailId}`, { headers: bearer(userId) })
const lookupReceipt = (token: string) => fetch(`${base}/api/v1/receipt/${token}`)
const eventsFor = (mailId: string) => [...db.deliveryReceipt.values()].filter((r) => r.mailId === mailId).map((r) => r.event)
const receiptRows = () => [...db.deliveryReceipt.values()]

// All five ways to deliver mail to bob@postal.zero. `extra` is merged into the body.
const SENDERS: Record<string, (extra: Record<string, unknown>) => Promise<Response>> = {
  "web compose": (extra) => compose({ subject: "Hi", body: "Hello", ...extra }),
  "X-Agent-Token": (extra) => post("/api/v1/send/bob", { "X-Agent-Token": RAW_AGENT_TOKEN }, { subject: "Hi", body: "Hello", ...extra }),
  "X-Agent-Key": (extra) => post("/api/v1/send/bob", { "X-Agent-Key": RAW_KEY }, { subject: "Hi", body: "Hello", ...extra }),
  "Bearer": (extra) => post("/api/v1/send/bob", bearer("user-alice"), { subject: "Hi", body: "Hello", ...extra }),
  "sendToken": (extra) => post("/api/v1/send/bob", {}, { sendToken: RAW_SEND_TOKEN, senderName: "Carol", subject: "Hi", body: "Hello", ...extra }),
}
const SEND_PATHS = ["X-Agent-Token", "X-Agent-Key", "Bearer", "sendToken"]

// Full receipt lifecycle for one delivered message: stored state, sender-facing
// receipt before and after the recipient's first read, and receipt events.
async function lifecycle(messageId: string, deliveryToken: string) {
  const mail = db.mail.get(messageId)
  const stored = { receiptMode: mail.receiptMode, signed: Boolean(mail.receiptSig) }
  const eventsAtDelivery = eventsFor(messageId)
  const r1 = await lookupReceipt(deliveryToken)
  const before = r1.status === 200 ? (({ status, readAt }) => ({ status, readAt }))(await r1.json()) : r1.status
  assert.equal((await readAs("user-bob", messageId)).status, 200)
  const r2 = await lookupReceipt(deliveryToken)
  const afterRead = r2.status === 200 ? (({ status, readAt }) => ({ status, readAt: readAt ? "set" : null }))(await r2.json()) : r2.status
  return { stored, eventsAtDelivery, before, afterRead, eventsAfterRead: eventsFor(messageId) }
}

const EXPECTED: Record<string, any> = {
  OFF: {
    stored: { receiptMode: "OFF", signed: false }, eventsAtDelivery: [],
    before: 404, afterRead: 404, eventsAfterRead: [],
  },
  DELIVERY: {
    stored: { receiptMode: "DELIVERY", signed: true }, eventsAtDelivery: ["DELIVERED"],
    before: { status: "DELIVERED", readAt: null }, afterRead: { status: "DELIVERED", readAt: null }, eventsAfterRead: ["DELIVERED"],
  },
  OPENED: {
    stored: { receiptMode: "OPENED", signed: true }, eventsAtDelivery: ["DELIVERED"],
    before: { status: "DELIVERED", readAt: null }, afterRead: { status: "READ", readAt: "set" }, eventsAfterRead: ["DELIVERED", "OPENED"],
  },
}

// ── Web compose ─────────────────────────────────────────────────────────────────

test("1. receiptMode OFF: no signature, no receipt events, receipt lookup 404 before and after read", async () => {
  const res = await compose({ subject: "Private Note", body: "No receipts", receiptMode: "OFF" })
  assert.equal(res.status, 201)
  const { messageId, deliveryToken } = await res.json()
  const mail = db.mail.get(messageId)

  assert.equal(mail.receiptMode, "OFF")
  assert.equal(mail.receiptSig, null)
  assert.deepEqual(eventsFor(messageId), [])

  const r1 = await lookupReceipt(deliveryToken)
  assert.equal(r1.status, 404)
  assert.equal((await r1.json()).error, "Receipt not available")

  assert.equal((await readAs("user-bob", messageId)).status, 200)
  assert.deepEqual(eventsFor(messageId), [])
  assert.equal((await lookupReceipt(deliveryToken)).status, 404)
})

test("2. receiptMode DELIVERY: DELIVERED receipt only; read is not exposed to the sender", async () => {
  const res = await compose({ subject: "Standard Delivery", body: "Delivery only", receiptMode: "DELIVERY" })
  assert.equal(res.status, 201)
  const { messageId, deliveryToken } = await res.json()
  const mail = db.mail.get(messageId)

  assert.equal(mail.receiptMode, "DELIVERY")
  assert.ok(mail.receiptSig)
  assert.deepEqual(eventsFor(messageId), ["DELIVERED"])
  assert.equal(receiptRows()[0].signature, mail.receiptSig)

  const b1 = await (await lookupReceipt(deliveryToken)).json()
  assert.equal(b1.status, "DELIVERED")
  assert.equal(b1.readAt, null)
  assert.equal(b1.receiptMode, "DELIVERY")
  assert.equal(b1.receiptSig, mail.receiptSig)
  assert.equal(b1.from, "Alice <alice@postal.zero>")
  assert.equal(b1.to, "bob@postal.zero")

  const read = await (await readAs("user-bob", messageId)).json()
  assert.equal(read.isRead, true)
  assert.ok(read.readAt, "recipient's own view still records readAt")
  assert.equal(read.receiptMode, "DELIVERY")

  assert.deepEqual(eventsFor(messageId), ["DELIVERED"])
  const b2 = await (await lookupReceipt(deliveryToken)).json()
  assert.equal(b2.status, "DELIVERED")
  assert.equal(b2.readAt, null)
})

test("3. receiptMode OPENED: first read creates one signed OPENED receipt and the receipt shows READ", async () => {
  const res = await compose({ subject: "Tracked Open", body: "Track read status", receiptMode: "OPENED" })
  assert.equal(res.status, 201)
  const { messageId, deliveryToken } = await res.json()

  const b1 = await (await lookupReceipt(deliveryToken)).json()
  assert.equal(b1.status, "DELIVERED")
  assert.equal(b1.readAt, null)
  assert.equal(b1.receiptMode, "OPENED")

  const read1 = await (await readAs("user-bob", messageId)).json()
  const firstOpenedAt = read1.readAt
  assert.ok(firstOpenedAt)

  assert.deepEqual(eventsFor(messageId), ["DELIVERED", "OPENED"])
  const opened = receiptRows().find((r) => r.mailId === messageId && r.event === "OPENED")
  assert.ok(opened.signature)
  assert.equal(opened.timestamp.toISOString(), firstOpenedAt)

  const b2 = await (await lookupReceipt(deliveryToken)).json()
  assert.equal(b2.status, "READ")
  assert.equal(b2.readAt, firstOpenedAt)

  const read2 = await (await readAs("user-bob", messageId)).json()
  assert.equal(read2.readAt, firstOpenedAt, "second read does not move readAt")
  assert.deepEqual(eventsFor(messageId), ["DELIVERED", "OPENED"], "no duplicate OPENED receipt")
})

test("4. Invalid receiptMode is rejected with 400 and nothing is stored", async () => {
  const res = await compose({ subject: "Bad Mode", body: "test", receiptMode: "INVALID_MODE" })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, "invalid receipt mode")
  assert.equal(db.mail.size, 0)
  assert.equal(db.deliveryReceipt.size, 0)
})

test("5. Omitted receiptMode defaults to DELIVERY", async () => {
  const res = await compose({ subject: "No Mode", body: "default" })
  assert.equal(res.status, 201)
  const { messageId } = await res.json()
  assert.equal(db.mail.get(messageId).receiptMode, "DELIVERY")
  assert.ok(db.mail.get(messageId).receiptSig)
  assert.deepEqual(eventsFor(messageId), ["DELIVERED"])
})

test("6. A non-recipient cannot open OPENED mail or trigger an OPENED receipt", async () => {
  const { messageId, deliveryToken } = await (await compose({ subject: "Tracked", body: "for bob", receiptMode: "OPENED" })).json()

  assert.equal((await readAs("user-alice", messageId)).status, 404)
  assert.deepEqual(eventsFor(messageId), ["DELIVERED"])
  assert.equal((await (await lookupReceipt(deliveryToken)).json()).status, "DELIVERED")
})

test("7. Legacy mail with a signature and no stored mode is treated as DELIVERY (migration default)", async () => {
  // Rows that existed before the migration get receiptMode DELIVERY from the column default.
  const legacy = await new FakePrismaClient().mail.create({
    data: { userId: "user-bob", recipientAddressId: "addr-bob", senderName: "Alice", senderEmail: "alice@postal.zero",
      senderHandle: "alice", subject: "Old", body: "old", bodyPreview: "old", receiptSig: "sig-legacy" },
  })
  db.mail.get(legacy.id).readAt = new Date("2026-01-01T00:00:00.000Z")

  const body = await (await lookupReceipt(legacy.deliveryToken)).json()
  assert.equal(body.receiptMode, "DELIVERY")
  assert.equal(body.receiptSig, "sig-legacy")
  assert.equal(body.status, "DELIVERED")
  assert.equal(body.readAt, null)
})

test("8. Zero Lock: server stores only the sealed payload and placeholder body", async () => {
  const sealedPayload = {
    sealed: true, version: "pz-sealed-v1", algorithm: "AES-GCM",
    salt: "c2FsdHNhbHQxMjM0NTY=", nonce: "bm9uY2UxMjM0NTY=",
    ciphertext: "ZW5jcnlwdGVkX2J5dGVzX2hlcmU=", contentHash: "aGFzaF92YWx1ZV9oZXJl",
  }
  const res = await compose({
    subject: "Zero Lock Confidential", body: "[Zero Lock message — unlock required]",
    payload: sealedPayload, receiptMode: "DELIVERY",
  })
  assert.equal(res.status, 201)
  const mail = db.mail.get((await res.json()).messageId)

  assert.equal(mail.body, "[Zero Lock message — unlock required]")
  assert.deepEqual(mail.payload, sealedPayload)
  assert.ok(!JSON.stringify(mail).includes("password"))
  assert.ok(!JSON.stringify(mail).includes("cleartext_secret"))
})

// ── API send paths (send.ts) ────────────────────────────────────────────────────

for (const path of SEND_PATHS) {
  for (const mode of RECEIPT_MODES) {
    test(`send ${path}: receiptMode ${mode} is stored and honoured through delivery, receipt and first read`, async () => {
      const res = await SENDERS[path]({ receiptMode: mode })
      assert.equal(res.status, 201)
      const { messageId, deliveryToken } = await res.json()
      assert.deepEqual(await lifecycle(messageId, deliveryToken), EXPECTED[mode])
    })
  }

  test(`send ${path}: omitted receiptMode defaults to DELIVERY`, async () => {
    const res = await SENDERS[path]({})
    assert.equal(res.status, 201)
    const { messageId, deliveryToken } = await res.json()
    assert.deepEqual(await lifecycle(messageId, deliveryToken), EXPECTED.DELIVERY)
  })

  test(`send ${path}: invalid receiptMode is rejected with 400 before any side effect`, async () => {
    const res = await SENDERS[path]({ receiptMode: "INVALID_MODE" })
    assert.equal(res.status, 400)
    assert.equal((await res.json()).error, "invalid receipt mode")
    assert.equal(db.mail.size, 0)
    assert.equal(db.deliveryReceipt.size, 0)
    assert.equal(smtpSent.length, 0)
    for (const u of db.user.values()) assert.equal(u.messagesThisMonth, 0, `usage not counted for ${u.handle}`)
    assert.equal(db.agentToken.get("tok-1").deliveries, 0)
    assert.equal(db.sendToken.get("st-1").usedAt, null, "sendToken not consumed")
  })
}

test("parity: every send path behaves exactly like web compose for each receiptMode", async () => {
  for (const mode of [...RECEIPT_MODES, undefined]) {
    const outcomes: Record<string, any> = {}
    for (const [name, send] of Object.entries(SENDERS)) {
      seed() // fresh fixtures per sender (the send token is single-use)
      const res = await send(mode === undefined ? {} : { receiptMode: mode })
      assert.equal(res.status, 201, `${name} ${mode}`)
      const { messageId, deliveryToken } = await res.json()
      outcomes[name] = await lifecycle(messageId, deliveryToken)
    }
    for (const name of SEND_PATHS)
      assert.deepEqual(outcomes[name], outcomes["web compose"], `${name} differs from web compose for receiptMode ${mode ?? "(omitted)"}`)
  }
})

