const BASE = "https://postalzero.dev"
const token = () => typeof window !== "undefined" ? localStorage.getItem("token") : ""
const auth = () => ({ "Authorization": `Bearer ${token()}`, "Content-Type": "application/json" })

const request = async (path: string, init: RequestInit = {}) => {
  const send = () => fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...auth(), ...init.headers }
  })

  let r = await send()

  if (r.status === 401 && await refreshAccessToken()) {
    r = await send()
  }

  return r.json()
}

const get = (path: string) => request(path)
const post = (path: string, body?: any) =>
  request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined })
const del = (path: string) => request(path, { method: "DELETE" })

export const api = {
  checkHandle: (handle: string) => get(`/api/v1/address/check/${handle}`),
  register:    (form: any)       => post("/api/v1/auth/register", form),
  login:       (form: any)       => post("/api/v1/auth/login", form),
  me:          ()                => get("/api/v1/auth/me"),
  stats:       ()                => get("/api/v1/mail/stats"),
  mail:        ()                => get("/api/v1/mail"),
  getMail:     (id: string)      => get(`/api/v1/mail/${id}`),
  compose:     (handle: string, body: any) =>
    post(`/api/v1/compose/${handle}`, body),
  keys:        ()                => get("/api/v1/keys"),
  createKey:   (label: string)   => post("/api/v1/keys", { label }),
  revokeKey:   (id: string)      => del(`/api/v1/keys/${id}`),
  agents:      ()                => get("/api/v1/agents"),
  createAgent: (handle: string, displayName: string) =>
    post("/api/v1/agents", { handle, displayName }),
  agentTokens: (agentId: string) =>
    get(`/api/v1/agents/${agentId}/tokens`),
  createAgentToken: (agentId: string, label: string = "default", scopes?: string[]) =>
    post(`/api/v1/agents/${agentId}/tokens`, { label, ...(scopes ? { scopes } : {}) }),
  revokeAgentToken: (agentId: string, tokenId: string) =>
    del(`/api/v1/agents/${agentId}/tokens/${tokenId}`),
  webhooks:    ()                => get("/api/v1/webhooks"),
  addWebhook:  (url: string)     => post("/api/v1/webhooks", { url }),
  delWebhook:  (id: string)      => del(`/api/v1/webhooks/${id}`),
  billing:     ()                => get("/api/v1/billing/status"),
  checkout:    (plan: string)    => post("/api/v1/billing/checkout", { plan }),
  receipt:     (token: string)   => get(`/api/v1/receipt/${token}`),
}

export const setToken = (t: string) => localStorage.setItem("token", t)
export const setRefreshToken = (t: string) => localStorage.setItem("refreshToken", t)
export const getRefreshToken = () => typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null

export const refreshAccessToken = async () => {
  const rt = getRefreshToken()
  if (!rt) return false
  try {
    const r = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt })
    })
    const d = await r.json()
    if (d.accessToken) { setToken(d.accessToken); return true }
    return false
  } catch { return false }
}
export const clearToken = () => localStorage.removeItem("token")
export const getToken = () => typeof window !== "undefined" ? localStorage.getItem("token") : null
