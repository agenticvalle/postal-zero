"use client"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function ComposeInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  useEffect(() => {
    const toParam = searchParams.get("to")
    const subjectParam = searchParams.get("subject")
    if (toParam) setTo(toParam)
    if (subjectParam) setSubject(subjectParam)
  }, [searchParams])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token")
    if (!token) { router.push("/login"); return }
    if (!to || !subject || !body) { setError("All fields required"); return }
    setLoading(true); setError("")
    try {
      const handle = to.replace("@postal.zero","").toLowerCase()
      const r = await fetch(`https://postalzero.dev/api/v1/compose/${handle}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body })
      })
      const d = await r.json()
      if (d.ok) setSent(true)
      else setError(d.error || "Failed to send")
    } catch { setError("Network error") }
    setLoading(false)
  }

  const inp: React.CSSProperties = { width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#ededed", padding: "11px 14px", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit" }

  if (sent) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 48 }}>✓</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Message delivered</div>
      <div style={{ color: "#71717a", fontSize: 14 }}>Sent to {to}@postal.zero</div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button onClick={() => { setSent(false); setTo(""); setSubject(""); setBody("") }} style={{ background: "#1a1a1a", color: "#ededed", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>New message</button>
        <button onClick={() => router.push("/inbox")} style={{ background: "#fff", color: "#000", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Go to inbox</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em" }}>New message</h1>
          <a href="/dashboard" style={{ color: "#52525b", fontSize: 13 }}>Back</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <input style={{ ...inp, paddingRight: 120 }} placeholder="handle" value={to} onChange={e => setTo(e.target.value)} />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#52525b" }}>@postal.zero</span>
          </div>
          <input style={inp} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
          <textarea style={{ ...inp, height: 160, resize: "vertical" }} placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} />
        </div>
        {error && <div style={{ marginTop: 10, padding: "10px 14px", background: "#1a0808", border: "1px solid #3f0e0e", borderRadius: 8, fontSize: 13, color: "#f87171" }}>{error}</div>}
        <button onClick={send} disabled={loading} style={{ width: "100%", marginTop: 14, background: loading ? "#1a1a1a" : "#fff", color: loading ? "#52525b" : "#000", border: "none", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Sending..." : "Send message →"}
        </button>
      </div>
    </div>
  )
}

export default function Compose() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#52525b" }}>Loading...</div>}>
      <ComposeInner />
    </Suspense>
  )
}
