"use client"
import { useState } from "react"
export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [veraMode, setVeraMode] = useState(false)
  const [veraHandle, setVeraHandle] = useState("")
  const [veraLoading, setVeraLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState("")
  const [veraError, setVeraError] = useState("")

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

  const askVera = async () => {
    if (!veraHandle) return
    setVeraLoading(true)
    setVeraError("")
    try {
      const r = await fetch("https://postalzero.dev/api/v1/auth/temp-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: veraHandle.toLowerCase() })
      })
      const d = await r.json()
      if (d.ok) {
        setTempPassword(d.tempPassword)
      } else {
        setVeraError(d.error || "Handle not found")
      }
    } catch {
      setVeraError("Cannot reach server")
    }
    setVeraLoading(false)
  }

  const inp: React.CSSProperties = {
    width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a",
    color: "#ededed", padding: "11px 14px", borderRadius: 8,
    fontSize: 14, outline: "none", marginBottom: 10
  }

  if (veraMode) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <a href="/" style={{ fontWeight: 700, fontSize: 15, marginBottom: 40, letterSpacing: "-0.02em" }}>Postal Zero</a>
      <div style={{ width: "100%", maxWidth: 360 }}>
        {tempPassword ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Your temporary password</h2>
            <p style={{ color: "#71717a", fontSize: 14, marginBottom: 20 }}>Use this to log in. Change your password once inside.</p>
            <div style={{ background: "#0a0a0a", border: "1px solid #22c55e", borderRadius: 8, padding: "16px", marginBottom: 20, fontFamily: "monospace", fontSize: 24, fontWeight: 700, letterSpacing: "0.1em", color: "#22c55e" }}>
              {tempPassword}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(tempPassword) }} style={{ width: "100%", background: "#1a1a1a", color: "#ededed", border: "1px solid #333", padding: "10px 0", borderRadius: 8, fontSize: 13, cursor: "pointer", marginBottom: 10 }}>Copy password</button>
            <button onClick={() => { setVeraMode(false); setTempPassword(""); setEmail(veraHandle + "@postal.zero") }} style={{ width: "100%", background: "#fff", color: "#000", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Go to login →</button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Hi, I am Vera</h1>
            <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28 }}>Tell me your handle and I will get you back in right away.</p>
            <input style={inp} placeholder="Your handle (e.g. darwin)" value={veraHandle} onChange={e => setVeraHandle(e.target.value.toLowerCase())} onKeyDown={e => e.key === "Enter" && askVera()} />
            {veraError && <div style={{ padding: "10px 14px", background: "#1a0808", border: "1px solid #3f0e0e", borderRadius: 8, fontSize: 13, color: "#f87171", marginBottom: 10 }}>{veraError}</div>}
            <button onClick={askVera} disabled={veraLoading || !veraHandle} style={{ width: "100%", background: "#a855f7", color: "#fff", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
              {veraLoading ? "Creating password..." : "Get me back in ✦"}
            </button>
            <button onClick={() => setVeraMode(false)} style={{ width: "100%", background: "transparent", color: "#71717a", border: "none", padding: "10px 0", fontSize: 13, cursor: "pointer" }}>← Back to login</button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <a href="/" style={{ fontWeight: 700, fontSize: 15, marginBottom: 40, letterSpacing: "-0.02em" }}>Postal Zero</a>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Welcome back</h1>
        <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28 }}>Sign in to your account</p>
            <input style={inp} placeholder="Your real email (e.g. alice@gmail.com)" value={email} type="email" onChange={e => setEmail(e.target.value)} />
        <input style={inp} placeholder="Password" value={password} type="password" onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        {error && <div style={{ padding: "10px 14px", background: "#1a0808", border: "1px solid #3f0e0e", borderRadius: 8, fontSize: 13, color: "#f87171", marginBottom: 10 }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", background: loading ? "#1a1a1a" : "#fff", color: loading ? "#52525b" : "#000", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#71717a" }}>
          No account? <a href="/claim" style={{ color: "#ededed", fontWeight: 500 }}>Claim your address</a>
        </p>
        <p style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#71717a" }}>
          Can't log in? <button onClick={() => setVeraMode(true)} style={{ background: "transparent", border: "none", color: "#a855f7", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Ask Vera ✦</button>
        </p>
      </div>
    </div>
  )
}
