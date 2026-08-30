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
  const [agents, setAgents] = useState<any[]>([])
  const [agentHandle, setAgentHandle] = useState("")
  const [agentName, setAgentName] = useState("")
  const [creatingAgent, setCreatingAgent] = useState(false)
  const [copiedAgentField, setCopiedAgentField] = useState<string|null>(null)
  const [newAgentToken, setNewAgentToken] = useState<any|null>(null)
  const [copiedAgentToken, setCopiedAgentToken] = useState(false)
  const [creatingTokenFor, setCreatingTokenFor] = useState<string|null>(null)
  const [keyLabel, setKeyLabel] = useState("")
  const [newKey, setNewKey] = useState<string|null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [hookUrl, setHookUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"overview"|"agents"|"keys"|"webhooks">("overview")
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])

  const doSearch = async (q: string) => {
    setSearch(q)
    if (q.length < 2) { setSearchResults([]); return }
    const r = await fetch(`https://postalzero.dev/api/v1/address/search?q=${q}`)
    const d = await r.json()
    setSearchResults(d.results || [])
  }

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return }
    api.me().then((u:any) => { if(!u || u.error) { router.push("/login"); return }
      setUser(u)
      api.stats().then((s:any) => setStats(s)).catch(()=>{})
      api.mail().then((m:any) => setMail(m.mail||[])).catch(()=>{})
      api.billing().then((b:any) => setBilling(b)).catch(()=>{})
      api.keys().then((k:any) => setKeys(k.keys||[])).catch(()=>{})
      api.agents().then((a:any) => setAgents(a.agents||[])).catch(()=>{})
      api.webhooks().then((h:any) => setHooks(h.webhooks||[])).catch(()=>{})
    }).catch(()=>router.push("/login")).finally(()=>setLoading(false))
    const interval = setInterval(() => {
      api.stats().then((s: any) => setStats(s)).catch(()=>{})
      api.mail().then((m: any) => setMail(m.mail || [])).catch(()=>{})
      api.billing().then((b: any) => setBilling(b)).catch(()=>{})
    }, 10000)
    return () => clearInterval(interval)
  }, [router])

  const createKey = async () => {
    if (!keyLabel.trim()) return
    const d = await api.createKey(keyLabel)
    if (d.error) { alert(d.error); return }
    setNewKey(d.key)
    setCopiedKey(false)
    setKeyLabel(""); setKeys(await api.keys().then((r: any) => r.keys || []))
  }

  const createAgent = async () => {
    const handle = agentHandle.trim().toLowerCase()
    const displayName = agentName.trim()
    if (!handle || !displayName || creatingAgent) return

    setCreatingAgent(true)
    try {
      const d = await api.createAgent(handle, displayName)
      if (d.error) { alert(d.error); return }
      setAgentHandle("")
      setAgentName("")
      const refreshed = await api.agents()
      setAgents(refreshed.agents || [])
    } finally {
      setCreatingAgent(false)
    }
  }

  const copyAgentValue = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedAgentField(field)
    setTimeout(() => setCopiedAgentField(null), 1500)
  }

  const createAgentToken = async (agent: any) => {
    if (creatingTokenFor) return

    setCreatingTokenFor(agent.id)
    try {
      const d = await api.createAgentToken(agent.id, "default")
      if (d.error) { alert(d.error); return }
      if (!d.token?.value) { alert("Token created but no token value was returned."); return }

      setNewAgentToken({
        ...d.token,
        address: agent.address
      })
      setCopiedAgentToken(false)
    } finally {
      setCreatingTokenFor(null)
    }
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
  const used = Number(billing?.usage?.messagesThisMonth ?? 0)
  const limit = PLAN_LIMIT[plan] ?? 100
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
        <a href="/compose" style={{ display:"block", background:"#fff", color:"#000", padding:"8px 10px", borderRadius:6, fontSize:12, fontWeight:600, textAlign:"center", marginBottom:8, textDecoration:"none" }}>✉ New message</a>
        <div style={{ position:"relative", marginBottom:12 }}>
          <input value={search} onChange={e => doSearch(e.target.value)} placeholder="Search users..." style={{ width:"100%", background:"#0a0a0a", border:"1px solid #1a1a1a", color:"#ededed", padding:"7px 10px", borderRadius:6, fontSize:12, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
          {searchResults.length > 0 && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:6, zIndex:200, marginTop:2 }}>
              {searchResults.map((r:any) => (
                <a key={r.handle} href={`/compose?to=${r.handle}`} style={{ display:"block", padding:"8px 10px", fontSize:12, color:"#ededed", textDecoration:"none", borderBottom:"1px solid #1a1a1a" }}>
                  <div style={{ fontWeight:600 }}>{r.displayName}</div>
                  <div style={{ color:"#52525b", fontSize:11 }}>{r.address}</div>
                </a>
              ))}
            </div>
          )}
        </div>
        {[["overview","◎ Overview"], ["agents","◈ Agents"], ["keys","⬡ Account API Keys"], ["webhooks","◈ Webhooks"]].map(([t, l]) => (
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
      <div style={{ marginLeft: 220, padding: "24px", maxWidth: "calc(100% - 220px)" }}>

        {tab === "overview" && <>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 24 }}>Overview</h1>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
            {[["Total messages", stats?.total || 0, "◎"], ["Unread", stats?.unread || 0, "◉"], ["Agents", agents.length, "◈"], ["Agent keys", keys.length, "⬡"]].map(([l, v, i]) => (
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
              <span style={{ color: barColor, fontFamily: "monospace" }}>{(used ?? 0).toLocaleString()} / {limit === -1 ? "∞" : (limit ?? 0).toLocaleString()}</span>
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

        {tab === "agents" && <>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Agents</h1>
          <p style={{ color: "#71717a", fontSize: 13, marginBottom: 24 }}>
            Create first-class Agent identities with their own permanent Postal Zero address.
          </p>

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Create Agent</div>

            <div style={{ display: "grid", gap: 8 }}>
              <input
                style={inp}
                placeholder="Display name (e.g. Research Agent)"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
              />

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  style={inp}
                  placeholder="Handle (e.g. research-agent)"
                  value={agentHandle}
                  onChange={e => setAgentHandle(e.target.value.toLowerCase())}
                  onKeyDown={e => e.key === "Enter" && createAgent()}
                />
                <span style={{ fontSize: 12, color: "#52525b", whiteSpace: "nowrap" }}>@postal.zero</span>
                <button
                  onClick={createAgent}
                  disabled={creatingAgent}
                  style={{ background: "#fff", color: "#000", border: "none", padding: "9px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: creatingAgent ? "default" : "pointer", opacity: creatingAgent ? 0.6 : 1 }}
                >
                  {creatingAgent ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>

          {agents.length === 0
            ? <div style={{ ...card, color: "#52525b", fontSize: 13, textAlign: "center", padding: "28px 16px" }}>No Agents yet</div>
            : agents.map((agent: any) => {
                const endpoint = "https://postalzero.dev/api/v1/agents"
                const fields = [
                  ["Address", agent.address, `address-${agent.id}`],
                  ["Address ID", agent.addressId, `addressId-${agent.id}`],
                  ["Agent ID", agent.id, `agentId-${agent.id}`],
                  ["API Endpoint", endpoint, `endpoint-${agent.id}`],
                ]

                return (
                  <div key={agent.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{agent.displayName || agent.handle}</div>
                        <div style={{ fontSize: 11, color: "#52525b", marginTop: 3 }}>Created {new Date(agent.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: agent.status === "VERIFIED" ? "#22c55e" : "#a1a1aa", border: "1px solid #222", borderRadius: 5, padding: "4px 7px", letterSpacing: "0.04em" }}>
                        {agent.status}
                      </span>
                    </div>

                    {fields.map(([label, value, copyId]) => (
                      <div key={copyId} style={{ borderTop: "1px solid #111", padding: "11px 0" }}>
                        <div style={{ fontSize: 10, color: "#52525b", marginBottom: 5 }}>{label}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontSize: 12, color: label === "Address" ? "#ededed" : "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {value || "—"}
                          </div>
                          {value && (
                            <button
                              onClick={() => copyAgentValue(copyId, value)}
                              style={{ background: "transparent", border: "1px solid #222", color: "#a1a1aa", padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", minWidth: 64 }}
                            >
                              {copiedAgentField === copyId ? "Copied" : "Copy"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div style={{ borderTop: "1px solid #111", paddingTop: 14 }}>
                      <button
                        onClick={() => createAgentToken(agent)}
                        disabled={creatingTokenFor === agent.id}
                        style={{ width: "100%", background: "#fff", color: "#000", border: "none", padding: "10px 0", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: creatingTokenFor === agent.id ? "default" : "pointer", opacity: creatingTokenFor === agent.id ? 0.6 : 1 }}
                      >
                        {creatingTokenFor === agent.id ? "Creating token..." : "Create Agent Token"}
                      </button>
                    </div>
                  </div>
                )
              })}
        </>}

        {newAgentToken && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
            <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: 24, maxWidth: 520, width: "90%" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Agent Token Created</h3>

              <div style={{ color: "#71717a", fontSize: 12, marginBottom: 16 }}>
                {newAgentToken.address || newAgentToken.handle}
              </div>

              <p style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 14 }}>
                Store this token securely. It will only be shown once.
              </p>

              <div style={{ background: "#000", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", fontSize: 12, fontFamily: "monospace", color: "#ededed", wordBreak: "break-all", marginBottom: 12 }}>
                {newAgentToken.value}
              </div>

              <button
                onClick={() => navigator.clipboard.writeText(newAgentToken.value).then(() => setCopiedAgentToken(true))}
                style={{ width: "100%", background: "#fff", color: "#000", border: "none", padding: "12px 0", borderRadius: 7, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}
              >
                {copiedAgentToken ? "Copied" : "Copy Token"}
              </button>

              <button
                onClick={() => {
                  setNewAgentToken(null)
                  setCopiedAgentToken(false)
                }}
                style={{ width: "100%", background: "transparent", color: "#71717a", border: "1px solid #222", padding: "10px 0", borderRadius: 7, fontSize: 13, cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {newKey && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: 24, maxWidth: 480, width: "90%" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Agent key created</h3>
              <p style={{ fontSize: 13, color: "#71717a", marginBottom: 16 }}>Store this securely — shown only once.</p>
              <button onClick={() => navigator.clipboard.writeText(newKey).then(() => setCopiedKey(true))} style={{ width: "100%", background: "#fff", color: "#000", border: "none", padding: "12px 0", borderRadius: 7, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>{copiedKey ? "Copied" : "Copy full key"}</button>
              <div style={{ background: "#000", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", fontSize: 13, fontFamily: "monospace", color: "#ededed", wordBreak: "break-all", marginBottom: 16 }}>{newKey}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(newKey).then(() => setCopiedKey(true))} style={{ flex: 1, background: "#fff", color: "#000", border: "none", padding: "10px 0", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{copiedKey ? "Copied" : "Copy key"}</button>
                <button onClick={() => { setNewKey(null); setCopiedKey(false) }} style={{ flex: 1, background: "transparent", color: "#71717a", border: "1px solid #222", padding: "10px 0", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>OK</button>
              </div>
            </div>
          </div>
        )}

        {tab === "keys" && <>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Account API Keys</h1>
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
                  <button onClick={() => navigator.clipboard.writeText(k.preview).then(() => alert("Key prefix copied!"))}
                    style={{ background: "transparent", border: "1px solid #222", color: "#a1a1aa", padding: "5px 12px", borderRadius: 6, fontSize: 12, marginRight: 6 }}>Copy</button>
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
