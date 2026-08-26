import { Router } from "express"
import { rateLimit } from "express-rate-limit"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { randomInt } from "crypto"
import { PrismaClient } from "@prisma/client"
import { Resend } from "resend"

const loginLimit = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: "Too many attempts. Try again in 15 minutes." } })
const registerLimit = rateLimit({ windowMs: 60*60*1000, max: 5, message: { error: "Too many registrations from this IP." } })
const forgotLimit = rateLimit({ windowMs: 60*60*1000, max: 3, message: { error: "Too many reset requests. Try again in an hour." } })
const resetLimit = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: "Too many reset attempts. Try again in 15 minutes." } })

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)
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
    const identityType = req.body.identityType || "PERSON"
    if (!["PERSON", "ORGANIZATION"].includes(identityType))
      return safeError(res, 400, "Invalid identity type")
    if (!email || !password || !handle || !displayName)
      return safeError(res, 400, "All fields required")
    if (password.length < 8)
      return safeError(res, 400, "Password must be at least 8 characters")
    if (!/^[a-z0-9_-]{3,32}$/.test(handle))
      return safeError(res, 400, "Handle must be 3-32 lowercase letters, numbers, _ or -")
    const clash = await prisma.user.findFirst({ where: { OR: [{ email }, { handle }] } })
    if (clash) return safeError(res, 409, "Email or handle taken")
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, passwordHash, handle, displayName, identityType } })
    const accessToken  = sign(user.id)
    const refreshToken = signR(user.id)
    await prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt: new Date(Date.now() + 30 * 86400000) }
    })
    return res.status(201).json({
      accessToken, refreshToken,
      user: { id: user.id, email, handle, displayName, identityType: user.identityType, address: `${handle}@postal.zero`, plan: user.plan }
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
      user: { id: user.id, email: user.email, handle: user.handle, displayName: user.displayName, identityType: user.identityType, address: `${user.handle}@postal.zero`, plan: user.plan }
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
      identityType: user.identityType,
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

// ── Forgot Password ───────────────────────────────────────────────────────────
authRouter.post("/forgot-password", forgotLimit, async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim()
    if (!email) return safeError(res, 400, "Email required")

    // Always return same response — never reveal if email exists
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.json({ ok: true, message: "If that email exists, a code was sent" })

    // Invalidate any existing unused codes
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    })

    // Generate 6-digit code
    const code = randomInt(100000, 1000000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.passwordReset.create({
      data: { userId: user.id, code, expiresAt }
    })

    await resend.emails.send({
      from: "Postal Zero <noreply@postalzero.dev>",
      to: email,
      subject: "Your Postal Zero reset code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#7c5cfc;margin-bottom:8px;">Password Reset</h2>
          <p style="color:#666;margin-bottom:24px;">Enter this code to reset your password. It expires in 15 minutes.</p>
          <div style="background:#f4f0ff;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#7c5cfc;">${code}</span>
          </div>
          <p style="color:#999;font-size:13px;">If you did not request this, ignore this email. Your password will not change.</p>
        </div>
      `
    })

    return res.json({ ok: true, message: "If that email exists, a code was sent" })
  } catch {
    return safeError(res, 500, "Reset request failed")
  }
})

// ── Reset Password ────────────────────────────────────────────────────────────
authRouter.post("/reset-password", resetLimit, async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim()
    const { code, newPassword } = req.body

    if (!email || !code || !newPassword)
      return safeError(res, 400, "Email, code and new password required")

    if (newPassword.length < 8)
      return safeError(res, 400, "Password must be at least 8 characters")

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return safeError(res, 400, "Invalid code")

    const reset = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: { gt: new Date() }
      }
    })

    if (!reset) return safeError(res, 400, "Invalid or expired code")

    // Mark code as used
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used: true }
    })

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId: user.id } })

    return res.json({ ok: true, message: "Password reset successfully" })
  } catch {
    return safeError(res, 500, "Reset failed")
  }
})
