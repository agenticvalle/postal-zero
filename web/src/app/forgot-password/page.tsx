"use client"
import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "code" | "done">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setStep("code")
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setStep("done")
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#fff", letterSpacing: "-1px" }}>
            postal<span style={{ color: "#7c5cfc" }}>zero</span>
          </h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "6px" }}>reset your password</p>
        </div>

        <div style={{ background: "#13111a", border: "0.5px solid #1e1e2e", borderRadius: "16px", padding: "28px" }}>

          {step === "email" && (
            <form onSubmit={sendCode}>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "6px" }}>email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={{ width: "100%", background: "#0f0f18", border: "0.5px solid #2a2a3a", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", color: "#fff", marginBottom: "16px", boxSizing: "border-box" }}
              />
              {error && <p style={{ color: "#ff4d6d", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", background: "#7c5cfc", border: "none", borderRadius: "12px", padding: "14px", fontSize: "15px", fontWeight: 700, color: "#fff", cursor: "pointer" }}
              >
                {loading ? "sending..." : "send reset code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={resetPassword}>
              <p style={{ color: "#aaa", fontSize: "13px", marginBottom: "20px" }}>
                A 6-digit code was sent to <strong style={{ color: "#fff" }}>{email}</strong>. Enter it below.
              </p>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "6px" }}>reset code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                maxLength={6}
                placeholder="123456"
                style={{ width: "100%", background: "#0f0f18", border: "0.5px solid #2a2a3a", borderRadius: "10px", padding: "12px 14px", fontSize: "22px", fontWeight: 700, color: "#7c5cfc", letterSpacing: "6px", marginBottom: "16px", boxSizing: "border-box", textAlign: "center" }}
              />
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "6px" }}>new password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="at least 8 characters"
                style={{ width: "100%", background: "#0f0f18", border: "0.5px solid #2a2a3a", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", color: "#fff", marginBottom: "16px", boxSizing: "border-box" }}
              />
              {error && <p style={{ color: "#ff4d6d", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", background: "#7c5cfc", border: "none", borderRadius: "12px", padding: "14px", fontSize: "15px", fontWeight: 700, color: "#fff", cursor: "pointer" }}
              >
                {loading ? "resetting..." : "reset password"}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                style={{ width: "100%", background: "none", border: "none", color: "#555", fontSize: "13px", marginTop: "12px", cursor: "pointer" }}
              >
                use a different email
              </button>
            </form>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", background: "#0e2420", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "28px" }}>
                ✓
              </div>
              <h3 style={{ color: "#2ec4a0", fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>password reset</h3>
              <p style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}>your password has been updated and all sessions have been signed out</p>
              <Link href="/login" style={{ display: "block", background: "#7c5cfc", borderRadius: "12px", padding: "14px", fontSize: "15px", fontWeight: 700, color: "#fff", textDecoration: "none", textAlign: "center" }}>
                sign in
              </Link>
            </div>
          )}

        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#555" }}>
          remembered it?{" "}
          <Link href="/login" style={{ color: "#7c5cfc" }}>sign in</Link>
        </p>
      </div>
    </div>
  )
}
