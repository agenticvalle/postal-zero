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
    const interval = setInterval(() => {
      api.stats().then((s: any) => setStats(s))
      api.mail().then((m: any) => setMail(m.mail || []))
      api.billing().then((b: any) => setBilling(b))
    }, 10000)
    return () => clearInterval(interval)
  }, [router])

  const createKey = async () => {
    if (!keyLabel.trim()) return
    const d = await api.createKey(keyLabel)
    if (d.error) { alert(d.error); return }
    alert(`Agent key created

Key: ${d.key}

Store this securely — shown only once.`)
    setKeyLabel(""); setKeys(await api.keys().then((r: any) => r.keys || []))
  }

  const addHook = async () => {
    if (!hookUrl.trim()) return
    const d = await api.addWebhook(hookUrl)
    if (d.error) { alert(d.error); return }
    alert(`Webhook created

Secret: ${d.secret}

Store this — shown only once.`)
    setHookUrl(""); setHooks(await api.webhooks().then((r: any) => r.webhooks || []))
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#52525b", fontSize: 14 }}>Loading...</div>

  const plan = billing?.plan || "FREE"
  const used = billing?.usage?.messagesThisMonth || 0
  const limit = PLAN_LIMIT[plan]
  const pct = limit === -1 ? 5 : Math.min(100, (used / limit) * 100)
  const barColor = pct > 80 ? "#ef4444" : pct > 60 ? "#f97316" : "#22c55e"

  const card: React.CSSProperties = { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: "16px", marginBottom: 12 }
  const inp: React.CSSProperties = { flex: 1, background: "#000", border: "1px solid #1a1a1a", color: "#ededed", padding: "9px 12px", borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit" }

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`@media(max-width:600px){.sidebar{display:none!important}.main{margin-left:0!important;padding:16px!important}.topbar{display:flex!important}}`}</style>
      {/* Sidebar */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 220, background: "#000", borderRight: "1px solid #111", padding: "20px 12px", display: "flex", flexDirection: "column" }}>
        <a href="/" style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em", padding: "8px 10px", display: "block", marginBottom: 16 }}>Postal Zero</a>
        <a href="/compose" style={{ display:"block", background:"#fff", color:"#000", padding:"8px 10px", borderRadius:6, fontSize:12, fontWeight:600, textAlign:"center", marginBottom:12, textDecoration:"none" }}>✉ New message</a>
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
      <div style={{ marginLeft: 0, padding: "16px", maxWidth: "100%" }}>

        {tab === "overview" && <>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 24 }}>Overview</h1>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
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
