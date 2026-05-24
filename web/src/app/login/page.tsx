"use client"
import { useState } from "react"
export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [veraMode, setVeraMode] = useState(false)
  const [veraHandle, setVeraHandle] = useState("")
  const [veraProblem, setVeraProblem] = useState("")
  const [veraSent, setVeraSent] = useState(false)
  const [veraLoading, setVeraLoading] = useState(false)

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
        setError(d.error || "Invalid credentials")
      }
    } catch {
      setError("Cannot reach server")
    }
    setLoading(false)
  }

  const askVera = async () => {
    if (!veraHandle || !veraProblem) return
    setVeraLoading(true)
    try {
      await fetch("https://postalzero.dev/api/v1/send/vera", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Agent-Key": "public-help-request" },
        body: JSON.stringify({
          senderName: veraHandle + " (login help)",
          senderEmail: veraHandle + "@postal.zero",
          subject: "Login help request from " + veraHandle,
          body: "Handle: " + veraHandle + "\nProblem: " + veraProblem
        })
      })
      setVeraSent(true)
    } catch {
      setVeraSent(true)
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
        {veraSent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Vera is on it</h2>
            <p style={{ color: "#71717a", fontSize: 14, marginBottom: 24 }}>Vera will send a temporary password to your inbox shortly. Check your messages at app.postalzero.dev/inbox</p>
            <button onClick={() => { setVeraMode(false); setVeraSent(false) }} style={{ background: "#fff", color: "#000", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back to login</button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Ask Vera for help</h1>
            <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28 }}>Vera will create a temporary password so you can log in</p>
            <input style={inp} placeholder="Your handle (e.g. darwin)" value={veraHandle} onChange={e => setVeraHandle(e.target.value.toLowerCase())} />
            <textarea style={{ ...inp, height: 100, resize: "none" }} placeholder="Describe your problem..." value={veraProblem} onChange={e => setVeraProblem(e.target.value)} />
            <button onClick={askVera} disabled={veraLoading || !veraHandle || !veraProblem} style={{ width: "100%", background: "#fff", color: "#000", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
              {veraLoading ? "Sending to Vera..." : "Ask Vera →"}
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
        <input style={inp} placeholder="Email" value={email} type="email" onChange={e => setEmail(e.target.value)} />
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
