"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "../../lib/api"
export default function Inbox() {
  const router = useRouter()
  const [mail, setMail] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [unlockPassword, setUnlockPassword] = useState("")
  const [decryptedBody, setDecryptedBody] = useState<string|null>(null)
  const [decryptError, setDecryptError] = useState("")

  const unlock = async () => {
    if (!selected?.payload?.sealed) return
    try {
      const enc = new TextEncoder()
      const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
      const salt = fromB64(selected.payload.salt)
      const nonce = fromB64(selected.payload.nonce)
      const ciphertext = fromB64(selected.payload.ciphertext)
      const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(unlockPassword), "PBKDF2", false, ["deriveKey"])
      const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
      )
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ciphertext)
      setDecryptedBody(new TextDecoder().decode(decrypted))
      setDecryptError("")
    } catch {
      setDecryptError("Wrong password or corrupted message")
    }
  }
  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return }
    api.mail().then((d: any) => setMail(d.mail || [])).finally(() => setLoading(false))
    const interval = setInterval(() => {
      api.mail().then((d: any) => setMail(d.mail || []))
    }, 3000)
    return () => clearInterval(interval)
  }, [router])
  const open = async (m: any) => {
    setUnlockPassword("")
    setDecryptedBody(null)
    setDecryptError("")
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
              <div style={{ fontWeight: m.isRead ? 400 : 700, fontSize: 13, marginBottom: 2 }}>
                {m.payload?.sealed ? `🔒 Sealed · ${m.subject}` : m.subject}
              </div>
              <div style={{ fontSize: 11, color: "#9b9b7a" }}>{m.senderName}</div>
              <div style={{ fontSize: 11, color: m.payload?.sealed ? "#a78bfa" : "#666", marginTop: 2 }}>
                {m.payload?.sealed ? "Encrypted message — unlock required" : m.bodyPreview?.slice(0, 50)}
              </div>
            </div>
          ))}
      </div>
      <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        {!selected ? <div style={{ color: "#666", fontSize: 14 }}>Select a message</div> : (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>{selected.subject}</h2>
              <div style={{ fontSize: 12, color: "#9b9b7a" }}>From: {selected.senderName}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{new Date(selected.deliveredAt).toLocaleString()}</div>
              <a href={`/receipt/${selected.deliveryToken}`} style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none" }}>View receipt →</a>
            </div>
            <button onClick={() => router.push(`/compose?to=${selected.senderHandle || ""}&subject=${encodeURIComponent("Re: " + selected.subject)}`)} style={{ background: "#fff", color: "#000", border: "none", padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>Reply</button>
            <div style={{ borderTop: "1px solid #1e1e2e", paddingTop: 24 }}>
              {selected.payload?.sealed ? (
                decryptedBody ? (
                  <div>
                    <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 12 }}>🔓 Message unlocked</div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>{decryptedBody}</div>
                  </div>
                ) : (
                  <div style={{ background: "#0a0a1a", border: "1px solid #1a1a3e", borderRadius: 10, padding: 20 }}>
                    <div style={{ fontSize: 13, color: "#a78bfa", marginBottom: 12 }}>🔒 Sealed message — end-to-end encrypted</div>
                    <div style={{ fontSize: 12, color: "#52525b", marginBottom: 12 }}>Enter the unlock password to decrypt this message locally.</div>
                    <input type="password" placeholder="Unlock password" value={unlockPassword}
                      onChange={e => setUnlockPassword(e.target.value)}
                      style={{ width: "100%", background: "#000", border: "1px solid #1a1a1a", color: "#ededed", padding: "10px 12px", borderRadius: 7, fontSize: 13, outline: "none", marginBottom: 8 }} />
                    {decryptError && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{decryptError}</div>}
                    <button onClick={unlock} style={{ background: "#4c1d95", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Unlock</button>
                  </div>
                )
              ) : (
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>{selected.body}</div>
              )}
              {selected.payload && !selected.payload.sealed && (
                <div style={{ marginTop: 24, background: "#111118", border: "1px solid #222", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#9b9b7a", marginBottom: 8 }}>STRUCTURED PAYLOAD</div>
                  <pre style={{ margin: 0, fontSize: 11, color: "#22c55e", overflow: "auto" }}>{JSON.stringify(selected.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
