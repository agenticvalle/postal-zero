import os
R = '/home/vallejos90agentic/postal-zero/web'

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w').write(content)
    print(f'wrote {path.replace(R+"/","")}')

# ── GLOBALS.CSS ───────────────────────────────────────────
w(f'{R}/src/app/globals.css', '''
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #000000;
  --bg2:       #0a0a0a;
  --bg3:       #111111;
  --border:    #1a1a1a;
  --border2:   #222222;
  --text:      #ededed;
  --text2:     #a1a1aa;
  --text3:     #52525b;
  --accent:    #ffffff;
  --green:     #22c55e;
  --blue:      #3b82f6;
  --purple:    #8b5cf6;
  --orange:    #f97316;
  --red:       #ef4444;
  --radius:    8px;
  --radius-lg: 12px;
}

html { font-size: 16px; -webkit-font-smoothing: antialiased; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  line-height: 1.5;
  min-height: 100vh;
}

a { color: inherit; text-decoration: none; }
button { cursor: pointer; font-family: inherit; }
input, textarea { font-family: inherit; }

::selection { background: rgba(255,255,255,0.15); }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
'''.lstrip())

# ── LAYOUT ───────────────────────────────────────────────
w(f'{R}/src/app/layout.tsx', '''
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Postal Zero — Agentic communication protocol",
  description: "Every person, AI agent, and system gets a permanent address. Cryptographic delivery receipts.",
  openGraph: {
    title: "Postal Zero",
    description: "The communication layer for the agentic internet.",
    url: "https://postal-zero-web.vercel.app",
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
'''.lstrip())

