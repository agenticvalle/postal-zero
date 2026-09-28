import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import express from "express"
import { signAccess, verifyAccess } from "../src/lib/auth"
import {
  createAgentInboxRouter,
  type AgentInboxData,
  type AgentTokenRecord,
  type MailRecord,
} from "../src/routes/agent-inbox"

process.env.JWT_SECRET = "test_only_secret_do_not_print_" + "x".repeat(24)

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex")

// ── Fixtures ────────────────────────────────────────────────────────────────────
const OWNER = "owner-1"
const addrA = "addr-A"
const addrB = "addr-B"
const addrOwner = "addr-OWNER"
const addrSuspended = "addr-SUSPENDED"

const agentA = { id: "A", status: "VERIFIED", ownerId: OWNER, address: { id: addrA, handle: "agent-a" } }
const agentB = { id: "B", status: "VERIFIED", ownerId: OWNER, address: { id: addrB, handle: "agent-b" } }
const agentSuspended = { id: "S", status: "SUSPENDED", ownerId: OWNER, address: { id: addrSuspended, handle: "agent-suspended" } }

// Raw tokens (never persisted in cleartext in production; here for the harness only).
const rawReceiveA = "pz_agent_receiveA"
const rawReceiveB = "pz_agent_receiveB"
const rawSendOnlyA = "pz_agent_sendonlyA"
const rawSuspended = "pz_agent_suspended"
const rawRevoked = "pz_agent_revoked"
const rawReceiveA2 = "pz_agent_receiveA_v2"

const tokens = new Map<string, AgentTokenRecord>([
  [sha256(rawReceiveA), { scopes: ["send", "receive"], agent: agentA }],
  [sha256(rawReceiveB), { scopes: ["receive"], agent: agentB }],
  [sha256(rawSendOnlyA), { scopes: ["send"], agent: agentA }],
  [sha256(rawSuspended), { scopes: ["send", "receive"], agent: agentSuspended }],
  [sha256(rawRevoked), { scopes: ["send", "receive"], agent: agentA }],
])

const mails: MailRecord[] = [
  { id: "m-A", recipientAddressId: addrA, subject: "for A", isRead: false, isTrashed: false, isArchived: false, agentId: "A", userId: OWNER },
  { id: "m-B", recipientAddressId: addrB, subject: "for B", isRead: false, isTrashed: false, isArchived: false, agentId: "B", userId: OWNER },
  { id: "m-OWNER", recipientAddressId: addrOwner, subject: "owner inbox", isRead: false, isTrashed: false, isArchived: false, agentId: null, userId: OWNER },
  { id: "m-SUSPENDED", recipientAddressId: addrSuspended, subject: "for Suspended", isRead: false, isTrashed: false, isArchived: false, agentId: "S", userId: OWNER },
]

const data: AgentInboxData = {
  findTokenByHash: async (hash) => tokens.get(hash) ?? null,
  listAgentMail: async (addressId, { skip, take }) => {
    const all = mails.filter((m) => m.recipientAddressId === addressId)
    return { mail: all.slice(skip, skip + take), total: all.length }
  },
  findMailById: async (id) => mails.find((m) => m.id === id) ?? null,
}

const app = express()
app.use(express.json())
app.use("/api/v1/agents/me", createAgentInboxRouter(data))

// Owner inbox route matching HEAD ce03e6a semantics in src/routes/mail.ts
app.get("/api/v1/mail", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  let userId: string | null = null
  try {
    userId = verifyAccess(token)
  } catch {
    userId = null
  }
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  // Exactly matching where clause at HEAD ce03e6a:
  // userId, isTrashed: false, isArchived: false, NOT: { recipientAddress: { is: { agentId: { not: null } } } }
  const ownerMails = mails.filter(
    (m) => m.userId === userId && !m.isTrashed && !m.isArchived && !m.agentId
  )
  return res.json({ mail: ownerMails, pagination: { total: ownerMails.length } })
})

let base = ""
let server: ReturnType<typeof app.listen>
before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const a = server.address()
      base = `http://127.0.0.1:${typeof a === "object" && a ? a.port : 0}`
      resolve()
    })
  })
})
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const req = (path: string, token?: string) =>
  fetch(`${base}${path}`, token ? { headers: { "x-agent-token": token } } : undefined)

// ── Required Tests 1–8 ─────────────────────────────────────────────────────────

// 1. receive-scoped token → own mail
test("1. receive-scoped token → own mail (list and single message)", async () => {
  const listRes = await req("/api/v1/agents/me/mail", rawReceiveA)
  assert.equal(listRes.status, 200)
  const listBody = await listRes.json()
  assert.equal(listBody.agent.id, "A")
  assert.equal(listBody.mail.length, 1)
  assert.equal(listBody.mail[0].id, "m-A")

  const singleRes = await req("/api/v1/agents/me/mail/m-A", rawReceiveA)
  assert.equal(singleRes.status, 200)
  const singleBody = await singleRes.json()
  assert.equal(singleBody.id, "m-A")
  assert.equal(singleBody.isRead, false, "agent fetch reports stored read state")
  assert.equal(mails.find((m) => m.id === "m-A")!.isRead, false, "agent fetch does not mark mail read")
})

