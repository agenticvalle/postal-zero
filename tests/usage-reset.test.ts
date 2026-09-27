import { test, before, after, beforeEach, mock } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import express from "express"

process.env.JWT_SECRET = "test_only_secret_do_not_print_" + "x".repeat(24)

// ── In-Memory Prisma Stand-in ───────────────────────────────────────────────────
// src/routes/send.ts, src/routes/compose.ts and src/lib/recipient.ts each build
// their own `new PrismaClient()` at load time. Installing this stand-in in the
// require cache before requiring them lets the real route code run unmodified.
interface UserRow {
  id: string
  handle: string
  displayName: string
  email: string
  plan: string
  messagesThisMonth: number
  usagePeriodStart: Date
}

const users = new Map<string, UserRow>()
const addresses = new Map<string, { id: string; handle: string; userId: string }>()
const mails: any[] = []

const pick = (row: any, select?: Record<string, any>) => {
  if (!row) return null
  if (!select) return { ...row }
  const out: any = {}
  for (const [k, v] of Object.entries(select)) if (v) out[k] = row[k]
  return out
}

const matches = (row: any, where: Record<string, any>) =>
  Object.entries(where).every(([k, v]) => (v instanceof Date ? row[k]?.getTime() === v.getTime() : row[k] === v))

class FakePrismaClient {
  session = {
    findFirst: async ({ where }: any) => (users.has(where.userId) ? { id: "session-" + where.userId } : null),
  }
  user = {
    findUnique: async ({ where, select }: any) => pick(users.get(where.id), select),
    update: async ({ where, data }: any) => {
      const u = users.get(where.id)!
      for (const [k, v] of Object.entries<any>(data)) (u as any)[k] = v?.increment !== undefined ? (u as any)[k] + v.increment : v
      return { ...u }
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0
      for (const u of users.values()) if (matches(u, where)) { Object.assign(u, data); count++ }
      return { count }
    },
  }
  address = {
    findUnique: async ({ where }: any) => {
      const a = [...addresses.values()].find((x) => x.handle === where.handle)
      return a ? { ...a, user: pick(users.get(a.userId), { id: true, displayName: true }), agent: null } : null
    },
  }
  mail = {
    create: async ({ data }: any) => {
      const m = { id: randomUUID(), deliveryToken: randomUUID(), deliveredAt: new Date(), ...data }
      mails.push(m)
      return m
    },
  }
  deliveryReceipt = { create: async ({ data }: any) => ({ id: randomUUID(), ...data }) }
  agentToken = { update: async () => ({}) }
  async $transaction(fn: (tx: any) => Promise<any>) { return fn(this) }
}

const prismaPath = require.resolve("@prisma/client")
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { PrismaClient: FakePrismaClient } } as any

// Real modules under test — required after the stub is installed.
/* eslint-disable @typescript-eslint/no-require-imports -- must load after the stub; hoisted imports would run first */
const { sendRouter } = require("../src/routes/send")
const { composeRouter } = require("../src/routes/compose")
const { signAccess } = require("../src/lib/auth")
const { currentPeriodStart, recordSend } = require("../src/lib/usage")
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Fixtures & App ──────────────────────────────────────────────────────────────
const NOW = new Date("2026-03-15T12:00:00.000Z")

const seed = (overrides: Partial<UserRow>) => {
  const alice: UserRow = {
    id: "user-alice", handle: "alice", displayName: "Alice", email: "alice@secret.com",
    plan: "FREE", messagesThisMonth: 0, usagePeriodStart: new Date("2026-03-01T09:00:00.000Z"),
    ...overrides,
  }
  users.set(alice.id, alice)
  users.set("user-bob", {
    id: "user-bob", handle: "bob", displayName: "Bob", email: "bob@secret.com",
    plan: "FREE", messagesThisMonth: 0, usagePeriodStart: new Date("2026-03-01T00:00:00.000Z"),
  })
  addresses.set("addr-bob", { id: "addr-bob", handle: "bob", userId: "user-bob" })
  return alice
}

beforeEach(() => {
  users.clear()
  addresses.clear()
  mails.length = 0
  mock.timers.reset()
  mock.timers.enable({ apis: ["Date"], now: NOW })
})

