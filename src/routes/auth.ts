import { Router } from "express"
import { rateLimit } from "express-rate-limit"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"

const loginLimit = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: "Too many attempts. Try again in 15 minutes." } })
const registerLimit = rateLimit({ windowMs: 60*60*1000, max: 5, message: { error: "Too many registrations from this IP." } })

const prisma = new PrismaClient()
export const authRouter = Router()

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set")
  process.exit(1)
}

const SECRET = process.env.JWT_SECRET
const sign  = (id: string) => jwt.sign({ sub: id }, SECRET, { expiresIn: "8h" })
const signR = (id: string) => jwt.sign({ sub: id, typ: "refresh" }, SECRET, { expiresIn: "30d" })
const safeError = (res: any, status: number, msg: string) => res.status(status).json({ error: msg })

authRouter.post("/register", registerLimit, async (req, res) => {
  try {
    const { password, handle, displayName } = req.body
    const email = (req.body.email || "").toLowerCase().trim()
    if (!email || !password || !handle || !displayName)
      return safeError(res, 400, "All fields required")
    if (password.length < 8)
      return safeError(res, 400, "Password must be at least 8 characters")
    if (!/^[a-z0-9_-]{3,32}$/.test(handle))
      return safeError(res, 400, "Handle must be 3-32 lowercase letters, numbers, _ or -")
    const clash = await prisma.user.findFirst({ where: { OR: [{ email }, { handle }] } })
    if (clash) return safeError(res, 409, "Email or handle taken")
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, passwordHash, handle, displayName } })
    const accessToken  = sign(user.id)
    const refreshToken = signR(user.id)
    await prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt: new Date(Date.now() + 30 * 86400000) }
    })
    return res.status(201).json({
      accessToken, refreshToken,
      user: { id: user.id, email, handle, displayName, address: `${handle}@postal.zero`, plan: user.plan }
    })
  } catch {
    return safeError(res, 500, "Registration failed")
  }
})

authRouter.post("/login", loginLimit, async (req, res) => {
  try {
    const { password } = req.body
    const email = (req.body.email || "").toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !await bcrypt.compare(password, user.passwordHash))
      return safeError(res, 401, "Invalid credentials")
    const accessToken  = sign(user.id)
    const refreshToken = signR(user.id)
    await prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt: new Date(Date.now() + 30 * 86400000) }
    })
    return res.json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, handle: user.handle, displayName: user.displayName, address: `${user.handle}@postal.zero`, plan: user.plan }
    })
  } catch {
    return safeError(res, 500, "Login failed")
  }
})

authRouter.get("/me", async (req, res) => {
  try {
    const tok = req.headers.authorization?.replace("Bearer ", "")
    if (!tok) return safeError(res, 401, "Unauthorized")
    const p = jwt.verify(tok, SECRET) as any
    const session = await prisma.session.findFirst({
      where: { userId: p.sub, expiresAt: { gt: new Date() } }
    })
    if (!session) return safeError(res, 401, "Session expired or revoked")
    const user = await prisma.user.findUnique({ where: { id: p.sub } })
    if (!user) return safeError(res, 404, "User not found")
    return res.json({
      id: user.id,
      email: user.email,
      handle: user.handle,
      displayName: user.displayName,
      address: `${user.handle}@postal.zero`,
      plan: user.plan,
      messagesThisMonth: user.messagesThisMonth
    })
  } catch {
    return safeError(res, 401, "Invalid token")
  }
})

authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = req.body
  if (refreshToken) await prisma.session.deleteMany({ where: { refreshToken } }).catch(() => {})
  return res.json({ ok: true })
})