# ── HOME PAGE ─────────────────────────────────────────────
w(f'{R}/src/app/page.tsx', '''
"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const NAV: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
  borderBottom: "1px solid #111",
  background: "rgba(0,0,0,0.8)",
  backdropFilter: "blur(12px)",
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "0 24px", height: 56,
}

const FEATURES = [
  { icon: "◎", title: "Permanent address", desc: "darwin@postal.zero is yours forever. No platform lock-in, no account deletion." },
  { icon: "⬡", title: "Agent-native protocol", desc: "Any AI agent can send via X-Agent-Key header. Structured payloads supported natively." },
  { icon: "⬖", title: "Cryptographic receipts", desc: "Every delivery produces an HMAC-signed receipt. Proof of delivery, immutable audit log." },
  { icon: "◈", title: "Real-time webhooks", desc: "Register a URL. Get notified the moment a message arrives. Build on top of delivery." },
  { icon: "◇", title: "AI triage", desc: "Claude reads your messages, classifies urgency, extracts action items. PRO+ feature." },
  { icon: "○", title: "Open protocol", desc: "Self-hostable. No vendor lock-in. SMTP for the age of AI." },
]

const CODE = `# Send from any agent in 2 lines
curl -X POST https://postal-zero-api.fly.dev/api/v1/send/darwin \\
  -H "X-Agent-Key: your-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{"senderName":"My Agent","senderEmail":"agent@app.com",
       "subject":"Analysis complete","body":"Revenue up 23%",
       "payload":{"schema":"report/v1","value":0.23}}'

# Response: cryptographic delivery receipt
{
  "ok": true,
  "deliveryToken": "d4134b97-...",
  "deliveredAt": "2026-05-18T04:02:02Z"
}`

export default function Home() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <div style={{ background: "#000" }}>

      {/* NAV */}
      <nav style={{ ...NAV, borderBottomColor: scrolled ? "#1a1a1a" : "transparent" }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>Postal Zero</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => router.push("/pricing")} style={{ background: "transparent", border: "none", color: "#a1a1aa", fontSize: 13, padding: "6px 12px" }}>Pricing</button>
          <button onClick={() => router.push("/login")} style={{ background: "transparent", border: "none", color: "#a1a1aa", fontSize: 13, padding: "6px 12px" }}>Sign in</button>
          <button onClick={() => router.push("/claim")} style={{ background: "#fff", border: "none", color: "#000", fontSize: 13, fontWeight: 600, padding: "7px 16px", borderRadius: 6 }}>Get started</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>

        {/* Grid bg */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)" }} />

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #222", borderRadius: 20, padding: "4px 12px 4px 8px", marginBottom: 32, fontSize: 12, color: "#a1a1aa" }}>
          <span style={{ background: "#22c55e", width: 6, height: 6, borderRadius: "50%", display: "inline-block" }} />
          Live on Fly.io · postal-zero-api.fly.dev
        </div>

        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05, maxWidth: 800, marginBottom: 24 }}>
          SMTP for the<br />
          <span style={{ color: "#a1a1aa" }}>agentic internet</span>
        </h1>

        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#a1a1aa", maxWidth: 480, marginBottom: 40, lineHeight: 1.6 }}>
          Every person and AI agent gets a permanent address. Cryptographic delivery receipts. Three lines of code.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 60 }}>
          <button onClick={() => router.push("/claim")} style={{ background: "#fff", color: "#000", border: "none", padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
            Claim your address →
          </button>
          <button onClick={() => router.push("/pricing")} style={{ background: "transparent", color: "#a1a1aa", border: "1px solid #222", padding: "12px 24px", borderRadius: 8, fontSize: 14 }}>
            View pricing
          </button>
        </div>

        {/* Address preview */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#52525b", fontSize: 13 }}>
          <span style={{ fontFamily: "monospace", background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "6px 14px", borderRadius: 6 }}>darwin@postal.zero</span>
          <span>·</span>
          <span style={{ fontFamily: "monospace", background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "6px 14px", borderRadius: 6 }}>agent@postal.zero</span>
          <span>·</span>
          <span style={{ fontFamily: "monospace", background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "6px 14px", borderRadius: 6 }}>gpt4@postal.zero</span>
        </div>
      </section>

      {/* CODE BLOCK */}
      <section style={{ padding: "0 24px 100px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", borderBottom: "1px solid #1a1a1a" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 11, color: "#52525b", marginLeft: 8 }}>terminal</span>
          </div>
          <pre style={{ padding: "20px 24px", fontSize: 12, color: "#a1a1aa", overflowX: "auto", lineHeight: 1.7, fontFamily: "monospace" }}>{CODE}</pre>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "0 24px 120px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#52525b", textTransform: "uppercase", marginBottom: 12 }}>Why Postal Zero</div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.03em" }}>Built for the agent economy</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1, border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: "#0a0a0a", padding: "28px 28px", borderRight: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
              <div style={{ fontSize: 20, marginBottom: 12, color: "#52525b" }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, letterSpacing: "-0.01em" }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#71717a", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 24px 120px", textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 16, padding: "48px 40px" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>Start in 60 seconds</h2>
          <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Claim your address. Get your agent key. Start receiving structured messages with cryptographic proof.</p>
          <button onClick={() => router.push("/claim")} style={{ width: "100%", background: "#fff", color: "#000", border: "none", padding: "13px 0", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
            Claim your address →
          </button>
          <div style={{ fontSize: 12, color: "#52525b", marginTop: 12 }}>Free forever · No credit card</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #111", padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 960, margin: "0 auto" }}>
        <span style={{ fontSize: 13, color: "#52525b", fontWeight: 600 }}>Postal Zero</span>
        <div style={{ display: "flex", gap: 20 }}>
          {[["Pricing", "/pricing"], ["Docs", "/"], ["Sign in", "/login"]].map(([l, h]) => (
            <a key={l} href={h} style={{ fontSize: 13, color: "#52525b" }}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  )
}
'''.lstrip())

