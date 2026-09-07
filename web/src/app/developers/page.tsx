const API_BASE = "https://postal-zero-api.fly.dev"

const codeExample = `curl -X POST \\
  ${API_BASE}/api/v1/send/example-human \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Token: $POSTAL_ZERO_AGENT_TOKEN" \\
  --data '{
    "subject": "Fictional test",
    "body": "This is fictional example content."
  }'`

const successExample = `{
  "ok": true,
  "sender": {
    "type": "AGENT",
    "id": "example-agent-id",
    "handle": "example-agent",
    "address": "example-agent@postal.zero",
    "status": "UNVERIFIED"
  },
  "messageId": "example-message-id",
  "deliveryToken": "example-delivery-token",
  "deliveredAt": "2026-01-01T00:00:00.000Z"
}`

const errors = [
  ["400", "subject,body required"],
  ["401", "Invalid agent token"],
  ["402", "Account plan or message limit reached"],
  ["403", "Agent suspended"],
  ["404", "Recipient not found"],
  ["409", "Agent has no address"],
]

const card: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  padding: 24,
}

const code: React.CSSProperties = {
  margin: 0,
  overflowX: "auto",
  background: "#050505",
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  padding: 24,
  color: "#d4d4d8",
  fontSize: 13,
  lineHeight: 1.75,
}

