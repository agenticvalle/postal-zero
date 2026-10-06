import { test, before, after, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import express from "express"
import { signAccess } from "../src/lib/auth"
import {
  createAgentInboxRouter,
  makePrismaAgentInboxData,
  encodeCursor,
  decodeCursor,
} from "../src/routes/agent-inbox"

process.env.JWT_SECRET = "test_only_secret_do_not_print_" + "x".repeat(24)

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex")

// ── Fake Prisma client ──────────────────────────────────────────────────────────
// The real makePrismaAgentInboxData runs against this. It interprets the exact
// where/orderBy/select/skip/take shapes the data layer emits (and throws on any
// operator it does not understand), records every query, and rejects any write.
type Row = Record<string, any>
type ModelName = "user" | "agent" | "agentToken" | "address" | "mail" | "deliveryReceipt"
let db: Record<ModelName, Row[]>
let calls: { model: ModelName; op: string; args: any }[]
let writes: { model: string; op: string }[]
let failMail: boolean

const DB_ERROR = "connection to server at 10.0.0.5 failed: password authentication failed for user postgres"

const relations: Partial<Record<ModelName, Record<string, (row: Row) => [ModelName, Row | null]>>> = {
  agentToken: { agent: (t) => ["agent", db.agent.find((a) => a.id === t.agentId) ?? null] },
  agent: { address: (a) => ["address", db.address.find((x) => x.agentId === a.id) ?? null] },
}

function pick(model: ModelName, row: Row | undefined | null, select?: Row): Row | null {
  if (!row) return null
  if (!select) return { ...row }
  const out: Row = {}
  for (const [k, v] of Object.entries(select)) {
    if (!v) continue
    const rel = relations[model]?.[k]
    if (rel) {
      const [target, related] = rel(row)
      out[k] = pick(target, related, v === true ? undefined : v.select)
    } else out[k] = row[k]
  }
  return out
}

const cmp = (a: any, b: any) =>
  a instanceof Date ? a.getTime() - b.getTime() : a < b ? -1 : a > b ? 1 : 0

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Row[]).some((w) => matches(row, w))
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const ops = Object.keys(v)
      if (ops.length !== 1 || ops[0] !== "gt") throw new Error(`fake prisma: unsupported where.${k}`)
      return cmp(row[k], v.gt) > 0
    }
    return v instanceof Date ? row[k]?.getTime() === v.getTime() : row[k] === v
  })
}

function sortRows(rows: Row[], orderBy: any): Row[] {
  const keys = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []).flatMap((o: Row) => Object.entries(o))
  return [...rows].sort((a, b) => {
    for (const [k, dir] of keys) {
      const c = cmp(a[k], b[k])
      if (c) return dir === "desc" ? -c : c
    }
    return 0
  })
}

function model(name: ModelName) {
  const read = (op: string, fn: (args: any) => any) => async (args: any = {}) => {
    calls.push({ model: name, op, args })
    if (failMail && name === "mail") throw new Error(DB_ERROR)
    return fn(args)
  }
  const find = (a: any) => pick(name, db[name].find((r) => matches(r, a.where)), a.select)
  const delegate: Row = {
    findUnique: read("findUnique", find),
    findFirst: read("findFirst", find),
    findMany: read("findMany", (a) => {
      const skip = a.skip ?? 0
      return sortRows(db[name].filter((r) => matches(r, a.where)), a.orderBy)
        .slice(skip, skip + (a.take ?? Infinity))
        .map((r) => pick(name, r, a.select))
    }),
    count: read("count", (a) => db[name].filter((r) => matches(r, a.where)).length),
  }
  for (const op of ["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"])
    delegate[op] = async () => {
      writes.push({ model: name, op })
      throw new Error("fake prisma: write attempted")
    }
  return delegate
}

const rawWrite = (op: string) => async () => {
  writes.push({ model: "$client", op })
  throw new Error("fake prisma: write attempted")
}
const fakePrisma: any = {
  user: model("user"),
  agent: model("agent"),
  agentToken: model("agentToken"),
  address: model("address"),
  mail: model("mail"),
  deliveryReceipt: model("deliveryReceipt"),
  $transaction: rawWrite("$transaction"),
  $executeRaw: rawWrite("$executeRaw"),
  $executeRawUnsafe: rawWrite("$executeRawUnsafe"),
}