# ── LOGIN ─────────────────────────────────────────────────
w(f'{R}/src/app/login/page.tsx', '''
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { api, setToken } from "../../lib/api"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true); setError("")
    try {
      const d = await api.login({ email, password })
      if (d.accessToken) { setToken(d.accessToken); router.push("/dashboard") }
      else setError(d.error || "Invalid credentials")
    } catch { setError("Network error") }
    setLoading(false)
  }

  const inp: React.CSSProperties = { width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#ededed", padding: "11px 14px", borderRadius: 8, fontSize: 14, outline: "none" }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <a href="/" style={{ fontWeight: 700, fontSize: 15, marginBottom: 40, letterSpacing: "-0.02em" }}>Postal Zero</a>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Welcome back</h1>
        <p style={{ color: "#71717a", fontSize: 14, marginBottom: 28 }}>Sign in to your account</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input style={inp} placeholder="Email" value={email} type="email" onChange={e => setEmail(e.target.value)} />
          <input style={inp} placeholder="Password" value={password} type="password" onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {error && <div style={{ marginTop: 10, padding: "10px 14px", background: "#1a0808", border: "1px solid #3f0e0e", borderRadius: 8, fontSize: 13, color: "#f87171" }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 14, background: loading ? "#1a1a1a" : "#fff", color: loading ? "#52525b" : "#000", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#71717a" }}>
          No account? <a href="/claim" style={{ color: "#ededed", fontWeight: 500 }}>Claim your address</a>
        </p>
      </div>
    </div>
  )
}
'''.lstrip())

# ── CLAIM ─────────────────────────────────────────────────
w(f'{R}/src/app/claim/page.tsx', '''
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
              onChange={e => { set("handle")(e); checkHandle(e.target.value) }} />
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
          <input style={inp} placeholder="Email" value={form.email} type="email" onChange={set("email")} />
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
'''.lstrip())

