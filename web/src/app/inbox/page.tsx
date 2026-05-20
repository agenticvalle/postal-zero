"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "../../lib/api"
export default function Inbox() {
  const router = useRouter()
  const [mail, setMail] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return }
    api.mail().then((d: any) => setMail(d.mail || [])).finally(() => setLoading(false))
  }, [router])
  const open = async (m: any) => {
    const full = await api.getMail(m.id)
    setSelected(full)
    setMail(mail.map((x: any) => x.id === m.id ? { ...x, isRead: true } : x))
  }
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: 320, borderRight: "1px solid #1e1e2e", overflowY: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Inbox</span>
          <a href="/dashboard" style={{ color: "#9b9b7a", fontSize: 11, textDecoration: "none" }}>← Dashboard</a>
        </div>
        {mail.length === 0 ? <div style={{ padding: 20, color: "#666", fontSize: 12 }}>No messages yet.</div> :
          mail.map((m: any) => (
            <div key={m.id} onClick={() => open(m)} style={{ padding: "12px 20px", borderBottom: "1px solid #111", cursor: "pointer", background: selected?.id === m.id ? "#111118" : "transparent", opacity: m.isRead ? 0.6 : 1 }}>
              <div style={{ fontWeight: m.isRead ? 400 : 700, fontSize: 13, marginBottom: 2 }}>{m.subject}</div>
              <div style={{ fontSize: 11, color: "#9b9b7a" }}>{m.senderName}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{m.bodyPreview?.slice(0, 50)}</div>
            </div>
          ))}
      </div>
      <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        {!selected ? <div style={{ color: "#666", fontSize: 14 }}>Select a message</div> : (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>{selected.subject}</h2>
              <div style={{ fontSize: 12, color: "#9b9b7a" }}>From: {selected.senderName} &lt;{selected.senderEmail}&gt;</div>
              <div style={{ fontSize: 12, color: "#666" }}>{new Date(selected.deliveredAt).toLocaleString()}</div>
              <a href={`/receipt/${selected.deliveryToken}`} style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none" }}>View receipt →</a>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, borderTop: "1px solid #1e1e2e", paddingTop: 24 }}>{selected.body}</div>
            {selected.payload && (
              <div style={{ marginTop: 24, background: "#111118", border: "1px solid #222", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#9b9b7a", marginBottom: 8 }}>STRUCTURED PAYLOAD</div>
                <pre style={{ margin: 0, fontSize: 11, color: "#22c55e", overflow: "auto" }}>{JSON.stringify(selected.payload, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