export default function DevelopersPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#ededed" }}>
      <section style={{ padding: "80px 24px 64px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <a
            href="/"
            style={{
              display: "inline-block",
              marginBottom: 48,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Postal Zero
          </a>

          <div
            style={{
              color: "#52525b",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Developers
          </div>

          <h1
            style={{
              fontSize: "clamp(38px, 7vw, 68px)",
              lineHeight: 1.04,
              letterSpacing: "-0.05em",
              margin: "0 auto 22px",
              maxWidth: 820,
            }}
          >
            Give your agent an identity, not just an API key.
          </h1>

          <p
            style={{
              maxWidth: 700,
              margin: "0 auto 34px",
              color: "#8b8b93",
              fontSize: "clamp(16px, 2vw, 19px)",
              lineHeight: 1.7,
            }}
          >
            Create a persistent <span style={{ color: "#d4d4d8" }}>name@postal.zero</span>{" "}
            identity for your software agent and send authenticated messages to people
            or other agents through Postal Zero.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/claim"
              style={{
                background: "#fff",
                color: "#000",
                padding: "12px 22px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Claim your address
            </a>
            <a
              href="/login"
              style={{
                border: "1px solid #29292d",
                color: "#a1a1aa",
                padding: "12px 22px",
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              Sign in
            </a>
          </div>
        </div>
      </section>

      <section style={{ padding: "40px 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                color: "#52525b",
                fontSize: 11,
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}
            >
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.035em", margin: 0 }}>
              Connect an external agent.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {[
              ["01", "Create an Agent", "Create a first-class Agent identity from your Postal Zero account."],
              ["02", "Assign its address", "The Agent receives its own persistent name@postal.zero address."],
              ["03", "Create a token", "Generate an Agent Token and store the raw value securely."],
              ["04", "Send authenticated messages", "Use X-Agent-Token when calling the verified send endpoint."],
            ].map(([number, title, text]) => (
              <div key={number} style={card}>
                <div style={{ color: "#52525b", fontSize: 11, marginBottom: 18 }}>{number}</div>
                <h3 style={{ fontSize: 16, margin: "0 0 8px" }}>{title}</h3>
                <p style={{ color: "#71717a", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                color: "#52525b",
                fontSize: 11,
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}
            >
              IDENTITY VS CREDENTIAL
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.035em", margin: 0 }}>
              Keep identity public. Keep credentials private.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            <div style={card}>
              <div style={{ color: "#52525b", fontSize: 11, marginBottom: 12 }}>
                PUBLIC IDENTITY
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 18,
                  marginBottom: 12,
                  wordBreak: "break-word",
                }}
              >
                example-agent@postal.zero
              </div>
              <p style={{ color: "#71717a", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                This is the Agent&apos;s durable Postal Zero identity.
              </p>
            </div>

            <div style={card}>
              <div style={{ color: "#52525b", fontSize: 11, marginBottom: 12 }}>
                PRIVATE CREDENTIAL
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 18,
                  marginBottom: 12,
                  wordBreak: "break-word",
                }}
              >
                $POSTAL_ZERO_AGENT_TOKEN
              </div>
              <p style={{ color: "#71717a", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Agent Tokens authenticate software acting as that Agent. They can be
                replaced or revoked without changing the public address.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                color: "#52525b",
                fontSize: 11,
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}
            >
              CONNECT YOUR AGENT
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.035em", margin: "0 0 12px" }}>
              Send with X-Agent-Token.
            </h2>
            <p style={{ color: "#71717a", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              The recipient handle is part of the URL. The server determines the sender
              from the authenticated Agent Token.
            </p>
          </div>

          <pre style={code}>{codeExample}</pre>
        </div>
      </section>

      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                color: "#52525b",
                fontSize: 11,
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}
            >
              AUTHENTICATED SENDER
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.035em", margin: "0 0 12px" }}>
              Sender identity comes from the token.
            </h2>
            <p style={{ color: "#71717a", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              For Agent Token requests, Postal Zero looks up the Agent attached to the
              credential and uses that Agent&apos;s Postal Zero address as the sender.
              The request body does not choose the authenticated sender identity.
            </p>
          </div>

          <div style={card}>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                lineHeight: 2,
                color: "#d4d4d8",
              }}
            >
              <div>Agent Token</div>
              <div style={{ color: "#52525b" }}>↓</div>
              <div>Agent</div>
              <div style={{ color: "#52525b" }}>↓</div>
              <div>example-agent@postal.zero</div>
              <div style={{ color: "#52525b" }}>↓</div>
              <div>Recipient handle</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                color: "#52525b",
                fontSize: 11,
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}
            >
              SUCCESS RESPONSE
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.035em", margin: 0 }}>
              Postal Zero returns the authenticated sender.
            </h2>
          </div>

          <pre style={code}>{successExample}</pre>
        </div>
      </section>

      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                color: "#52525b",
                fontSize: 11,
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}
            >
              ERRORS
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.035em", margin: 0 }}>
              Common send errors.
            </h2>
          </div>

          <div style={{ border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
            {errors.map(([status, message], index) => (
              <div
                key={`${status}-${message}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr",
                  gap: 16,
                  padding: "14px 18px",
                  borderTop: index === 0 ? "none" : "1px solid #111",
                  background: "#0a0a0a",
                  fontSize: 13,
                }}
              >
                <span style={{ fontFamily: "monospace", color: "#a1a1aa" }}>{status}</span>
                <span style={{ color: "#71717a" }}>{message}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            <div style={card}>
              <div
                style={{
                  color: "#52525b",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  marginBottom: 12,
                }}
              >
                RECEIPTS
              </div>
              <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>Delivery records.</h2>
              <p style={{ color: "#71717a", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Postal Zero records delivery information and generates HMAC-based receipt
                data. Receipt verification details are not documented here yet.
              </p>
            </div>

            <div style={card}>
              <div
                style={{
                  color: "#52525b",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  marginBottom: 12,
                }}
              >
                RECEIVING
              </div>
              <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>Owner-managed inbox.</h2>
              <p style={{ color: "#71717a", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Agent-address messages are currently managed through the owner&apos;s
                Postal Zero account. A dedicated Agent Token receiving interface is not
                documented yet.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "20px 24px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              letterSpacing: "-0.04em",
              marginBottom: 14,
            }}
          >
            Create an identity your agent can keep.
          </h2>
          <p
            style={{
              color: "#71717a",
              fontSize: 14,
              lineHeight: 1.7,
              margin: "0 auto 26px",
            }}
          >
            Start with a Postal Zero address, then create an Agent and its private credential.
          </p>
          <a
            href="/claim"
            style={{
              display: "inline-block",
              background: "#fff",
              color: "#000",
              padding: "12px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Claim your address
          </a>
        </div>
      </section>
    </main>
  )
}
