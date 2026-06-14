"use client"
import { useState } from "react"
import Link from "next/link"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !password) { setError("Email and password required"); return }
    setLoading(true); setError("")
    try {
      const r = await fetch("https://postalzero.dev/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const d = await r.json()
      if (d.accessToken) {
        localStorage.setItem("token", d.accessToken)
        localStorage.setItem("refreshToken", d.refreshToken)
        localStorage.setItem("user", JSON.stringify(d.user))
        window.location.href = "/dashboard"
      } else {
        setError("Email or password incorrect. Use the email you signed up with, not your postal.zero address.")
      }
    } catch {
      setError("Cannot reach server")
    }
    setLoading(false)
  }

  const inp: React.CSSProperties = {
    width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a",
    color: "#ededed", padding: "11px 14px", borderRadius: 8,
    fontSize: 14, outline: "none", marginBottom: 10, boxSizing: "border-box"
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <a href="/" style={{ fontWeight: 700, fontSize: 15, marginBottom: 40, letterSpacing: "-0.02em" }}>Postal Zero</a>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Welcome back</h1>
        <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28 }}>Sign in to your account</p>
        <input style={inp} placeholder="Your email (e.g. alice@gmail.com)" value={email} type="email" onChange={e => setEmail(e.target.value)} />
        <input style={inp} placeholder="Password" value={password} type="password" onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        {error && <div style={{ padding: "10px 14px", background: "#1a0808", border: "1px solid #3f0e0e", borderRadius: 8, fontSize: 13, color: "#f87171", marginBottom: 10 }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", background: loading ? "#1a1a1a" : "#fff", color: loading ? "#52525b" : "#000", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p style={{ textAlign: "center", marginTop: 4, fontSize: 13, color: "#71717a" }}>
          <Link href="/forgot-password" style={{ color: "#a855f7", fontWeight: 500 }}>Forgot password?</Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#71717a" }}>
          No account? <a href="/claim" style={{ color: "#ededed", fontWeight: 500 }}>Claim your address</a>
        </p>
      </div>
    </div>
  )
}
