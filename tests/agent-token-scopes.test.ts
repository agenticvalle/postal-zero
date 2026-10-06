import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import express from "express"
import { resolveTokenScopes } from "../src/routes/agents"
import { createAgentInboxRouter, type AgentInboxData } from "../src/routes/agent-inbox"

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex")

test("A: default is send-only (empty body)", () => {
  assert.deepEqual(resolveTokenScopes({}), { scopes: ["send"] })
})

test("A2: default is send-only (undefined body or scopes)", () => {
  assert.deepEqual(resolveTokenScopes(undefined), { scopes: ["send"] })
  assert.deepEqual(resolveTokenScopes({ label: "test" }), { scopes: ["send"] })
})

test("B: opt-in receive only", () => {
  assert.deepEqual(resolveTokenScopes({ scopes: ["receive"] }), { scopes: ["receive"] })
})

test("C: opt-in send + receive", () => {
  assert.deepEqual(resolveTokenScopes({ scopes: ["send", "receive"] }), { scopes: ["send", "receive"] })
})

test("D1: invalid scope is rejected", () => {
  assert.deepEqual(resolveTokenScopes({ scopes: ["admin"] }), { error: "scopes may only contain send or receive" })
  assert.deepEqual(resolveTokenScopes({ scopes: ["send", "unknown"] }), { error: "scopes may only contain send or receive" })
})

test("D2: empty scopes array is rejected", () => {
  assert.deepEqual(resolveTokenScopes({ scopes: [] }), { error: "scopes must not be empty" })
})

test("D3: non-array scopes is rejected", () => {
  assert.deepEqual(resolveTokenScopes({ scopes: "send" }), { error: "scopes must be an array" })
  assert.deepEqual(resolveTokenScopes({ scopes: 123 }), { error: "scopes must be an array" })
})

test("D4: duplicate scopes are deduplicated", () => {
  assert.deepEqual(resolveTokenScopes({ scopes: ["send", "send", "receive"] }), { scopes: ["send", "receive"] })
  assert.deepEqual(resolveTokenScopes({ scopes: ["receive", "receive"] }), { scopes: ["receive"] })
})

const agentA = { id: "A", status: "VERIFIED", ownerId: "owner-1", address: { id: "addr-A", handle: "a" } }
const rawSendOnly = "pz_agent_old_sendonly"

const data: AgentInboxData = {
  findTokenByHash: async (hash) =>
    hash === sha256(rawSendOnly) ? { scopes: ["send"], agent: agentA } : null,
  listAgentMail: async () => ({ mail: [], total: 0 }),
  listAgentMailAfter: async () => [],
  findMailById: async () => null,
}

const app = express()
app.use(express.json())
app.use("/api/v1/agents/me", createAgentInboxRouter(data))

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

test("E: old send-only AgentToken 403s on GET /api/v1/agents/me/mail", async () => {
  const res = await fetch(`${base}/api/v1/agents/me/mail`, {
    headers: { "x-agent-token": rawSendOnly },
  })
  assert.equal(res.status, 403)
  const body = await res.json()
  assert.equal(body.error, "Token missing receive scope")
})
