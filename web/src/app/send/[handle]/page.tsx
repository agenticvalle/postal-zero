"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "../../../lib/api"
export default function Send() {
  const { handle } = useParams()
  const [recipient, setRecipient] = useState<any>(null)
  const [step, setStep] = useState<"email"|"otp"|"send"|"done">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [sendToken, setSendToken] = useState("")
  const [form, setForm] = useState({ senderName: "", subject: "", body: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const API = process.env.NEXT_PUBLIC_API_URL || "https://postal-zero-api.fly.dev"
  useEffect(() => {
    if (!handle) return
    fetch(`${API}/api/v1/address/check/${handle}`).then(r => r.json()).then(d => {
      if (!d.available) setRecipient({ handle, displayName: handle })
    })
    fetch(`${API}/api/v1/send/${handle}`).then(r => r.json()).then(d => { if (!d.error) setRecipient(d) })
  }, [handle, API])
  const verify = async () => {
    setLoading(true); setError("")
    const r = await fetch(`${API}/api/v1/send/${handle}/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senderEmail: email }) })
    const d = await r.json()
    if (d.ok) setStep("otp"); else setError(d.error || "Failed")
    setLoading(false)
  }
  const confirm = async () => {
    setLoading(true); setError("")
    const r = await fetch(`${API}/api/v1/send/${handle}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senderEmail: email, code: otp }) })
    const d = await r.json()
    if (d.sendToken) { setSendToken(d.sendToken); setStep("send") } else setError(d.error || "Invalid code")
    setLoading(false)
  }
  const send = async () => {
    setLoading(true); setError("")
    const r = await fetch(`${API}/api/v1/send/${handle}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, senderEmail: email, sendToken }) })
    const d = await r.json()
    if (d.ok) setStep("done"); else setError(d.error || "Failed")
    setLoading(false)
  }
  const s: any = { width: "100%", background: "#111118", border: "1px solid #333", color: "#e8e4d8", padding: "12px 14px", borderRadius: 6, fontSize: 14, fontFamily: "monospace", boxSizing: "border-box" }
  const b: any = { width: "100%", marginTop: 12, background: "#e8e4d8", color: "#0a0a0f", border: "none", padding: "13px 0", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }
  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: "0 24px" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#9b9b7a", marginBottom: 8 }}>POSTAL ZERO · SEND</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 24 }}>To: {recipient?.displayName || handle}<span style={{ color: "#9b9b7a", fontSize: 14 }}>@postal.zero</span></div>
      {step === "email" && <>
        <input style={s} placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} />
        {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</div>}
        <button style={b} onClick={verify} disabled={loading}>{loading ? "Sending code..." : "Send verification code →"}</button>
      </>}
      {step === "otp" && <>
        <div style={{ fontSize: 12, color: "#9b9b7a", marginBottom: 12 }}>Code sent to {email}</div>
        <input style={s} placeholder="6-digit code" value={otp} onChange={e => setOtp(e.target.value)} />
        {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</div>}
        <button style={b} onClick={confirm} disabled={loading}>{loading ? "Verifying..." : "Verify →"}</button>
      </>}
      {step === "send" && <>
        <input style={s} placeholder="Your name" value={form.senderName} onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))} />
        <input style={{ ...s, marginTop: 10 }} placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
        <textarea style={{ ...s, marginTop: 10, height: 120, resize: "vertical" }} placeholder="Message" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
        {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</div>}
        <button style={b} onClick={send} disabled={loading}>{loading ? "Sending..." : "Send message →"}</button>
      </>}
      {step === "done" && <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Message delivered</div>
        <div style={{ color: "#9b9b7a", fontSize: 13 }}>Your message was delivered to {handle}@postal.zero</div>
      </div>}
    </div>
  )
}