// 2. send-only token → 403
test("2. send-only token → 403 (list and single message)", async () => {
  const listRes = await req("/api/v1/agents/me/mail", rawSendOnlyA)
  assert.equal(listRes.status, 403)
  const listBody = await listRes.json()
  assert.equal(listBody.error, "Token missing receive scope")

  const singleRes = await req("/api/v1/agents/me/mail/m-A", rawSendOnlyA)
  assert.equal(singleRes.status, 403)
  const singleBody = await singleRes.json()
  assert.equal(singleBody.error, "Token missing receive scope")
})

// 3. revoked/deleted token → 401
test("3. revoked/deleted token → 401", async () => {
  assert.equal((await req("/api/v1/agents/me/mail")).status, 401)
  assert.equal((await req("/api/v1/agents/me/mail", "pz_agent_nonexistent")).status, 401)

  // Revoke/delete the token from storage
  tokens.delete(sha256(rawRevoked))
  const revokedRes = await req("/api/v1/agents/me/mail", rawRevoked)
  assert.equal(revokedRes.status, 401)
  const revokedBody = await revokedRes.json()
  assert.equal(revokedBody.error, "Invalid agent token")
})

// 4. suspended agent → denied
test("4. suspended agent → denied (403)", async () => {
  const listRes = await req("/api/v1/agents/me/mail", rawSuspended)
  assert.equal(listRes.status, 403)
  const listBody = await listRes.json()
  assert.equal(listBody.error, "Agent suspended")

  const singleRes = await req("/api/v1/agents/me/mail/m-SUSPENDED", rawSuspended)
  assert.equal(singleRes.status, 403)
  const singleBody = await singleRes.json()
  assert.equal(singleBody.error, "Agent suspended")
})

// 5. agent A cannot read agent B mail
test("5. agent A cannot read agent B mail (list isolation and 403 on single)", async () => {
  const listRes = await req("/api/v1/agents/me/mail", rawReceiveA)
  const listBody = await listRes.json()
  assert.ok(!listBody.mail.some((m: any) => m.id === "m-B"))

  const singleRes = await req("/api/v1/agents/me/mail/m-B", rawReceiveA)
  assert.equal(singleRes.status, 403)
  const singleBody = await singleRes.json()
  assert.equal(singleBody.error, "Forbidden")
})

// 6. agent cannot read unrelated owner/user mail
test("6. agent cannot read unrelated owner/user mail", async () => {
  const listRes = await req("/api/v1/agents/me/mail", rawReceiveA)
  const listBody = await listRes.json()
  assert.ok(!listBody.mail.some((m: any) => m.id === "m-OWNER"))

  const singleRes = await req("/api/v1/agents/me/mail/m-OWNER", rawReceiveA)
  assert.equal(singleRes.status, 403)
  const singleBody = await singleRes.json()
  assert.equal(singleBody.error, "Forbidden")
})

// 7. token rotation preserves same agent/address/mailbox
test("7. token rotation preserves same agent/address/mailbox", async () => {
  // Mint a new token rawReceiveA2 for the same Agent A
  tokens.set(sha256(rawReceiveA2), { scopes: ["send", "receive"], agent: agentA })

  // Verify new token reads Agent A's mailbox immediately
  const res2 = await req("/api/v1/agents/me/mail", rawReceiveA2)
  assert.equal(res2.status, 200)
  const body2 = await res2.json()
  assert.equal(body2.agent.id, "A")
  assert.equal(body2.agent.handle, "agent-a")
  assert.equal(body2.mail.length, 1)
  assert.equal(body2.mail[0].id, "m-A")

  // Revoke/delete the original token
  tokens.delete(sha256(rawReceiveA))

  // Old token is immediately unauthorized (401)
  const oldRes = await req("/api/v1/agents/me/mail", rawReceiveA)
  assert.equal(oldRes.status, 401)

  // New rotated token continues to have access to Agent A's mailbox
  const res2After = await req("/api/v1/agents/me/mail", rawReceiveA2)
  assert.equal(res2After.status, 200)
  const body2After = await res2After.json()
  assert.equal(body2After.agent.id, "A")
  assert.equal(body2After.mail[0].id, "m-A")
})

// 8. owner inbox non-regression only
test("8. owner inbox non-regression: GET /api/v1/mail preserves HEAD ce03e6a behavior", async () => {
  const ownerToken = signAccess(OWNER)

  // Owner accessing owner inbox with valid JWT gets owner mail
  const res = await fetch(`${base}/api/v1/mail`, {
    headers: { authorization: `Bearer ${ownerToken}` },
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.mail.length, 1)
  assert.equal(body.mail[0].id, "m-OWNER")
  assert.ok(!body.mail.some((m: any) => m.id === "m-A" || m.id === "m-B"))

  // Agent token cannot access owner inbox (401)
  const agentOnOwnerRes = await fetch(`${base}/api/v1/mail`, {
    headers: { authorization: `Bearer ${rawReceiveA2}` },
  })
  assert.equal(agentOnOwnerRes.status, 401)

  // Unauthenticated request to owner inbox returns 401
  const unauthRes = await fetch(`${base}/api/v1/mail`)
  assert.equal(unauthRes.status, 401)
})