# ── PRICING ───────────────────────────────────────────────
w(f'{R}/src/app/pricing/page.tsx', '''
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "../../lib/api"

const PLANS = [
  { name: "FREE",     label: "Free",     price: 0,   msg: "100",     keys: "3",   hooks: "—",  ai: false },
  { name: "STARTER",  label: "Starter",  price: 9,   msg: "2,000",   keys: "10",  hooks: "5",  ai: false },
  { name: "PRO",      label: "Pro",      price: 29,  msg: "20,000",  keys: "∞",   hooks: "∞",  ai: true,  popular: true },
  { name: "BUSINESS", label: "Business", price: 99,  msg: "200,000", keys: "∞",   hooks: "∞",  ai: true },
]

const ROWS = [
  { label: "Messages / mo", key: "msg" },
  { label: "Agent keys",    key: "keys" },
  { label: "Webhooks",      key: "hooks" },
  { label: "AI triage",     key: "ai" },
  { label: "Receipt proofs",key: "receipt" },
  { label: "API access",    key: "api" },
]

export default function Pricing() {
  const router = useRouter()
  const [annual, setAnnual] = useState(false)
  const [current, setCurrent] = useState("")
  const [loading, setLoading] = useState("")

  useEffect(() => { api.billing().then((d: any) => setCurrent(d.plan || "")).catch(() => {}) }, [])

  const checkout = async (plan: string) => {
    if (!localStorage.getItem("token")) { router.push("/claim"); return }
    setLoading(plan)
    const d = await api.checkout(plan)
    if (d.url) window.location.href = d.url
    else alert(d.error || "Stripe not configured yet")
    setLoading("")
  }

  const val = (p: any, key: string) => {
    if (key === "ai") return p.ai ? "✓" : "—"
    if (key === "receipt") return "✓"
    if (key === "api") return p.name === "FREE" ? "—" : "✓"
    return (p as any)[key]
  }

  return (
    <div style={{ minHeight: "100vh", padding: "80px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <a href="/" style={{ fontWeight: 700, fontSize: 15, display: "block", marginBottom: 40, letterSpacing: "-0.02em" }}>Postal Zero</a>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#52525b", textTransform: "uppercase", marginBottom: 12 }}>Pricing</div>
          <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: 14 }}>Start free. Scale when ready.</h1>
          <p style={{ color: "#71717a", fontSize: 15, marginBottom: 28 }}>All plans include permanent address and cryptographic receipts.</p>

          {/* Toggle */}
          <div style={{ display: "inline-flex", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: 3 }}>
            {["Monthly", "Annual"].map(t => (
              <button key={t} onClick={() => setAnnual(t === "Annual")}
                style={{ padding: "7px 18px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, background: (t === "Annual") === annual ? "#fff" : "transparent", color: (t === "Annual") === annual ? "#000" : "#71717a" }}>
                {t}{t === "Annual" && <span style={{ marginLeft: 4, fontSize: 11, color: "#22c55e" }}>−20%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 60 }}>
          {PLANS.map(p => {
            const price = annual && p.price > 0 ? Math.round(p.price * 0.8) : p.price
            const isCurrent = current === p.name
            return (
              <div key={p.name} style={{ background: "#0a0a0a", border: `1px solid ${isCurrent ? "#fff" : (p as any).popular ? "#333" : "#1a1a1a"}`, borderRadius: 12, padding: "24px 20px", position: "relative" }}>
                {(p as any).popular && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: "#fff", color: "#000", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: "0 0 6px 6px", letterSpacing: "0.05em" }}>POPULAR</div>}
                {isCurrent && <div style={{ position: "absolute", top: 12, right: 12, background: "#22c55e22", color: "#22c55e", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>Current</div>}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{p.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", marginBottom: 4 }}>
                  {p.price === 0 ? "Free" : `$${price}`}
                  {p.price > 0 && <span style={{ fontSize: 13, color: "#71717a", fontWeight: 400 }}>/mo</span>}
                </div>
                {annual && p.price > 0 && <div style={{ fontSize: 11, color: "#52525b", marginBottom: 16 }}>${price * 12}/year</div>}
                <div style={{ height: annual ? 0 : 16 }} />
                {ROWS.map(r => (
                  <div key={r.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid #111" }}>
                    <span style={{ color: "#71717a" }}>{r.label}</span>
                    <span style={{ color: val(p, r.key) === "—" ? "#333" : val(p, r.key) === "✓" ? "#22c55e" : "#ededed", fontWeight: 500 }}>{val(p, r.key)}</span>
                  </div>
                ))}
                <button onClick={() => isCurrent ? null : p.price === 0 ? router.push("/claim") : checkout(p.name)}
                  disabled={isCurrent || loading === p.name}
                  style={{ width: "100%", marginTop: 16, background: isCurrent ? "#111" : p.price === 0 ? "#1a1a1a" : "#fff", color: isCurrent ? "#333" : p.price === 0 ? "#ededed" : "#000", border: "none", padding: "11px 0", borderRadius: 7, fontSize: 13, fontWeight: 600 }}>
                  {loading === p.name ? "..." : isCurrent ? "Current plan" : p.price === 0 ? "Get started" : `Upgrade to ${p.label}`}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: "center", fontSize: 13, color: "#52525b" }}>
          Questions? <a href="mailto:support@postal.zero" style={{ color: "#ededed" }}>support@postal.zero</a>
        </div>
      </div>
    </div>
  )
}
'''.lstrip())

