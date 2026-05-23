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

  const inp: React.CSSProperties = { width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#ededed", padding: "11px 14px", borderRadius: 8, fontSize: 14, outline: "none" }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <a href="/" style={{ fontWeight: 700, fontSize: 15, marginBottom: 40, letterSpacing: "-0.02em" }}>Postal Zero</a>
      <div style={{ width: "100%", maxWidth: 360 }}>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
          {[1,2].map(n => (
            <div key={n} style={{ flex: 1, height: 2, borderRadius: 2, background: n <= step ? "#fff" : "#1a1a1a" }} />
          ))}
        </div>

        {step === 1 && <>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Claim your address</h1>
          <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28 }}>Choose your permanent address on postal.zero</p>
          <input style={inp} placeholder="Display name" value={form.displayName} onChange={set("displayName")} />
          <div style={{ position: "relative", marginTop: 10 }}>
            <input style={{ ...inp, paddingRight: 120 }} placeholder="handle" value={form.handle}
              onChange={e => { e.target.value = e.target.value.toLowerCase(); set("handle")(e); checkHandle(e.target.value.toLowerCase()) }} />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#52525b" }}>@postal.zero</span>
          </div>
          {form.handle.length >= 3 && (
            <div style={{ marginTop: 6, fontSize: 12, color: available ? "#22c55e" : "#ef4444" }}>
              {available === null ? "" : available ? "✓ Available" : "✗ Already taken"}
            </div>
          )}
          <button onClick={() => { if (form.displayName && form.handle && available) setStep(2) }}
            disabled={!form.displayName || !form.handle || available === false}
            style={{ width: "100%", marginTop: 14, background: form.displayName && form.handle && available ? "#fff" : "#1a1a1a", color: form.displayName && form.handle && available ? "#000" : "#52525b", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
            Continue →
          </button>
        </>}

        {step === 2 && <>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Secure your account</h1>
          <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28 }}>Almost done — add your email and password</p>
          <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
            <span style={{ color: "#52525b" }}>Your address: </span>
            <span style={{ fontFamily: "monospace", color: "#22c55e" }}>{form.handle}@postal.zero</span>
          </div>
          <input style={inp} placeholder="Your real email (e.g. jim@gmail.com)" value={form.email} type="email" onChange={set("email")} />
          <input style={{ ...inp, marginTop: 10 }} placeholder="Password (min 8 chars)" value={form.password} type="password" onChange={set("password")} onKeyDown={e => e.key === "Enter" && submit()} />
          {error && <div style={{ marginTop: 10, padding: "10px 14px", background: "#1a0808", border: "1px solid #3f0e0e", borderRadius: 8, fontSize: 13, color: "#f87171" }}>{error}</div>}
          <button onClick={submit} disabled={loading || !form.email || !form.password}
            style={{ width: "100%", marginTop: 14, background: loading ? "#1a1a1a" : "#fff", color: loading ? "#52525b" : "#000", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
            {loading ? "Creating account..." : "Claim address →"}
          </button>
          <button onClick={() => setStep(1)} style={{ width: "100%", marginTop: 8, background: "transparent", color: "#52525b", border: "none", padding: "10px 0", fontSize: 13 }}>← Back</button>
        </>}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#71717a" }}>
          Already have an account? <a href="/login" style={{ color: "#ededed", fontWeight: 500 }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