// ── Fixtures (rebuilt before every test) ────────────────────────────────────────
const OWNER = "owner-1"
const RAW_RECEIVE_A = "pz_agent_receiveA"
const RAW_RECEIVE_A2 = "pz_agent_receiveA_v2"
const RAW_RECEIVE_B = "pz_agent_receiveB"
const RAW_SEND_ONLY_A = "pz_agent_sendonlyA"
const RAW_SUSPENDED = "pz_agent_suspended"
const RAW_NO_ADDRESS = "pz_agent_noaddress"

const T0 = new Date("2026-09-01T10:00:00.000Z")
const T05 = new Date("2026-09-01T10:30:00.000Z")
const T1 = new Date("2026-09-01T11:00:00.000Z")
const T15 = new Date("2026-09-01T11:30:00.000Z")
const T2 = new Date("2026-09-01T12:00:00.000Z")
const T3 = new Date("2026-09-01T13:00:00.000Z")

// Agent A's visible mail in (createdAt ASC, id ASC) order. m-a2 and m-a3 share T1.
const A_ORDER = ["m-a1", "m-a2", "m-a3", "m-a4"]

const mail = (id: string, recipientAddressId: string, createdAt: Date, extra: Row = {}): Row => ({
  id, recipientAddressId, userId: OWNER, createdAt, deliveredAt: createdAt, subject: `subject ${id}`,
  body: `body ${id}`, bodyPreview: `body ${id}`, senderName: "Sender", senderHandle: "sender",
  senderVerified: true, mailType: "AGENT", payload: null, isRead: false, isStarred: false,
  isTrashed: false, isArchived: false, aiSummary: null, aiUrgency: "NORMAL",
  deliveryToken: `dt-${id}`, receiptMode: "OPENED", readAt: null, ...extra,
})

beforeEach(() => {
  calls = []
  writes = []
  failMail = false
  const token = (agentId: string, raw: string, scopes: string[]) =>
    ({ id: `tok-${raw}`, agentId, tokenHash: sha256(raw), scopes, deliveries: 0, lastUsed: null })
  db = {
    user: [{ id: OWNER, plan: "FREE", messagesThisMonth: 3, usagePeriodStart: T0 }],
    agent: [
      { id: "A", ownerId: OWNER, status: "VERIFIED" },
      { id: "B", ownerId: OWNER, status: "VERIFIED" },
      { id: "S", ownerId: OWNER, status: "SUSPENDED" },
      { id: "N", ownerId: OWNER, status: "VERIFIED" },
    ],
    address: [
      { id: "addr-A", handle: "agent-a", agentId: "A", userId: null },
      { id: "addr-B", handle: "agent-b", agentId: "B", userId: null },
      { id: "addr-S", handle: "agent-s", agentId: "S", userId: null },
      { id: "addr-OWNER", handle: "owner", agentId: null, userId: OWNER },
    ],
    agentToken: [
      token("A", RAW_RECEIVE_A, ["send", "receive"]),
      token("B", RAW_RECEIVE_B, ["receive"]),
      token("A", RAW_SEND_ONLY_A, ["send"]),
      token("S", RAW_SUSPENDED, ["send", "receive"]),
      token("N", RAW_NO_ADDRESS, ["receive"]),
    ],
    mail: [
      mail("m-a1", "addr-A", T0),
      // Inserted before m-a2 on purpose: equal createdAt must order by id, not insertion.
      mail("m-a3", "addr-A", T1),
      mail("m-a2", "addr-A", T1),
      mail("m-a4", "addr-A", T2, { isRead: true }),
      mail("m-a-trashed", "addr-A", T15, { isTrashed: true }),
      mail("m-a-archived", "addr-A", T15, { isArchived: true }),
      mail("m-b1", "addr-B", T05),
      mail("m-b2", "addr-B", T3),
      mail("m-owner", "addr-OWNER", T1),
      mail("m-s1", "addr-S", T1),
    ],
    deliveryReceipt: [{ id: "r-a1", mailId: "m-a1", event: "DELIVERED", signature: "sig" }],
  }
})