const app = express()
app.use(express.json())
app.use("/api/v1/send", sendRouter)
app.use("/api/v1/compose", composeRouter)

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
  mock.timers.reset()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const post = (path: string, userId: string, body: Record<string, unknown>) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${signAccess(userId)}` },
    body: JSON.stringify(body),
  })

const apiSend = (userId: string) => post("/api/v1/send/bob", userId, { subject: "Hi", body: "Hello" })
const webCompose = (userId: string) => post("/api/v1/compose/bob", userId, { subject: "Hi", body: "Hello" })

// ── (a) Expired period resets and advances ──────────────────────────────────────

test("a1. API send after the period expires resets the counter and advances usagePeriodStart by one month", async () => {
  seed({ messagesThisMonth: 57, usagePeriodStart: new Date("2026-02-10T09:00:00.000Z") })

  const res = await apiSend("user-alice")
  assert.equal(res.status, 201)

  const u = users.get("user-alice")!
  assert.equal(u.messagesThisMonth, 1, "counter restarts at 0 and counts this send")
  assert.equal(u.usagePeriodStart.toISOString(), "2026-03-10T09:00:00.000Z")
})

test("a2. A user blocked at the cap in an expired period can send again, and the period advances past skipped months", async () => {
  seed({ messagesThisMonth: 100, usagePeriodStart: new Date("2025-11-20T09:00:00.000Z") })

  const res = await apiSend("user-alice")
  assert.equal(res.status, 201, "expired period must not enforce the old count")

  const u = users.get("user-alice")!
  assert.equal(u.messagesThisMonth, 1)
  // Nov 20 -> Dec 20 -> Jan 20 -> Feb 20 (Mar 20 is still in the future)
  assert.equal(u.usagePeriodStart.toISOString(), "2026-02-20T09:00:00.000Z")
})

test("a3. Period boundary is creation-date relative and clamps short months", () => {
  const jan31 = new Date("2026-01-31T10:00:00.000Z")
  // Still inside the first period just before Feb 28 10:00
  assert.equal(currentPeriodStart(jan31, new Date("2026-02-28T09:59:59.999Z")).toISOString(), jan31.toISOString())
  // Rolls over exactly at the clamped anniversary
  assert.equal(currentPeriodStart(jan31, new Date("2026-02-28T10:00:00.000Z")).toISOString(), "2026-02-28T10:00:00.000Z")
  // Leap year clamps to Feb 29
  assert.equal(currentPeriodStart(new Date("2028-01-31T10:00:00.000Z"), new Date("2028-03-01T00:00:00.000Z")).toISOString(), "2028-02-29T10:00:00.000Z")
  // Multiple idle months measured from the stored start, not from the clamped months in between
  assert.equal(currentPeriodStart(jan31, new Date("2026-04-01T00:00:00.000Z")).toISOString(), "2026-03-31T10:00:00.000Z")
})

test("a4. A send that loses the reset race falls through to a plain increment instead of resetting twice", async () => {
  // Simulate: this send read the old start date, but a concurrent send already reset the row.
  seed({ messagesThisMonth: 1, usagePeriodStart: new Date("2026-03-10T09:00:00.000Z") })
  const stale = new FakePrismaClient()
  const realFindUnique = stale.user.findUnique
  stale.user.findUnique = async (args: any) => ({ ...(await realFindUnique(args)), usagePeriodStart: new Date("2026-02-10T09:00:00.000Z") })

  await recordSend(stale, "user-alice", NOW)

  const u = users.get("user-alice")!
  assert.equal(u.messagesThisMonth, 2)
  assert.equal(u.usagePeriodStart.toISOString(), "2026-03-10T09:00:00.000Z")
})

// ── (b) Within the period: no reset ─────────────────────────────────────────────

test("b1. API send within the period increments without resetting or moving the start date", async () => {
  seed({ messagesThisMonth: 42, usagePeriodStart: new Date("2026-02-20T09:00:00.000Z") })

  const res = await apiSend("user-alice")
  assert.equal(res.status, 201)

  const u = users.get("user-alice")!
  assert.equal(u.messagesThisMonth, 43)
  assert.equal(u.usagePeriodStart.toISOString(), "2026-02-20T09:00:00.000Z")
})

test("b2. The cap is still enforced within the period", async () => {
  seed({ messagesThisMonth: 100, usagePeriodStart: new Date("2026-02-20T09:00:00.000Z") })

  const res = await apiSend("user-alice")
  assert.equal(res.status, 402)

  const u = users.get("user-alice")!
  assert.equal(u.messagesThisMonth, 100)
  assert.equal(u.usagePeriodStart.toISOString(), "2026-02-20T09:00:00.000Z")
  assert.equal(mails.length, 0)
})

// ── (c) Web compose is still unmetered (unchanged behavior) ─────────────────────

test("c1. Web compose does not count toward usage, within an open period", async () => {
  seed({ messagesThisMonth: 42, usagePeriodStart: new Date("2026-02-20T09:00:00.000Z") })

  const res = await webCompose("user-alice")
  assert.equal(res.status, 201)

  const u = users.get("user-alice")!
  assert.equal(u.messagesThisMonth, 42)
  assert.equal(u.usagePeriodStart.toISOString(), "2026-02-20T09:00:00.000Z")
})

test("c2. Web compose neither resets an expired period nor is blocked at the cap", async () => {
  seed({ messagesThisMonth: 100, usagePeriodStart: new Date("2025-11-20T09:00:00.000Z") })

  const res = await webCompose("user-alice")
  assert.equal(res.status, 201)

  const u = users.get("user-alice")!
  assert.equal(u.messagesThisMonth, 100)
  assert.equal(u.usagePeriodStart.toISOString(), "2025-11-20T09:00:00.000Z")
  assert.equal(mails.length, 1)
})
