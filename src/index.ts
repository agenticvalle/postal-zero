import express from "express"
import helmet from "helmet"
import cors from "cors"
import { rateLimit } from "express-rate-limit"
import { composeRouter } from "./routes/compose"
import { authRouter } from "./routes/auth"
import { keysRouter } from "./routes/keys"
import { webhooksRouter } from "./routes/webhooks"
import { sendRouter } from "./routes/send"
import { mailRouter } from "./routes/mail"
import { receiptsRouter } from "./routes/receipts"
import { billingRouter, stripeWebhookHandler } from "./routes/billing"
import { addressRouter } from "./routes/address"
import { agentsRouter } from "./routes/agents"
import { createAgentInboxRouter, makePrismaAgentInboxData } from "./routes/agent-inbox"
import { PrismaClient } from "@prisma/client"
import { requireUser } from "./lib/auth"

const app = express()
app.set("trust proxy", 1)
const PORT = parseInt(process.env.PORT || "3001")

// Shared auth gate for protected user-resource routes. A request passes only with
// a valid access JWT (typ === "access") whose user has an unexpired Session row.
// Session lookup keys on userId, never on the presented token string.
const prisma = new PrismaClient()
const requireAuth = requireUser(async (userId) => {
  const session = await prisma.session.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true }
  })
  return Boolean(session)
})

app.use(helmet({contentSecurityPolicy:false}))
const allowedOrigins = [
  "https://postalzero.dev",
  "https://app.postalzero.dev",
  process.env.WEB_URL
].filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error("Not allowed by CORS"))
  },
  credentials: true
}))

app.post("/api/v1/billing/webhook", express.raw({type:"application/json"}), stripeWebhookHandler)

app.use(express.json({limit:"4mb"}))
app.use(rateLimit({windowMs:60000,max:300,standardHeaders:true,legacyHeaders:false}))

const WEB_ORIGIN = "https://app.postalzero.dev"

app.get("/robots.txt", (_req,res) => {
  res.type("text/plain").send([
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    `Sitemap: ${WEB_ORIGIN}/sitemap.xml`,
    "",
  ].join("\n"))
})
app.get("/sitemap.xml", (_req,res) => res.redirect(308, `${WEB_ORIGIN}/sitemap.xml`))
app.get("/pricing", (_req,res) => res.redirect(308, `${WEB_ORIGIN}/pricing`))
app.get("/", (_req,res) => res.redirect(308, WEB_ORIGIN))
app.get("/health", (_,res) => res.json({status:"ok",ts:new Date().toISOString()}))

app.use("/api/v1/send", sendRouter)
app.use("/api/v1/address", addressRouter)
// Agent-token-authenticated inbox. Mounted before the user-JWT-gated /agents
// router so /agents/me/mail is matched here (no requireUser gate) instead.
app.use("/api/v1/agents/me", createAgentInboxRouter(makePrismaAgentInboxData(prisma)))
app.use("/api/v1/agents", requireAuth, agentsRouter)
app.use("/api/v1/receipt", receiptsRouter)
app.use("/api/v1/compose", requireAuth, composeRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/mail", requireAuth, mailRouter)
app.use("/api/v1/keys", requireAuth, keysRouter)
app.use("/api/v1/webhooks", requireAuth, webhooksRouter)
app.use("/api/v1/billing", requireAuth, billingRouter)

app.use((_req,res) => res.status(404).json({error:"Not found"}))
app.use((err:any,_req:any,res:any,_next:any) => { console.error(err.message); res.status(500).json({error:err.message}) })

app.listen(PORT, "0.0.0.0", () => console.log(`Postal Zero on port ${PORT}`))