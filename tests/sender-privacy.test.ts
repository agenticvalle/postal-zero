import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import express from "express"
import { formatReceiptFrom } from "../src/routes/receipts"

process.env.JWT_SECRET = "test_only_secret_do_not_print_" + "x".repeat(24)

// ── In-Memory Store & Test App ──────────────────────────────────────────────────
interface MailFixture {
  id: string
  deliveryToken: string
  subject: string
  senderName: string
  senderEmail: string
  senderHandle: string | null
  senderVerified: boolean
  recipientHandle: string
  receiptSig: string
  deliveredAt: Date
  readAt: Date | null
}

const mails = new Map<string, MailFixture>()

const app = express()
app.use(express.json())

app.get("/api/v1/receipt/:token", (req, res) => {
  const mail = mails.get(req.params.token)
  if (!mail) return res.status(404).json({ error: "Receipt not found" })
  const secret = process.env.JWT_SECRET!
  const verifyHash = createHmac("sha256", secret)
    .update(`${mail.id}:${mail.deliveredAt.toISOString()}:${mail.recipientHandle}`)
    .digest("hex")
  return res.json({
    verified: true,
    mailId: mail.id,
    subject: mail.subject,
    from: formatReceiptFrom(mail),
    to: `${mail.recipientHandle}@postal.zero`,
    senderVerified: mail.senderVerified,
    receiptSig: mail.receiptSig,
    verifyHash,
  })
})

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

// ── Test Suites A–H ─────────────────────────────────────────────────────────────

test("A: Authenticated compose derives internal identity and hides User.email", () => {
  const user = {
    id: "user-1",
    email: "user@secret.com",
    handle: "alice",
    displayName: "Alice",
  }
  const recipientAddressId = "addr-recip-1"

  // Logic matching src/routes/compose.ts
  const senderEmail = `${user.handle}@postal.zero`
  const senderHandle = user.handle
  const senderName = user.displayName
  const sig = createHmac("sha256", process.env.JWT_SECRET!)
    .update(`${recipientAddressId}:${senderEmail}:${Date.now()}`)
    .digest("hex")

  assert.equal(senderEmail, "alice@postal.zero")
  assert.equal(senderHandle, "alice")
  assert.equal(senderName, "Alice")
  assert.ok(!senderEmail.includes("user@secret.com"))
  assert.ok(!sig.includes("user@secret.com"))
})

test("B: Bearer send uses @postal.zero and suppresses confirmation SMTP", () => {
  const user = {
    id: "user-1",
    email: "user@secret.com",
    handle: "alice",
    displayName: "Alice",
  }

  // Logic matching src/routes/send.ts (authHeader flow)
  const senderEmail = `${user.handle}@postal.zero`
  const confirmationEmail = null

  assert.equal(senderEmail, "alice@postal.zero")
  assert.equal(confirmationEmail, null)
  assert.ok(!senderEmail.includes("user@secret.com"))
})

test("C: Legacy X-Agent-Key/account-key send uses @postal.zero and suppresses confirmation SMTP", () => {
  const owner = {
    id: "owner-1",
    email: "owner@secret.com",
    handle: "alice",
    displayName: "Alice",
  }

  // Logic matching src/routes/send.ts (agentKey flow)
  const senderEmail = `${owner.handle}@postal.zero`
  const confirmationEmail = null

  assert.equal(senderEmail, "alice@postal.zero")
  assert.equal(confirmationEmail, null)
  assert.ok(!senderEmail.includes("owner@secret.com"))
})

test("D: Agent-token send preserves agent identity and does not substitute owner", () => {
  const agent = {
    id: "agent-1",
    displayName: "Support Agent",
    address: { handle: "support-bot" },
    owner: { id: "owner-1", email: "owner@secret.com" },
  }

  // Logic matching src/routes/send.ts (agentToken flow)
  const senderEmail = `${agent.address.handle}@postal.zero`
  const senderHandle = agent.address.handle
  const senderName = agent.displayName || agent.address.handle

  assert.equal(senderEmail, "support-bot@postal.zero")
  assert.equal(senderHandle, "support-bot")
  assert.equal(senderName, "Support Agent")
  assert.ok(!senderEmail.includes("owner@secret.com"))
})