// ── Test app: real router over the real Prisma data layer ───────────────────────
const app = express()
app.use(express.json())
app.use("/api/v1/agents/me", createAgentInboxRouter(makePrismaAgentInboxData(fakePrisma)))

let base = ""
let server: ReturnType<typeof app.listen>
let unhandled = 0
const onUnhandled = () => { unhandled++ }
before(async () => {
  process.on("unhandledRejection", onUnhandled)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const a = server.address()
      base = `http://127.0.0.1:${typeof a === "object" && a ? a.port : 0}`
      resolve()
    })
  })
})
after(async () => {
  process.off("unhandledRejection", onUnhandled)
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const get = (path: string, token?: string, headers: Record<string, string> = {}) =>
  fetch(`${base}/api/v1/agents/me${path}`, { headers: { ...(token ? { "x-agent-token": token } : {}), ...headers } })

const ids = (body: any) => body.mail.map((m: any) => m.id)

async function pollAll(token: string, limit: number, between?: (round: number) => void) {
  const seen: string[] = []
  let cursor = ""
  for (let round = 0; round < 50; round++) {
    const res = await get(`/mail?cursor=${encodeURIComponent(cursor)}&limit=${limit}`, token)
    assert.equal(res.status, 200)
    const body = await res.json()
    seen.push(...ids(body))
    cursor = body.cursor.next
    if (!body.cursor.hasMore) return { seen, cursor }
    between?.(round)
  }
  throw new Error("cursor pagination did not terminate")
}

// Every mail query the data layer issued must be scoped to this address.
const assertMailQueriesScopedTo = (addressId: string) => {
  const listQueries = calls.filter((c) => c.model === "mail" && (c.op === "findMany" || c.op === "count"))
  assert.ok(listQueries.length > 0, "expected list queries")
  for (const c of listQueries) assert.equal(c.args.where.recipientAddressId, addressId)
}

// ── Authentication and scope ────────────────────────────────────────────────────

test("receive-scoped token can receive (list and single message)", async () => {
  const listRes = await get("/mail", RAW_RECEIVE_A)
  assert.equal(listRes.status, 200)
  const listBody = await listRes.json()
  assert.deepEqual(listBody.agent, { id: "A", handle: "agent-a", address: "agent-a@postal.zero" })
  assert.deepEqual(new Set(ids(listBody)), new Set(A_ORDER))
  assert.equal(listBody.pagination.total, 4)

  const singleRes = await get("/mail/m-a1", RAW_RECEIVE_A)
  assert.equal(singleRes.status, 200)
  const single = await singleRes.json()
  assert.equal(single.id, "m-a1")
  assert.equal(single.body, "body m-a1")
  assert.equal(single.isRead, false, "reports stored read state")
  assert.deepEqual(single.recipient, { agentId: "A", handle: "agent-a", address: "agent-a@postal.zero" })
  assert.ok(!("isTrashed" in single) && !("isArchived" in single), "visibility flags stay internal")
})

test("send-only token cannot receive (list, cursor, single)", async () => {
  for (const path of ["/mail", "/mail?cursor=", "/mail/m-a1"]) {
    const res = await get(path, RAW_SEND_ONLY_A)
    assert.equal(res.status, 403, path)
    assert.equal((await res.json()).error, "Token missing receive scope")
  }
  assert.equal(calls.filter((c) => c.model === "mail").length, 0, "no mail read before authorization")
})

test("missing, unknown, and revoked tokens → 401", async () => {
  assert.equal((await get("/mail")).status, 401)
  assert.equal((await get("/mail", "pz_agent_nonexistent")).status, 401)

  db.agentToken = db.agentToken.filter((t) => t.tokenHash !== sha256(RAW_RECEIVE_A))
  const res = await get("/mail", RAW_RECEIVE_A)
  assert.equal(res.status, 401)
  assert.equal((await res.json()).error, "Invalid agent token")
})

test("suspended agent → 403", async () => {
  for (const path of ["/mail", "/mail/m-s1"]) {
    const res = await get(path, RAW_SUSPENDED)
    assert.equal(res.status, 403)
    assert.equal((await res.json()).error, "Agent suspended")
  }
})

test("agent with no address → 409", async () => {
  for (const path of ["/mail", "/mail?cursor=", "/mail/m-a1"]) {
    const res = await get(path, RAW_NO_ADDRESS)
    assert.equal(res.status, 409, path)
    assert.equal((await res.json()).error, "Agent has no address")
  }
})

test("owner JWT cannot use the agent receive route", async () => {
  const bearer = { authorization: `Bearer ${signAccess(OWNER)}` }
  for (const path of ["/mail", "/mail?cursor=", "/mail/m-a1"]) {
    const res = await get(path, undefined, bearer)
    assert.equal(res.status, 401, path)
    assert.equal((await res.json()).error, "Agent token required")
  }
  assert.equal(calls.filter((c) => c.model === "mail").length, 0)
})

test("token rotation preserves the same agent/address/mailbox", async () => {
  db.agentToken.push({ id: "tok-a2", agentId: "A", tokenHash: sha256(RAW_RECEIVE_A2), scopes: ["receive"] })
  const before = await (await get("/mail", RAW_RECEIVE_A2)).json()
  assert.equal(before.agent.id, "A")
  assert.deepEqual(new Set(ids(before)), new Set(A_ORDER))

  db.agentToken = db.agentToken.filter((t) => t.tokenHash !== sha256(RAW_RECEIVE_A))
  assert.equal((await get("/mail", RAW_RECEIVE_A)).status, 401)
  const afterRotation = await (await get("/mail", RAW_RECEIVE_A2)).json()
  assert.deepEqual(new Set(ids(afterRotation)), new Set(A_ORDER))
})

// ── Mailbox isolation ───────────────────────────────────────────────────────────

test("agent A cannot list agent B, owner, or other agents' mail", async () => {
  const body = await (await get("/mail?limit=100", RAW_RECEIVE_A)).json()
  for (const foreign of ["m-b1", "m-b2", "m-owner", "m-s1"]) assert.ok(!ids(body).includes(foreign), foreign)
  assertMailQueriesScopedTo("addr-A")
})

test("agent A cannot fetch agent B or owner mail by ID → 403", async () => {
  for (const id of ["m-b1", "m-owner"]) {
    const res = await get(`/mail/${id}`, RAW_RECEIVE_A)
    assert.equal(res.status, 403, id)
    assert.deepEqual(await res.json(), { error: "Forbidden" })
  }
  assert.equal((await get("/mail/m-missing", RAW_RECEIVE_A)).status, 404)
})

test("isolation holds when a cursor is supplied", async () => {
  // From the start, a later-than-everything foreign cursor, and an epoch cursor.
  const foreignCursor = encodeCursor({ createdAt: T05, id: "m-b1" })
  const epochCursor = encodeCursor({ createdAt: new Date(0), id: "0" })
  for (const cursor of ["", foreignCursor, epochCursor]) {
    const body = await (await get(`/mail?cursor=${cursor}&limit=100`, RAW_RECEIVE_A)).json()
    for (const m of ids(body)) assert.ok(A_ORDER.includes(m), `${m} leaked with cursor ${cursor || "<start>"}`)
  }
  const afterForeign = await (await get(`/mail?cursor=${foreignCursor}&limit=100`, RAW_RECEIVE_A)).json()
  assert.deepEqual(ids(afterForeign), ["m-a2", "m-a3", "m-a4"])

  // Agent B's own poll never returns A's mail either.
  const { seen } = await pollAll(RAW_RECEIVE_B, 1)
  assert.deepEqual(seen, ["m-b1", "m-b2"])
  assert.ok(calls.some((c) => c.args?.where?.recipientAddressId === "addr-A"))
  assert.ok(calls.some((c) => c.args?.where?.recipientAddressId === "addr-B"))
  for (const c of calls.filter((c) => c.model === "mail" && c.op === "findMany"))
    assert.ok(["addr-A", "addr-B"].includes(c.args.where.recipientAddressId))
})

// ── Direct lookup visibility ────────────────────────────────────────────────────

test("trashed direct lookup → 404", async () => {
  const res = await get("/mail/m-a-trashed", RAW_RECEIVE_A)
  assert.equal(res.status, 404)
  assert.deepEqual(await res.json(), { error: "Mail not found" })
})

test("archived direct lookup → 404", async () => {
  const res = await get("/mail/m-a-archived", RAW_RECEIVE_A)
  assert.equal(res.status, 404)
  assert.deepEqual(await res.json(), { error: "Mail not found" })
})

test("trashed/archived mail is also absent from page and cursor lists", async () => {
  const page = await (await get("/mail?limit=100", RAW_RECEIVE_A)).json()
  const { seen } = await pollAll(RAW_RECEIVE_A, 100)
  for (const hidden of ["m-a-trashed", "m-a-archived"]) {
    assert.ok(!ids(page).includes(hidden))
    assert.ok(!seen.includes(hidden))
  }
})

// ── Error safety ────────────────────────────────────────────────────────────────

test("thrown data layer → generic 500 without internal error text", async () => {
  failMail = true
  for (const path of ["/mail", "/mail?cursor=", "/mail/m-a1"]) {
    const res = await get(path, RAW_RECEIVE_A)
    assert.equal(res.status, 500, path)
    const text = await res.text()
    assert.deepEqual(JSON.parse(text), { error: "Failed to load agent mail" })
    for (const leak of ["postgres", "10.0.0.5", "password", "connection"]) assert.ok(!text.includes(leak), leak)
  }
})

test("handler and process remain usable after a thrown data-layer error", async () => {
  const unhandledBefore = unhandled
  failMail = true
  assert.equal((await get("/mail", RAW_RECEIVE_A)).status, 500)
  assert.equal((await get("/mail?cursor=", RAW_RECEIVE_A)).status, 500)
  assert.equal((await get("/mail/m-a1", RAW_RECEIVE_A)).status, 500)
  failMail = false

  assert.equal((await get("/mail", RAW_RECEIVE_A)).status, 200)
  assert.equal((await get("/mail?cursor=", RAW_RECEIVE_A)).status, 200)
  assert.equal((await get("/mail/m-a1", RAW_RECEIVE_A)).status, 200)
  await new Promise((r) => setImmediate(r))
  assert.equal(unhandled, unhandledBefore, "no unhandled rejections")
})

// ── Cursor pagination ───────────────────────────────────────────────────────────

test("cursor pagination neither repeats nor skips rows, at every page size", async () => {
  for (const limit of [1, 2, 3, 4, 100]) {
    const { seen } = await pollAll(RAW_RECEIVE_A, limit)
    assert.deepEqual(seen, A_ORDER, `limit=${limit}`)
    assert.equal(new Set(seen).size, seen.length, `no repeats at limit=${limit}`)
  }
})

test("cursor pagination picks up mail delivered between polls exactly once", async () => {
  const { seen, cursor } = await pollAll(RAW_RECEIVE_A, 2, (round) => {
    if (round === 0) db.mail.push(mail("m-a5", "addr-A", T3))
  })
  assert.deepEqual(seen, [...A_ORDER, "m-a5"])

  // Caught up: an empty page echoes the cursor so the loop can keep polling.
  const idle = await (await get(`/mail?cursor=${cursor}`, RAW_RECEIVE_A)).json()
  assert.deepEqual(idle.mail, [])
  assert.deepEqual(idle.cursor, { next: cursor, hasMore: false })

  db.mail.push(mail("m-a6", "addr-A", T3))
  const next = await (await get(`/mail?cursor=${cursor}`, RAW_RECEIVE_A)).json()
  assert.deepEqual(ids(next), ["m-a6"])
})

test("identical createdAt values are returned in deterministic id order", async () => {
  for (let i = 0; i < 3; i++) {
    const body = await (await get("/mail?cursor=&limit=100", RAW_RECEIVE_A)).json()
    assert.deepEqual(ids(body), A_ORDER, "m-a2 precedes m-a3 despite later insertion")
  }
})

test("second equal-timestamp message is not skipped by the cursor", async () => {
  const first = await (await get("/mail?cursor=&limit=2", RAW_RECEIVE_A)).json()
  assert.deepEqual(ids(first), ["m-a1", "m-a2"])
  assert.equal(first.cursor.hasMore, true)
  const decoded = decodeCursor(first.cursor.next)!
  assert.equal(decoded.id, "m-a2")
  assert.equal(decoded.createdAt.getTime(), T1.getTime(), "cursor sits inside the T1 tie")

  const second = await (await get(`/mail?cursor=${first.cursor.next}&limit=2`, RAW_RECEIVE_A)).json()
  assert.deepEqual(ids(second), ["m-a3", "m-a4"], "m-a3 shares createdAt with the cursor and is still returned")
})

test("cursor list items keep the page-mode item shape", async () => {
  const page = await (await get("/mail?limit=100", RAW_RECEIVE_A)).json()
  const cursor = await (await get("/mail?cursor=&limit=100", RAW_RECEIVE_A)).json()
  assert.deepEqual(Object.keys(cursor.mail[0]).sort(), Object.keys(page.mail[0]).sort())
  assert.ok(!("createdAt" in cursor.mail[0]))
  assert.ok(!("pagination" in cursor))
})

test("malformed cursor → 400 before any mail query", async () => {
  const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url")
  const valid = encodeCursor({ createdAt: T1, id: "m-a2" })
  const bad = [
    "not base64!!",
    "%%%",
    b64("garbage"),
    b64("2026-09-01T11:00:00.000Z"),                  // no id
    b64("2026-09-01T11:00:00.000Z|"),                 // empty id
    b64("2026-09-01T11:00:00Z|m-a2"),                 // not millisecond ISO
    b64("2026-13-45T99:00:00.000Z|m-a2"),             // impossible date
    b64("2026-02-30T11:00:00.000Z|m-a2"),             // rolls over, not canonical
    b64("2026-09-01T11:00:00.000Z|m a2"),             // id charset
    b64("2026-09-01T11:00:00.000Z|" + "x".repeat(65)),
    b64("2026-09-01T11:00:00.000Z|m-a2|extra"),
    valid + "=",                                      // padding is not part of the format
    valid + "A",
    "A".repeat(201),
  ]
  for (const cursor of bad) {
    const res = await get(`/mail?cursor=${encodeURIComponent(cursor)}`, RAW_RECEIVE_A)
    assert.equal(res.status, 400, cursor)
    assert.deepEqual(await res.json(), { error: "Invalid cursor" })
  }
  const repeated = await get(`/mail?cursor=${valid}&cursor=${valid}`, RAW_RECEIVE_A)
  assert.equal(repeated.status, 400)
  const nested = await get(`/mail?cursor[x]=1`, RAW_RECEIVE_A)
  assert.equal(nested.status, 400)
  const withPage = await get(`/mail?cursor=${valid}&page=2`, RAW_RECEIVE_A)
  assert.equal(withPage.status, 400)
  assert.deepEqual(await withPage.json(), { error: "cursor cannot be combined with page" })

  assert.equal(calls.filter((c) => c.model === "mail").length, 0)
})

test("cursor encode/decode round-trips (createdAt, id)", () => {
  const c = { createdAt: new Date("2026-09-01T11:00:00.123Z"), id: "3f1c2b9e-0d4a-4c6e-9a1b-2c3d4e5f6a7b" }
  const wire = encodeCursor(c)
  assert.match(wire, /^[A-Za-z0-9_-]+$/)
  assert.equal(Buffer.from(wire, "base64url").toString("utf8"), "2026-09-01T11:00:00.123Z|3f1c2b9e-0d4a-4c6e-9a1b-2c3d4e5f6a7b")
  assert.deepEqual(decodeCursor(wire), c)
})

// ── Receive is read-only ────────────────────────────────────────────────────────

// Every receive path: page list, cursor polling, own/foreign/hidden direct fetches.
async function exerciseReceive() {
  await get("/mail?limit=100", RAW_RECEIVE_A)
  await pollAll(RAW_RECEIVE_A, 1)
  for (const id of [...A_ORDER, "m-a-trashed", "m-b1", "m-owner"]) await get(`/mail/${id}`, RAW_RECEIVE_A)
  await pollAll(RAW_RECEIVE_B, 1)
}

const snapshot = () => JSON.stringify(db)

test("receive creates no receipt", async () => {
  const receiptsBefore = JSON.stringify(db.deliveryReceipt)
  await exerciseReceive()
  assert.equal(JSON.stringify(db.deliveryReceipt), receiptsBefore)
  assert.deepEqual(writes, [], "no write of any kind was attempted")
  assert.equal(calls.filter((c) => c.model === "deliveryReceipt").length, 0)
})

test("receive changes no owner read state", async () => {
  await exerciseReceive()
  const state = Object.fromEntries(db.mail.map((m) => [m.id, [m.isRead, m.readAt]]))
  for (const id of ["m-a1", "m-a2", "m-a3", "m-b1", "m-owner"]) assert.deepEqual(state[id], [false, null], id)
  assert.deepEqual(state["m-a4"], [true, null], "owner-set isRead preserved")
  assert.deepEqual(writes, [])
})

test("receive increments no plan/message usage", async () => {
  const before = snapshot()
  await exerciseReceive()
  assert.equal(db.user[0].messagesThisMonth, 3)
  assert.equal(db.agentToken.every((t) => t.deliveries === 0 && t.lastUsed === null), true)
  assert.equal(snapshot(), before, "database unchanged")
  assert.equal(calls.filter((c) => c.model === "user").length, 0)
})

// ── Production data layer query shapes ──────────────────────────────────────────

const LIST_SELECT = {
  id: true, subject: true, senderName: true, senderHandle: true, senderVerified: true,
  bodyPreview: true, payload: true, mailType: true, isRead: true, isStarred: true,
  aiSummary: true, aiUrgency: true, deliveredAt: true,
}

test("makePrismaAgentInboxData page query is scoped by recipientAddressId", async () => {
  const data = makePrismaAgentInboxData(fakePrisma)
  await data.listAgentMail("addr-A", { skip: 5, take: 10 })
  const where = { recipientAddressId: "addr-A", isTrashed: false, isArchived: false }
  assert.deepEqual(calls, [
    { model: "mail", op: "findMany", args: { where, skip: 5, take: 10, orderBy: { createdAt: "desc" }, select: LIST_SELECT } },
    { model: "mail", op: "count", args: { where } },
  ])

  calls = []
  await data.findMailById("m-a1")
  assert.equal(calls[0].args.select.recipientAddressId, true, "direct fetch selects the isolation key")
  assert.equal(calls[0].args.select.isTrashed, true)
  assert.equal(calls[0].args.select.isArchived, true)
})

test("makePrismaAgentInboxData cursor query keeps recipientAddressId and uses (createdAt, id)", async () => {
  const data = makePrismaAgentInboxData(fakePrisma)
  const select = { ...LIST_SELECT, createdAt: true }
  const orderBy = [{ createdAt: "asc" }, { id: "asc" }]

  await data.listAgentMailAfter("addr-A", { after: { createdAt: T1, id: "m-a2" }, take: 3 })
  assert.deepEqual(calls, [{
    model: "mail",
    op: "findMany",
    args: {
      where: {
        recipientAddressId: "addr-A",
        isTrashed: false,
        isArchived: false,
        OR: [
          { createdAt: { gt: T1 } },
          { createdAt: T1, id: { gt: "m-a2" } },
        ],
      },
      take: 3,
      orderBy,
      select,
    },
  }])

  calls = []
  await data.listAgentMailAfter("addr-A", { after: null, take: 3 })
  assert.deepEqual(calls[0].args, {
    where: { recipientAddressId: "addr-A", isTrashed: false, isArchived: false },
    take: 3,
    orderBy,
    select,
  })
})
