"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { api, getToken } from "../../lib/api"

type ReceiptMode = "OFF" | "DELIVERY" | "OPENED"

function ComposeInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [me, setMe] = useState<any>(null)
  const [identityLoading, setIdentityLoading] = useState(true)

  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  const [zeroLock, setZeroLock] = useState(false)
  const [zeroLockPassword, setZeroLockPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [receiptMode, setReceiptMode] = useState<ReceiptMode>("OFF")

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState("")

  useEffect(() => {
    const toParam = searchParams.get("to")
    const subjectParam = searchParams.get("subject")

    if (toParam) setTo(toParam)
    if (subjectParam) setSubject(subjectParam)
  }, [searchParams])

  useEffect(() => {
    if (!getToken()) {
      router.push("/login")
      return
    }

    api.me()
      .then((data: any) => {
        if (data?.error) {
          router.push("/login")
          return
        }
        setMe(data)
      })
      .catch(() => setError("Could not load your Postal Zero identity."))
      .finally(() => setIdentityLoading(false))
  }, [router])

  const normalizeRecipient = (value: string) => {
    const normalized = value.trim().toLowerCase()
    return normalized.endsWith("@postal.zero")
      ? normalized.slice(0, -"@postal.zero".length)
      : normalized
  }

  const encryptBody = async (text: string, password: string) => {
    const enc = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const nonce = crypto.getRandomValues(new Uint8Array(12))

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt"]
    )

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: nonce
      },
      key,
      enc.encode(text)
    )

    const toB64 = (input: ArrayBuffer | Uint8Array) => {
      const bytes = input instanceof Uint8Array
        ? input
        : new Uint8Array(input)

      let binary = ""

      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }

      return btoa(binary)
    }

    const hashBuf = await crypto.subtle.digest("SHA-256", ciphertext)

    return {
      sealed: true,
      version: "pz-sealed-v1",
      algorithm: "AES-GCM",
      salt: toB64(salt),
      nonce: toB64(nonce),
      ciphertext: toB64(ciphertext),
      contentHash: toB64(hashBuf)
    }
  }

  const send = async () => {
    const handle = normalizeRecipient(to)

    if (!handle || !subject.trim() || !body.trim()) {
      setError("Recipient, subject, and message are required.")
      return
    }

    if (zeroLock && !zeroLockPassword) {
      setError("Enter an unlock password for Zero Lock.")
      return
    }

    if (zeroLock && zeroLockPassword !== confirmPassword) {
      setError("Zero Lock passwords do not match.")
      return
    }

    setLoading(true)
    setError("")

    try {
      let payload
      let bodyToSend = body

      if (zeroLock) {
        payload = await encryptBody(body, zeroLockPassword)
        bodyToSend = "[Zero Lock message — unlock required]"
      }

      const data = await api.compose(handle, {
        subject: subject.trim(),
        body: bodyToSend,
        receiptMode,
        ...(payload ? { payload } : {})
      })

      if (data?.ok) {
        setSentTo(`${handle}@postal.zero`)
        setSent(true)
      } else {
        setError(data?.error || "Failed to send message.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetComposer = () => {
    setSent(false)
    setSentTo("")
    setTo("")
    setSubject("")
    setBody("")
    setZeroLock(false)
    setZeroLockPassword("")
    setConfirmPassword("")
    setReceiptMode("OFF")
    setError("")
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0a0a0a",
    border: "1px solid #1a1a1a",
    color: "#ededed",
    padding: "12px 14px",
    borderRadius: 9,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box"
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#71717a",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8
  }

  const cardStyle: React.CSSProperties = {
    background: "#0a0a0a",
    border: "1px solid #1a1a1a",
    borderRadius: 10,
    padding: 18
  }

  const optionButton = (
    active: boolean
  ): React.CSSProperties => ({
    background: active ? "#ededed" : "#0a0a0a",
    color: active ? "#09090b" : "#a1a1aa",
    border: active ? "1px solid #ededed" : "1px solid #27272a",
    borderRadius: 8,
    padding: "10px 13px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer"
  })

  if (sent) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            textAlign: "center",
            ...cardStyle,
            padding: 32
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              border: "1px solid #27272a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              fontSize: 20
            }}
          >
            ✓
          </div>

          <div style={{ fontSize: 20, fontWeight: 700 }}>
            Message delivered
          </div>

          <div
            style={{
              color: "#71717a",
              fontSize: 13,
              marginTop: 8
            }}
          >
            Sent to {sentTo}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 24
            }}
          >
            <button
              onClick={resetComposer}
              style={{
                background: "#18181b",
                color: "#ededed",
                border: "1px solid #27272a",
                padding: "10px 18px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13
              }}
            >
              New message
            </button>

            <button
              onClick={() => router.push("/inbox")}
              style={{
                background: "#fff",
                color: "#000",
                border: "none",
                padding: "10px 18px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700
              }}
            >
              Go to inbox
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#ededed",
        padding: "40px 24px 64px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 28
          }}
        >
          <div>
            <div
              style={{
                color: "#52525b",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 7
              }}
            >
              Human communication
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.035em"
              }}
            >
              New message
            </h1>
          </div>

          <a
            href="/dashboard"
            style={{
              color: "#71717a",
              fontSize: 13,
              textDecoration: "none",
              paddingTop: 5
            }}
          >
            Back to dashboard
          </a>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14
          }}
        >
          <div style={cardStyle}>
            <span style={labelStyle}>From</span>

            {identityLoading ? (
              <div style={{ color: "#52525b", fontSize: 13 }}>
                Loading identity...
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {me?.displayName || me?.handle || "Postal Zero user"}
                  </div>

                  <div
                    style={{
                      color: "#71717a",
                      fontSize: 12,
                      marginTop: 3
                    }}
                  >
                    {me?.address || ""}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #27272a",
                    color: "#a1a1aa",
                    borderRadius: 999,
                    padding: "5px 9px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em"
                  }}
                >
                  {me?.identityType || "PERSON"}
                </div>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <label style={labelStyle} htmlFor="recipient">
              To
            </label>

            <input
              id="recipient"
              style={inputStyle}
              placeholder="name@postal.zero"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              autoComplete="off"
            />

            <div
              style={{
                color: "#52525b",
                fontSize: 11,
                marginTop: 7
              }}
            >
              Enter a Postal Zero handle or full address.
            </div>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle} htmlFor="subject">
              Subject
            </label>

            <input
              id="subject"
              style={inputStyle}
              placeholder="What is this about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            <label
              style={{
                ...labelStyle,
                marginTop: 18
              }}
              htmlFor="message"
            >
              Message
            </label>

            <textarea
              id="message"
              style={{
                ...inputStyle,
                minHeight: 190,
                resize: "vertical",
                lineHeight: 1.6
              }}
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                alignItems: "flex-start"
              }}
            >
              <div>
                <div style={labelStyle}>Security</div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700
                  }}
                >
                  Zero Lock
                </div>

                <div
                  style={{
                    color: "#71717a",
                    fontSize: 12,
                    lineHeight: 1.5,
                    marginTop: 5,
                    maxWidth: 450
                  }}
                >
                  Protect the message body before delivery. The recipient
                  needs the unlock password to read it.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setZeroLock(!zeroLock)
                  setError("")
                }}
                style={{
                  background: zeroLock ? "#18181b" : "#09090b",
                  color: zeroLock ? "#fff" : "#71717a",
                  border: zeroLock
                    ? "1px solid #52525b"
                    : "1px solid #27272a",
                  borderRadius: 999,
                  padding: "7px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  minWidth: 54
                }}
              >
                {zeroLock ? "On" : "Off"}
              </button>
            </div>

            {zeroLock && (
              <div
                style={{
                  borderTop: "1px solid #18181b",
                  marginTop: 18,
                  paddingTop: 18
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10
                  }}
                >
                  <div>
                    <label style={labelStyle} htmlFor="zero-lock-password">
                      Unlock password
                    </label>

                    <input
                      id="zero-lock-password"
                      type="password"
                      style={inputStyle}
                      value={zeroLockPassword}
                      onChange={(e) => setZeroLockPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label style={labelStyle} htmlFor="zero-lock-confirm">
                      Confirm password
                    </label>

                    <input
                      id="zero-lock-confirm"
                      type="password"
                      style={inputStyle}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div
                  style={{
                    color: "#71717a",
                    fontSize: 11,
                    lineHeight: 1.55,
                    marginTop: 12
                  }}
                >
                  The message body is encrypted in your browser. The unlock
                  password is not included with the message; share it with
                  the recipient separately.
                </div>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Receipts</div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 6
              }}
            >
              Choose what Postal Zero records for this message
            </div>

            <div
              style={{
                color: "#71717a",
                fontSize: 12,
                lineHeight: 1.5,
                marginBottom: 16
              }}
            >
              Receipts are optional. Open tracking is only enabled when you
              explicitly choose it.
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap"
              }}
            >
              <button
                type="button"
                onClick={() => setReceiptMode("OFF")}
                style={optionButton(receiptMode === "OFF")}
              >
                Off
              </button>

              <button
                type="button"
                onClick={() => setReceiptMode("DELIVERY")}
                style={optionButton(receiptMode === "DELIVERY")}
              >
                Delivery
              </button>

              <button
                type="button"
                onClick={() => setReceiptMode("OPENED")}
                style={optionButton(receiptMode === "OPENED")}
              >
                Delivery + opened
              </button>
            </div>

            <div
              style={{
                background: "#050505",
                border: "1px solid #18181b",
                borderRadius: 8,
                padding: "11px 12px",
                color: "#71717a",
                fontSize: 11,
                lineHeight: 1.5,
                marginTop: 14
              }}
            >
              {receiptMode === "OFF" &&
                "No optional Postal Zero delivery or open receipt will be created for this message."}

              {receiptMode === "DELIVERY" &&
                "Postal Zero will create a delivery receipt. Opening activity will not be exposed through that receipt."}

              {receiptMode === "OPENED" &&
                "Postal Zero will record delivery and the first time the recipient opens the message."}
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "11px 14px",
                background: "#1a0808",
                border: "1px solid #3f0e0e",
                borderRadius: 8,
                fontSize: 13,
                color: "#f87171"
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={send}
            disabled={loading || identityLoading}
            style={{
              width: "100%",
              background:
                loading || identityLoading
                  ? "#18181b"
                  : "#fff",
              color:
                loading || identityLoading
                  ? "#52525b"
                  : "#000",
              border: "none",
              padding: "13px 18px",
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 700,
              cursor:
                loading || identityLoading
                  ? "not-allowed"
                  : "pointer",
              marginTop: 2
            }}
          >
            {loading
              ? "Sending..."
              : zeroLock
                ? "Send with Zero Lock"
                : "Send message"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Compose() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#52525b"
          }}
        >
          Loading...
        </div>
      }
    >
      <ComposeInner />
    </Suspense>
  )
}