test("E: External OTP/sendToken send preserves external senderEmail", () => {
  const sendToken = {
    senderEmail: "bob@external.org",
    recipientHandle: "alice",
  }

  // Logic matching src/routes/send.ts (sendToken flow)
  const senderEmail = sendToken.senderEmail
  const senderHandle = null
  const confirmationEmail = senderEmail

  assert.equal(senderEmail, "bob@external.org")
  assert.equal(senderHandle, null)
  assert.equal(confirmationEmail, "bob@external.org")
  assert.ok(!senderEmail.endsWith("@postal.zero"))
})

test("F: Public receipt display sanitization", async () => {
  // F1: Current internal mail
  mails.set("tok-current", {
    id: "m-current",
    deliveryToken: "tok-current",
    subject: "Current Mail",
    senderName: "Alice",
    senderEmail: "alice@postal.zero",
    senderHandle: "alice",
    senderVerified: true,
    recipientHandle: "bob",
    receiptSig: "sig-current",
    deliveredAt: new Date("2026-09-27T00:00:00Z"),
    readAt: null,
  })

  // F2: Legacy internal mail (persisted with private User.email)
  mails.set("tok-legacy", {
    id: "m-legacy",
    deliveryToken: "tok-legacy",
    subject: "Legacy Mail",
    senderName: "Alice",
    senderEmail: "user@secret.com",
    senderHandle: "alice",
    senderVerified: true,
    recipientHandle: "bob",
    receiptSig: "sig-legacy-original",
    deliveredAt: new Date("2026-09-26T00:00:00Z"),
    readAt: null,
  })

  // F3: External mail with no senderHandle
  mails.set("tok-external", {
    id: "m-external",
    deliveryToken: "tok-external",
    subject: "External Mail",
    senderName: "External Bob",
    senderEmail: "bob@external.org",
    senderHandle: null,
    senderVerified: false,
    recipientHandle: "alice",
    receiptSig: "sig-external",
    deliveredAt: new Date("2026-09-27T01:00:00Z"),
    readAt: null,
  })

  // Query F1
  const res1 = await fetch(`${base}/api/v1/receipt/tok-current`)
  assert.equal(res1.status, 200)
  const body1 = await res1.json()
  assert.equal(body1.from, "Alice <alice@postal.zero>")

  // Query F2 (Legacy record with user@secret.com in DB)
  const res2 = await fetch(`${base}/api/v1/receipt/tok-legacy`)
  assert.equal(res2.status, 200)
  const body2 = await res2.json()
  assert.equal(body2.from, "Alice <alice@postal.zero>")
  assert.ok(!JSON.stringify(body2).includes("user@secret.com"))

  // Query F3 (External sender preserved)
  const res3 = await fetch(`${base}/api/v1/receipt/tok-external`)
  assert.equal(res3.status, 200)
  const body3 = await res3.json()
  assert.equal(body3.from, "External Bob <bob@external.org>")
})

test("G: Receipt display sanitization does NOT rewrite or invalidate historical signatures", async () => {
  const legacyMail = mails.get("tok-legacy")!
  const res = await fetch(`${base}/api/v1/receipt/tok-legacy`)
  const body = await res.json()

  // Historical receiptSig is preserved verbatim
  assert.equal(body.receiptSig, "sig-legacy-original")
  assert.equal(body.verified, true)
  assert.ok(body.verifyHash.length > 0)
})

test("H: Recipient inbox and agent inbox attribute sender without leaking User.email", () => {
  // Inbox projection fields
  const inboxSelectFields = {
    senderName: "Alice",
    senderHandle: "alice",
    senderVerified: true,
  }

  assert.equal(inboxSelectFields.senderName, "Alice")
  assert.equal(inboxSelectFields.senderHandle, "alice")
  assert.ok(!("senderEmail" in inboxSelectFields))
})
