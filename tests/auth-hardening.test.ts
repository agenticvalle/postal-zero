import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import express from "express"
import jwt from "jsonwebtoken"
import {
  requireUser,
  signAccess,
  signRefresh,
  issueAccessFromRefresh,
} from "../src/lib/auth"

// JWT secret lives only in this test process; never printed.
process.env.JWT_SECRET = "test_only_secret_do_not_print_" + "x".repeat(24)

// ── In-memory Session store (no Postgres) ───────────────────────────────────────
interface Row { userId: string; refreshToken: string; expiresAt: Date }
const sessions: Row[] = []
const users = new Set<string>()

const hasLiveSession = async (userId: string) =>
  sessions.some((s) => s.userId === userId && s.expiresAt > new Date())

const refreshDeps = {
  findSession: async (t: string) => {
    const s = sessions.find((x) => x.refreshToken === t)
    return s ? { userId: s.userId, expiresAt: s.expiresAt } : null
  },
  userExists: async (id: string) => users.has(id),
}

function login() {
  const userId = randomUUID()
  users.add(userId)
  const refreshToken = signRefresh(userId)
  const accessToken = signAccess(userId)
  sessions.push({ userId, refreshToken, expiresAt: new Date(Date.now() + 30 * 86400000) })
  return { userId, accessToken, refreshToken }
}
const logout = (refreshToken: string) => {
  for (let i = sessions.length - 1; i >= 0; i--)
    if (sessions[i].refreshToken === refreshToken) sessions.splice(i, 1)
}
const resetSessions = (userId: string) => {
  for (let i = sessions.length - 1; i >= 0; i--)
    if (sessions[i].userId === userId) sessions.splice(i, 1)
}

// ── Minimal app using the REAL requireUser gate ─────────────────────────────────
const app = express()
app.use(express.json())
app.get("/api/v1/mail", requireUser(hasLiveSession), (_req, res) => res.json({ ok: true, mail: [] }))

let base = ""
let server: ReturnType<typeof app.listen>

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      const port = typeof addr === "object" && addr ? addr.port : 0
      base = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const getMail = (token?: string) =>
  fetch(`${base}/api/v1/mail`, token ? { headers: { authorization: `Bearer ${token}` } } : undefined)

// ── Tests ───────────────────────────────────────────────────────────────────────

test("1. access token (typ=access) + live session → 200", async () => {
  const u = login()
  const res = await getMail(u.accessToken)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.ok, true)
})

test("2. refresh token on protected route → 401 (fails on old sub-only behavior)", async () => {
  const u = login() // user HAS a live session, so the only reason to reject is typ
  const res = await getMail(u.refreshToken)
  assert.equal(res.status, 401) // old jwt.verify+sub-only would have returned 200
})

test("3. after logout, issueAccessFromRefresh returns null", async () => {
  const u = login()
  logout(u.refreshToken)
  const minted = await issueAccessFromRefresh(u.refreshToken, refreshDeps)
  assert.equal(minted, null)
})

test("4. after password-reset (all sessions for userId deleted): refresh cannot mint AND prior access → 401", async () => {
  const u = login()
  resetSessions(u.userId)

  // refresh cannot mint a new access token
  const minted = await issueAccessFromRefresh(u.refreshToken, refreshDeps)
  assert.equal(minted, null)

  // sibling: the previously issued access token is now rejected on the protected route
  const res = await getMail(u.accessToken)
  assert.equal(res.status, 401)
})

test("5. forged token { sub } with no typ → 401 (fails on old behavior)", async () => {
  const u = login() // valid sub WITH a live session, so 401 can only be the missing typ
  const forged = jwt.sign({ sub: u.userId }, process.env.JWT_SECRET as string, { expiresIn: "8h" })
  const res = await getMail(forged)
  assert.equal(res.status, 401) // old behavior accepted any signed {sub} → 200
})

test("6. after logout: prior access token on protected route → 401", async () => {
  const u = login()
  logout(u.refreshToken)
  const res = await getMail(u.accessToken)
  assert.equal(res.status, 401)
})
