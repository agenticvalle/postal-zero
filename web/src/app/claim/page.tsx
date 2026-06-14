"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { api, setToken } from "../../lib/api"

export default function Claim() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ email: "", password: "", handle: "", displayName: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState<boolean|null>(null)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const checkHandle = async (h: string) => {
    if (h.length < 3) { setAvailable(null); return }
    const d = await api.checkHandle(h)
    setAvailable(d.available)
  }

  const submit = async () => {
    setLoading(true); setError("")
    try {
      const d = await api.register(form)
      if (d.accessToken) { setToken(d.accessToken); router.push("/dashboard") }
      else setError(d.error || "Registration failed")
    } catch { setError("Network error — check connection") }
    setLoading(false)
  }

  const inp: React.CSSProperties = {
    width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a",
    color: "#ededed", padding: "11px 14px", borderRadius: 8, fontSize: 14,
    outline: "none", boxSizing: "border-box"
  }

  const label: React.CSSProperties = {
    fontSize: 11, color: "#52525b", textTransform: "uppercase",
    letterSpacing: "0.08em", display: "block", marginBottom: 6, marginTop: 14
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <a href="/" style={{ fontWeight: 700, fontSize: 15, marginBottom: 40, letterSpacing: "-0.02em" }}>Postal Zero</a>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
          {[1,2].map(n => (
            <div key={n} style={{ flex: 1, height: 2, borderRadius: 2, background: n <= step ? "#fff" : "#1a1a1a" }} />
          ))}
        </div>

        {step === 1 && <>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Claim your address</h1>
          <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28 }}>Pick your permanent handle on postal.zero</p>

          <span style={label}>display name</span>
          <input style={inp} placeholder="Your full name" value={form.displayName} onChange={set("displayName")} />

          <span style={label}>your handle</span>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...inp, paddingRight: 120 }}
              placeholder="yourhandle"
              value={form.handle}
              onChange={e => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                setForm(f => ({ ...f, handle: val }))
                checkHandle(val)
              }}
            />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#52525b", pointerEvents: "none" }}>@postal.zero</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, minHeight: 18 }}>
            {form.handle.length >= 3 && available !== null && (
              <span style={{ color: available ? "#22c55e" : "#ef4444" }}>
                {available ? "✓ Available — this will be your permanent address" : "✗ Already taken — try another"}
              </span>
            )}
            {form.handle.length > 0 && form.handle.length < 3 && (
              <span style={{ color: "#52525b" }}>minimum 3 characters</span>
            )}
          </div>

          <button
            onClick={() => { if (form.displayName && form.handle && available) setStep(2) }}
            disabled={!form.displayName || !form.handle || !available}
            style={{ width: "100%", marginTop: 20, background: form.displayName && form.handle && available ? "#fff" : "#1a1a1a", color: form.displayName && form.handle && available ? "#000" : "#52525b", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: available ? "pointer" : "not-allowed" }}>
            Continue →
          </button>
        </>}

        {step === 2 && <>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Secure your account</h1>
          <p style={{ color: "#71717a", fontSize: 14, marginBottom: 20 }}>Almost done — add your personal email and a password</p>

          <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13 }}>
            <span style={{ color: "#52525b" }}>Your address will be: </span>
            <span style={{ fontFamily: "monospace", color: "#22c55e" }}>{form.handle}@postal.zero</span>
          </div>

          <span style={label}>personal email</span>
          <input
            style={inp}
            placeholder="your@email.com"
            value={form.email}
            type="email"
            onChange={set("email")}
          />
          <p style={{ fontSize: 11, color: "#52525b", marginTop: 4, marginBottom: 0 }}>
            This is your private login email — not your postal.zero address
          </p>

          <span style={label}>password</span>
          <input
            style={{ ...inp, marginTop: 0 }}
            placeholder="Min 8 characters — letters, numbers, symbols"
            value={form.password}
            type="password"
            onChange={set("password")}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
          <p style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>
            Use uppercase, lowercase, numbers and symbols for a stronger password
          </p>

          {error && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#1a0808", border: "1px solid #3f0e0e", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !form.email || !form.password || form.password.length < 8}
            style={{ width: "100%", marginTop: 16, background: loading ? "#1a1a1a" : "#fff", color: loading ? "#52525b" : "#000", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Creating account..." : "Claim address →"}
          </button>
          <button onClick={() => setStep(1)} style={{ width: "100%", marginTop: 8, background: "transparent", color: "#52525b", border: "none", padding: "10px 0", fontSize: 13, cursor: "pointer" }}>← Back</button>
        </>}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#71717a" }}>
          Already have an account? <a href="/login" style={{ color: "#ededed", fontWeight: 500 }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