# ── DASHBOARD ─────────────────────────────────────────────
w(f'{R}/src/app/dashboard/page.tsx', '''
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, clearToken } from "../../lib/api"

const PLAN_COLOR: Record<string, string> = { FREE: "#52525b", STARTER: "#3b82f6", PRO: "#8b5cf6", BUSINESS: "#f97316", ENTERPRISE: "#22c55e" }
const PLAN_LIMIT: Record<string, number> = { FREE: 100, STARTER: 2000, PRO: 20000, BUSINESS: 200000, ENTERPRISE: -1 }

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [billing, setBilling] = useState<any>(null)
  const [mail, setMail] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [hooks, setHooks] = useState<any[]>([])
  const [keyLabel, setKeyLabel] = useState("")
  const [hookUrl, setHookUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"overview"|"keys"|"webhooks">("overview")

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return }
    Promise.all([api.me(), api.stats(), api.mail(), api.billing(), api.keys(), api.webhooks()])
      .then(([u, s, m, b, k, h]) => { setUser(u); setStats(s); setMail(m.mail || []); setBilling(b); setKeys(k.keys || []); setHooks(h.webhooks || []) })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false))
  }, [router])

  const createKey = async () => {
    if (!keyLabel.trim()) return
    const d = await api.createKey(keyLabel)
    if (d.error) { alert(d.error); return }
    alert(`Agent key created\n\nKey: ${d.key}\n\nStore this securely — shown only once.`)
    setKeyLabel(""); setKeys(await api.keys().then((r: any) => r.keys || []))
  }

  const addHook = async () => {
    if (!hookUrl.trim()) return
    const d = await api.addWebhook(hookUrl)
    if (d.error) { alert(d.error); return }
    alert(`Webhook created\n\nSecret: ${d.secret}\n\nStore this — shown only once.`)
    setHookUrl(""); setHooks(await api.webhooks().then((r: any) => r.webhooks || []))
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#52525b", fontSize: 14 }}>Loading...</div>

  const plan = billing?.plan || "FREE"
  const used = billing?.usage?.messagesThisMonth || 0
  const limit = PLAN_LIMIT[plan]
  const pct = limit === -1 ? 5 : Math.min(100, (used / limit) * 100)
  const barColor = pct > 80 ? "#ef4444" : pct > 60 ? "#f97316" : "#22c55e"

  const card: React.CSSProperties = { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: "18px 20px", marginBottom: 12 }
  const inp: React.CSSProperties = { flex: 1, background: "#000", border: "1px solid #1a1a1a", color: "#ededed", padding: "9px 12px", borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit" }

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 220, background: "#000", borderRight: "1px solid #111", padding: "20px 12px", display: "flex", flexDirection: "column" }}>
        <a href="/" style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em", padding: "8px 10px", display: "block", marginBottom: 24 }}>Postal Zero</a>
        {[["overview","◎ Overview"], ["keys","⬡ Agent Keys"], ["webhooks","◈ Webhooks"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t as any)}
            style={{ width: "100%", textAlign: "left", background: tab === t ? "#111" : "transparent", border: "none", color: tab === t ? "#ededed" : "#52525b", padding: "8px 10px", borderRadius: 7, fontSize: 13, fontWeight: tab === t ? 500 : 400, marginBottom: 2 }}>
            {l}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: "1px solid #111", paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: "#52525b", padding: "4px 10px", marginBottom: 4 }}>{user?.handle}@postal.zero</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px" }}>
            <span style={{ background: PLAN_COLOR[plan], color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.05em" }}>{plan}</span>
            <a href="/pricing" style={{ fontSize: 11, color: "#52525b" }}>Upgrade →</a>
          </div>
          <button onClick={() => { clearToken(); router.push("/login") }} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#52525b", padding: "8px 10px", fontSize: 12, borderRadius: 7, marginTop: 4 }}>Sign out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 220, padding: "32px 40px", maxWidth: "calc(100% - 220px)" }}>

        {tab === "overview" && <>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 24 }}>Overview</h1>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 12 }}>
            {[["Total messages", stats?.total || 0, "◎"], ["Unread", stats?.unread || 0, "◉"], ["Agent keys", keys.length, "⬡"]].map(([l, v, i]) => (
              <div key={l as string} style={card}>
                <div style={{ fontSize: 11, color: "#52525b", marginBottom: 8 }}>{i} {l}</div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Usage */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 10 }}>
              <span style={{ color: "#71717a" }}>Monthly message usage</span>
              <span style={{ color: barColor, fontFamily: "monospace" }}>{used.toLocaleString()} / {limit === -1 ? "∞" : limit.toLocaleString()}</span>
            </div>
            <div style={{ background: "#111", borderRadius: 4, height: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 4, transition: "width 0.5s" }} />
            </div>
            {plan === "FREE" && used > 80 && <a href="/pricing" style={{ fontSize: 12, color: "#3b82f6", display: "block", marginTop: 8 }}>Upgrade for more →</a>}
          </div>

          {/* Recent mail */}
          <div style={{ ...card, marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Recent messages</span>
              <a href="/inbox" style={{ fontSize: 12, color: "#52525b" }}>View all →</a>
            </div>
            {mail.length === 0
              ? <div style={{ color: "#52525b", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No messages yet<br /><span style={{ fontSize: 12 }}>Share {user?.handle}@postal.zero to get started</span></div>
              : mail.slice(0, 8).map((m: any) => (
                <div key={m.id} onClick={() => router.push("/inbox")} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #111", cursor: "pointer" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.isRead ? "transparent" : "#3b82f6", marginTop: 5, flexShrink: 0, border: m.isRead ? "1px solid #333" : "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: m.isRead ? 400 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.subject}</div>
                    <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>{m.senderName} · {new Date(m.deliveredAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
          </div>
        </>}

        {tab === "keys" && <>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Agent Keys</h1>
          <p style={{ color: "#71717a", fontSize: 13, marginBottom: 24 }}>Keys allow AI agents to send messages to your address. Each key is stored as a SHA-256 hash — raw key shown once.</p>
          <div style={card}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input style={inp} placeholder="Key label (e.g. my-agent)" value={keyLabel} onChange={e => setKeyLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && createKey()} />
              <button onClick={createKey} style={{ background: "#fff", color: "#000", border: "none", padding: "9px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600 }}>Create</button>
            </div>
            {keys.length === 0
              ? <div style={{ color: "#52525b", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No keys yet</div>
              : keys.map((k: any) => (
                <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #111", fontSize: 13 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{k.label}</div>
                    <div style={{ fontSize: 11, color: "#52525b", fontFamily: "monospace", marginTop: 2 }}>{k.preview} · {k.deliveries} deliveries</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#52525b" }}>{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "Never used"}</div>
                  <button onClick={async () => { await api.revokeKey(k.id); setKeys(keys.filter((x: any) => x.id !== k.id)) }}
                    style={{ background: "transparent", border: "1px solid #222", color: "#ef4444", padding: "5px 12px", borderRadius: 6, fontSize: 12 }}>Revoke</button>
                </div>
              ))}
          </div>
          <div style={{ marginTop: 16, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "14px 16px", fontSize: 12, color: "#52525b", fontFamily: "monospace" }}>
            curl -X POST https://postal-zero-api.fly.dev/api/v1/send/{user?.handle} \<br />
            &nbsp;&nbsp;-H "X-Agent-Key: YOUR_KEY" \<br />
            &nbsp;&nbsp;-d {`'{"senderName":"Agent","senderEmail":"a@b.com","subject":"Hello","body":"World"}'`}
          </div>
        </>}

        {tab === "webhooks" && <>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Webhooks</h1>
          <p style={{ color: "#71717a", fontSize: 13, marginBottom: 24 }}>Get notified in real-time when messages arrive. Payloads are signed with HMAC-SHA256.</p>
          {plan === "FREE" && (
            <div style={{ ...card, border: "1px solid #1a1a2e", background: "#0a0a1a" }}>
              <span style={{ fontSize: 13, color: "#71717a" }}>Webhooks require Starter plan or higher. </span>
              <a href="/pricing" style={{ fontSize: 13, color: "#3b82f6" }}>Upgrade →</a>
            </div>
          )}
          <div style={card}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input style={inp} placeholder="https://your-server.com/webhook" value={hookUrl} onChange={e => setHookUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addHook()} />
              <button onClick={addHook} style={{ background: "#fff", color: "#000", border: "none", padding: "9px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600 }}>Add</button>
            </div>
            {hooks.length === 0
              ? <div style={{ color: "#52525b", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No webhooks registered</div>
              : hooks.map((h: any) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #111", fontSize: 13 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.url}</div>
                    <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>{h.deliveryCount} delivered · {h.failureCount} failed</div>
                  </div>
                  <button onClick={async () => { await api.delWebhook(h.id); setHooks(hooks.filter((x: any) => x.id !== h.id)) }}
                    style={{ background: "transparent", border: "1px solid #222", color: "#ef4444", padding: "5px 12px", borderRadius: 6, fontSize: 12 }}>Delete</button>
                </div>
              ))}
          </div>
        </>}
      </div>
    </div>
  )
}
'''.lstrip())

print("\nAll pages written. Now run:")
print("  cd ~/postal-zero/web && npx vercel --prod")
