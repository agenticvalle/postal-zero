"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [showSub, setShowSub] = useState(false)
  const [showBtn, setShowBtn] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 300)
    setTimeout(() => setShowSub(true), 900)
    setTimeout(() => setShowBtn(true), 1500)
  }, [])

  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "24px"
    }}>
      <h1 style={{
        fontSize: "clamp(36px, 6vw, 72px)",
        fontWeight: 700, letterSpacing: "-0.04em",
        color: "#fff", marginBottom: 16,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.8s ease, transform 0.8s ease"
      }}>
        Postal Zero
      </h1>

      <p style={{
        fontSize: "clamp(15px, 2vw, 20px)",
        color: "#71717a", marginBottom: 40, maxWidth: 400,
        opacity: showSub ? 1 : 0,
        transform: showSub ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.8s ease, transform 0.8s ease"
      }}>
        One address. Every message counts.
      </p>

      <div style={{
        display: "flex", gap: 12,
        opacity: showBtn ? 1 : 0,
        transform: showBtn ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.8s ease, transform 0.8s ease"
      }}>
        <button onClick={() => router.push("/claim")} style={{
          background: "#fff", color: "#000", border: "none",
          padding: "12px 28px", borderRadius: 8,
          fontSize: 14, fontWeight: 600, cursor: "pointer"
        }}>
          Get started
        </button>
        <button onClick={() => router.push("/login")} style={{
          background: "transparent", color: "#71717a",
          border: "1px solid #222", padding: "12px 28px",
          borderRadius: 8, fontSize: 14, cursor: "pointer"
        }}>
          Sign in
        </button>
      </div>
    </div>
  )
}
