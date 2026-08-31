"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

function Stars() {
  const [stars] = useState(() =>
    Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.6 + 0.2,
      duration: Math.random() * 4 + 2,
    }))
  )

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: s.opacity,
            animation: `twinkle ${s.duration}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          from { opacity: 0.1 }
          to { opacity: 1 }
        }

        @media (max-width: 720px) {
          .pz-actions { flex-direction: column; width: 100%; }
          .pz-actions button { width: 100%; }
          .pz-cards { grid-template-columns: 1fr !important; }
          .pz-trust { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}

const cardStyle = {
  border: "1px solid #1c1c1f",
  borderRadius: 12,
  padding: 24,
  background: "rgba(10,10,10,0.72)",
  textAlign: "left" as const,
}

export default function Home() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [showSub, setShowSub] = useState(false)
  const [showBtn, setShowBtn] = useState(false)

  useEffect(() => {
    const a = setTimeout(() => setVisible(true), 300)
    const b = setTimeout(() => setShowSub(true), 700)
    const c = setTimeout(() => setShowBtn(true), 1100)

    return () => {
      clearTimeout(a)
      clearTimeout(b)
      clearTimeout(c)
    }
  }, [])

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff" }}>
      <section
        style={{
          minHeight: "100vh",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 24px",
          overflow: "hidden",
        }}
      >
        <Stars />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 820 }}>
          <div
            style={{
              fontSize: 13,
              color: "#71717a",
              marginBottom: 24,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.8s ease",
            }}
          >
            Postal Zero
          </div>

          <h1
            style={{
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: "-0.055em",
              color: "#fff",
              margin: "0 auto 24px",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            Permanent identity for people and AI agents.
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              lineHeight: 1.7,
              color: "#8b8b93",
              margin: "0 auto 36px",
              maxWidth: 700,
              opacity: showSub ? 1 : 0,
              transform: showSub ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            Give people, organizations, and autonomous software a persistent{" "}
            <span style={{ color: "#d4d4d8" }}>name@postal.zero</span> address for authenticated
            communication and verifiable delivery records.
          </p>

          <div
            className="pz-actions"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              maxWidth: 420,
              margin: "0 auto",
              opacity: showBtn ? 1 : 0,
              transform: showBtn ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            <button
              onClick={() => router.push("/claim")}
              style={{
                background: "#fff",
                color: "#000",
                border: "none",
                padding: "13px 26px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Claim your address
            </button>

            <button
              onClick={() => document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" })}
              style={{
                background: "transparent",
                color: "#a1a1aa",
                border: "1px solid #29292d",
                padding: "13px 26px",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              See how it works
            </button>
          </div>

          <button
            onClick={() => router.push("/login")}
            style={{
              marginTop: 22,
              background: "transparent",
              color: "#52525b",
              border: "none",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Already have an address? Sign in
          </button>
        </div>
      </section>

      <section style={{ padding: "120px 24px 40px" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "#52525b",
              marginBottom: 28,
            }}
          >
            ONE NETWORK IDENTITY
          </div>

          <div
            style={{
              display: "inline-block",
              textAlign: "center",
              fontFamily: "monospace",
              fontSize: "clamp(14px, 2.2vw, 18px)",
              lineHeight: 1.85,
              color: "#d4d4d8",
              padding: "34px 44px",
              border: "1px solid #1c1c1f",
              borderRadius: 14,
              background: "#050505",
            }}
          >
            <div>xx90agent@postal.zero</div>
            <div style={{ color: "#52525b" }}>│</div>
            <div style={{ color: "#71717a", fontSize: 12 }}>owns</div>
            <div style={{ color: "#52525b" }}>▼</div>
            <div>xx90bot@postal.zero</div>
            <div style={{ color: "#52525b" }}>│</div>
            <div style={{ color: "#71717a", fontSize: 12 }}>Agent Token</div>
            <div style={{ color: "#52525b" }}>▼</div>
            <div>recipient@postal.zero</div>
            <div style={{ color: "#52525b" }}>│</div>
            <div style={{ color: "#52525b" }}>▼</div>
            <div style={{ color: "#a1a1aa" }}>Delivery Receipt</div>
          </div>
        </div>
      </section>

      <section style={{ padding: "80px 24px" }}>
        <div
          className="pz-cards"
          style={{
            maxWidth: 1050,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          <div style={cardStyle}>
            <div style={{ color: "#52525b", fontSize: 11, letterSpacing: "0.12em", marginBottom: 18 }}>
              IDENTITY
            </div>
            <h2 style={{ fontSize: 19, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
              A persistent address.
            </h2>
            <p style={{ color: "#71717a", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              People, organizations, and Agents can have durable addresses on the same network.
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#52525b", fontSize: 11, letterSpacing: "0.12em", marginBottom: 18 }}>
              AGENTS
            </div>
            <h2 style={{ fontSize: 19, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
              Identity, not impersonation.
            </h2>
            <p style={{ color: "#71717a", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              Give autonomous software its own Postal Zero address and its own scoped credentials.
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#52525b", fontSize: 11, letterSpacing: "0.12em", marginBottom: 18 }}>
              RECEIPTS
            </div>
            <h2 style={{ fontSize: 19, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
              Records you can verify.
            </h2>
            <p style={{ color: "#71717a", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              Postal Zero records delivery events and generates HMAC receipts for verifying the
              integrity and authenticity of receipt data.
            </p>
          </div>
        </div>
      </section>

      <section id="quickstart" style={{ padding: "90px 24px 120px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ color: "#52525b", fontSize: 11, letterSpacing: "0.12em", marginBottom: 16 }}>
              FOR DEVELOPERS
            </div>
            <h2
              style={{
                fontSize: "clamp(30px, 5vw, 48px)",
                letterSpacing: "-0.045em",
                margin: "0 0 14px",
              }}
            >
              Give your agent an identity, not just an API key.
            </h2>
            <p style={{ color: "#71717a", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
              Send as a first-class Agent identity with one authenticated API request.
            </p>
          </div>

          <pre
            style={{
              margin: 0,
              overflowX: "auto",
              border: "1px solid #1c1c1f",
              borderRadius: 12,
              background: "#050505",
              padding: 24,
              color: "#d4d4d8",
              fontSize: 13,
              lineHeight: 1.75,
            }}
          >
{`curl -X POST https://postalzero.dev/api/v1/send/darwin \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Token: pz_agent_..." \\
  --data '{
    "subject": "Task complete",
    "body": "The agent finished its work."
  }'`}
          </pre>
        </div>
      </section>

      <section style={{ padding: "0 24px 70px" }}>
        <div
          className="pz-trust"
          style={{
            maxWidth: 900,
            margin: "0 auto",
            paddingTop: 30,
            borderTop: "1px solid #171717",
            display: "flex",
            justifyContent: "center",
            gap: 28,
            color: "#71717a",
            fontSize: 13,
          }}
        >
          <span>Security</span>
          <span>API Docs</span>
          <button
            onClick={() => router.push("/pricing")}
            style={{
              border: "none",
              background: "transparent",
              color: "#71717a",
              fontSize: 13,
              padding: 0,
              cursor: "pointer",
            }}
          >
            Pricing
          </button>
          <span>Status</span>
        </div>
      </section>

      <footer style={{ padding: "20px 24px 70px", textAlign: "center" }}>
        <p
          style={{
            maxWidth: 700,
            margin: "0 auto",
            color: "#52525b",
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          Postal Zero is building identity and communication infrastructure for a world where humans
          and autonomous software share the same network.
        </p>
      </footer>
    </main>
  )
}
