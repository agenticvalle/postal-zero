import jwt from "jsonwebtoken"
import type { Request, Response, NextFunction } from "express"

// ── Secret access (fail closed) ────────────────────────────────────────────────
// Never falls back to a dev/default secret. Throws if JWT_SECRET is missing so
// the process cannot serve auth with a forgeable key.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET environment variable is not set")
  return secret
}

const ACCESS_TTL = "8h"
const REFRESH_TTL = "30d"

// ── Token minting ──────────────────────────────────────────────────────────────
// Access and refresh tokens are positively typed so they are never interchangeable.
export const signAccess = (sub: string) =>
  jwt.sign({ sub, typ: "access" }, getJwtSecret(), { expiresIn: ACCESS_TTL })

export const signRefresh = (sub: string) =>
  jwt.sign({ sub, typ: "refresh" }, getJwtSecret(), { expiresIn: REFRESH_TTL })

// ── Token verification ──────────────────────────────────────────────────────────
// verifyAccess accepts only a valid signature AND typ === "access".
// A missing typ or typ === "refresh" throws.
export function verifyAccess(token: string): string {
  const payload = jwt.verify(token, getJwtSecret()) as any
  if (payload.typ !== "access" || !payload.sub) throw new Error("Not an access token")
  return payload.sub as string
}

// verifyRefresh accepts only a valid signature AND typ === "refresh".
export function verifyRefresh(token: string): string {
  const payload = jwt.verify(token, getJwtSecret()) as any
  if (payload.typ !== "refresh" || !payload.sub) throw new Error("Not a refresh token")
  return payload.sub as string
}

// ── Shared resource-route middleware ────────────────────────────────────────────
// hasLiveSession is injected so production uses Prisma and tests use an in-memory
// store. The session check keys on the userId, never on the presented token string
// (access tokens are not stored server-side; only refresh tokens are).
export type HasLiveSession = (userId: string) => Promise<boolean>

export function requireUser(hasLiveSession: HasLiveSession) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    const token = header && header.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: "Unauthorized" })

    let userId: string
    try {
      userId = verifyAccess(token)
    } catch {
      return res.status(401).json({ error: "Unauthorized" })
    }

    let live: boolean
    try {
      live = await hasLiveSession(userId)
    } catch {
      return res.status(500).json({ error: "Auth check failed" })
    }
    if (!live) return res.status(401).json({ error: "Session expired or revoked" })

    ;(req as any).userId = userId
    next()
  }
}

// ── Refresh exchange ────────────────────────────────────────────────────────────
// Mints a new access token from a refresh token only when: the token is a valid
// refresh JWT (typ === "refresh"), a matching live Session row exists for the same
// user, and the user still exists. Returns null on any failure.
export interface RefreshDeps {
  findSession: (refreshToken: string) => Promise<{ userId: string; expiresAt: Date } | null>
  userExists: (userId: string) => Promise<boolean>
}

export async function issueAccessFromRefresh(
  refreshToken: string,
  deps: RefreshDeps
): Promise<string | null> {
  let sub: string
  try {
    sub = verifyRefresh(refreshToken)
  } catch {
    return null
  }
  const session = await deps.findSession(refreshToken)
  if (!session || session.userId !== sub || session.expiresAt <= new Date()) return null
  if (!(await deps.userExists(sub))) return null
  return signAccess(sub)
}
