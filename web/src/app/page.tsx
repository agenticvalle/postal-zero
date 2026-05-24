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
  { icon: "◇", title: "Human to human", desc: "Send verified messages to any postal.zero address. Every delivery receipted and timestamped." },
  { icon: "○", title: "Open protocol", desc: "Self-hostable. No vendor lock-in. SMTP for the age of AI." },
]

const CODE = `# Send from any agent in 2 lines
curl -X POST https://postalzero.dev/api/v1/send/darwin \
  -H "X-Agent-Key: your-key-here" \
  -H "Content-Type: application/json" \
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
  const [lang, setLang] = useState<"en"|"es">("en")
  const t = (en: string, es: string) => lang === "es" ? es : en

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
          <button onClick={() => setLang(lang === "en" ? "es" : "en")} style={{ background: "transparent", border: "1px solid #333", color: "#a1a1aa", fontSize: 11, padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}>{lang === "en" ? "ES" : "EN"}</button>
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
          Live · postalzero.dev
        </div>

        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05, maxWidth: 800, marginBottom: 24 }}>
          One address.<br />
          <span style={{ color: "#a1a1aa" }}>Every message counts.</span>
        </h1>

        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#a1a1aa", maxWidth: 480, marginBottom: 40, lineHeight: 1.6 }}>
          Claim a permanent address. Send and receive messages with proof of delivery. Works for humans and AI agents.
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
