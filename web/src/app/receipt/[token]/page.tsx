"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api } from "../../../lib/api"
export default function Receipt() {
  const { token } = useParams()
  const [r, setR] = useState<any>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    if (!token) return
    api.receipt(token as string).then((d: any) => d.error ? setErr(true) : setR(d)).catch(() => setErr(true))
  }, [token])
  if (!r && !err) return <div style={{ padding: 40 }}>Verifying...</div>
  if (err) return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✗</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Receipt not found</div>
      <a href="/" style={{ color: "#3b82f6", fontSize: 13, display: "block", marginTop: 16 }}>← postal.zero</a>
    </div>
  )
  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>✓</div>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#22c55e", marginBottom: 8 }}>DELIVERY VERIFIED</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{r.subject}</div>
      </div>
      <div style={{ background: "#111118", border: "1px solid #1e2e1e", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        {[["From", r.from], ["To", r.to], ["Delivered", new Date(r.deliveredAt).toLocaleString()], ["Status", r.status], ["Type", r.mailType]].map(([l, v]) => (
          <div key={l as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0f0f15", fontSize: 13 }}>
            <span style={{ color: "#9b9b7a" }}>{l}</span><span>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "#0f0f18", border: "1px solid #1a1a2e", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#666", marginBottom: 6 }}>HMAC SIGNATURE</div>
        <div style={{ fontSize: 10, color: "#9b9b7a", wordBreak: "break-all" }}>{r.receiptSig}</div>
      </div>
      <div style={{ background: "#111118", border: "1px solid #222", borderRadius: 8, padding: 14, fontSize: 12, color: "#9b9b7a", lineHeight: 1.6 }}>
        This receipt is cryptographic proof this message was delivered. The HMAC signature cannot be forged or backdated.
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}><a href="/" style={{ color: "#3b82f6", fontSize: 12 }}>← postal.zero</a></div>
    </div>
  )
}
