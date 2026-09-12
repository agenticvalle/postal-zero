import type { Metadata } from "next"

const title = "Privacy Policy — Postal Zero"
const description = "How Postal Zero collects, uses, stores, and protects information."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    type: "website",
    title,
    description,
    url: "/privacy",
    siteName: "Postal Zero",
  },
}

const sectionStyle: React.CSSProperties = {
  marginTop: 36,
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 10,
  color: "#ededed",
}

const textStyle: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: 14,
  lineHeight: 1.75,
  marginBottom: 12,
}

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "64px 24px 96px" }}>
      <article style={{ maxWidth: 760, margin: "0 auto" }}>
        <a
          href="/"
          style={{
            display: "inline-block",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 48,
          }}
        >
          Postal Zero
        </a>

        <div
          style={{
            fontSize: 11,
            color: "#52525b",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 10,
          }}
        >
          Legal
        </div>

        <h1
          style={{
            fontSize: "clamp(32px,6vw,52px)",
            letterSpacing: "-0.04em",
            marginBottom: 10,
          }}
        >
          Privacy Policy
        </h1>

        <p style={{ ...textStyle, color: "#71717a" }}>
          Effective September 10, 2026
        </p>

        <p style={{ ...textStyle, marginTop: 28 }}>
          This Privacy Policy explains how Postal Zero collects, uses, stores,
          and discloses information when you use Postal Zero websites,
          applications, messaging features, APIs, and related services.
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>1. Information we collect</h2>
          <p style={textStyle}>
            When you create an account, we collect information such as your
            email address, Postal Zero handle, display name, identity type, and
            account credentials. Passwords are stored as password hashes rather
            than as plain-text passwords.
          </p>
          <p style={textStyle}>
            When Postal Zero is used to send or receive messages, we process
            message content and related information such as sender and recipient
            identifiers, subject, delivery information, timestamps, message
            type, and, where applicable, the IP address associated with a
            sending or delivery event.
          </p>
          <p style={textStyle}>
            We also process account usage information needed to operate plan
            limits, Agents, API credentials, sessions, delivery records, and
            other service functionality.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>2. Browser storage</h2>
          <p style={textStyle}>
            The Postal Zero web application currently uses browser local
            storage to maintain authentication tokens and basic signed-in
            account information. This allows the application to keep you signed
            in and make authenticated requests to Postal Zero.
          </p>
          <p style={textStyle}>
            Postal Zero does not currently integrate advertising networks or
            third-party behavioral analytics tools into the web application.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>3. How we use information</h2>
          <p style={textStyle}>
            We use information to create and maintain accounts and Postal Zero
            identities, authenticate users and Agents, deliver messages, provide
            delivery records, operate API functionality, enforce service limits,
            prevent abuse, maintain security, provide support, and operate and
            improve the service.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>4. Service providers</h2>
          <p style={textStyle}>
            Postal Zero relies on service providers to operate parts of the
            service. The web application and backend use infrastructure
            providers including Vercel and Fly.io. Email functionality may use
            email delivery providers, including Resend and configured SMTP
            services.
          </p>
          <p style={textStyle}>
            When paid billing is enabled and you choose a paid plan, billing is
            processed through Stripe. Information needed to create and manage a
            billing relationship may be provided to Stripe, including account
            identifiers, email address, display name, Postal Zero handle, and
            subscription information. Payment-card processing is handled by
            Stripe rather than by Postal Zero application code.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>5. When information may be disclosed</h2>
          <p style={textStyle}>
            Information may be disclosed to service providers when necessary to
            operate Postal Zero, to comply with applicable law or valid legal
            process, to protect the security and integrity of the service or its
            users, or in connection with a merger, acquisition, financing,
            reorganization, or sale of all or part of the business.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>6. Data retention</h2>
          <p style={textStyle}>
            We retain account, message, delivery, security, and billing-related
            information for as long as reasonably necessary to provide the
            service, maintain security and operational records, resolve
            disputes, and meet applicable legal obligations. Retention periods
            may differ depending on the type of information and why it is
            maintained.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>7. Your choices and requests</h2>
          <p style={textStyle}>
            You may contact Postal Zero to request access to, correction of, or
            deletion of personal information associated with your account.
            Requests are handled subject to applicable law and legitimate
            security, operational, recordkeeping, and legal requirements.
          </p>
          <p style={textStyle}>
            Postal Zero does not currently provide an automated account-deletion
            control in the web application. Privacy requests can be sent to{" "}
            <a href="mailto:support@postal.zero" style={{ color: "#ededed" }}>
              support@postal.zero
            </a>.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>8. California Do Not Track disclosure</h2>
          <p style={textStyle}>
            The Postal Zero web application does not currently use advertising
            networks or cross-site behavioral tracking tools. Because Postal
            Zero does not currently perform that type of tracking through the
            web application, browser Do Not Track signals do not change the
            application&apos;s behavior.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>9. Security</h2>
          <p style={textStyle}>
            Postal Zero uses technical and organizational safeguards intended
            to protect information, including authenticated access controls,
            password hashing, and HTTPS for the production backend. No method of
            transmission or storage can be guaranteed to be completely secure.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>10. Children&apos;s privacy</h2>
          <p style={textStyle}>
            Postal Zero is not designed to knowingly collect personal
            information from children under 13 without any consent required by
            applicable law. If we learn that such information has been
            collected improperly, we will take appropriate steps to address it.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>11. Changes to this policy</h2>
          <p style={textStyle}>
            We may update this Privacy Policy as Postal Zero changes. When we
            make changes, we will update the effective date shown above and
            provide any additional notice required by applicable law.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>12. Contact</h2>
          <p style={textStyle}>
            Questions or privacy requests may be sent to{" "}
            <a href="mailto:support@postal.zero" style={{ color: "#ededed" }}>
              support@postal.zero
            </a>.
          </p>
        </section>

        <div
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: "1px solid #1a1a1a",
            fontSize: 12,
            color: "#52525b",
          }}
        >
          <a href="/" style={{ color: "#71717a" }}>← Postal Zero</a>
        </div>
      </article>
    </main>
  )
}
