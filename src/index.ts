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

const app = express()
const PORT = parseInt(process.env.PORT || "3001")

app.use(helmet({contentSecurityPolicy:false}))
app.use(cors({ origin: true, credentials: true }))
app.use(cors({ origin: true, credentials: true }))

app.post("/api/v1/billing/webhook", express.raw({type:"application/json"}), stripeWebhookHandler)

app.use(express.json({limit:"4mb"}))
app.use(rateLimit({windowMs:60000,max:300,standardHeaders:true,legacyHeaders:false}))

app.get("/health", (_,res) => res.json({status:"ok",ts:new Date().toISOString()}))

app.use("/api/v1/send", sendRouter)
app.use("/api/v1/address", addressRouter)
app.use("/api/v1/receipt", receiptsRouter)
app.use("/api/v1/compose", composeRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/mail", mailRouter)
app.use("/api/v1/keys", keysRouter)
app.use("/api/v1/webhooks", webhooksRouter)
app.use("/api/v1/billing", billingRouter)

app.use((_req,res) => res.status(404).json({error:"Not found"}))
app.use((err:any,_req:any,res:any,_next:any) => { console.error(err.message); res.status(500).json({error:err.message}) })

app.listen(PORT, "0.0.0.0", () => console.log(`Postal Zero on port ${PORT}`))