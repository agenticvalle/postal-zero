"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "../../lib/api"

const PLANS = [
  { name: "FREE", label: "Free", price: 0,  msg: "100",  keys: "3", hooks: "—", ai: false },
  { name: "PRO",  label: "Pro",  price: 5,  msg: "∞",    keys: "∞", hooks: "∞", ai: true, popular: true },
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
