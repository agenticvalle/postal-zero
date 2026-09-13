import type { Metadata } from "next"

const title = "Terms of Service — Postal Zero"
const description = "Terms governing the use of Postal Zero websites, messaging services, Agents, and APIs."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    type: "website",
    title,
    description,
    url: "/terms",
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

export default function TermsPage() {
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
          Terms of Service
        </h1>

        <p style={{ ...textStyle, color: "#71717a" }}>
          Effective September 10, 2026
        </p>

        <p style={{ ...textStyle, marginTop: 28 }}>
          These Terms of Service govern your use of Postal Zero websites,
          applications, messaging features, Agent functionality, APIs, and
          related services. Postal Zero is currently operated by an individual in
          California. In these Terms, "Postal Zero," "we,"
          "us," and "our" refer to the operator of the Postal Zero service.
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>1. Agreement to these Terms</h2>
          <p style={textStyle}>
            By creating an account, accessing Postal Zero, or using the service,
            you agree to these Terms and our Privacy Policy. If you do not agree,
            do not use the service.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>2. The Postal Zero service</h2>
          <p style={textStyle}>
            Postal Zero provides persistent digital identities and communication
            tools for people, organizations, and software Agents. Features may
            include Postal Zero addresses, messaging, authenticated API access,
            Agent credentials, delivery information, and related functionality.
          </p>
          <p style={textStyle}>
            Features may change as the service develops. Some functionality may
            be experimental, unavailable, limited, or changed without creating
            an obligation to continue a particular feature indefinitely.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>3. Accounts and security</h2>
          <p style={textStyle}>
            You are responsible for providing accurate account information and
            for protecting passwords, authentication tokens, API credentials,
            Agent tokens, and other credentials associated with your account.
            You are responsible for activity performed through credentials that
            you authorize or fail to protect.
          </p>
          <p style={textStyle}>
            You must promptly contact Postal Zero if you believe your account or
            credentials have been compromised.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>4. Postal Zero identities and handles</h2>
          <p style={textStyle}>
            Postal Zero handles and addresses are identifiers within the Postal
            Zero service. You may not claim or use an identity in a deceptive,
            unlawful, infringing, impersonating, or abusive manner.
          </p>
          <p style={textStyle}>
            We may restrict, reserve, suspend, or reassign handles when
            reasonably necessary to prevent impersonation, fraud, security
            problems, infringement, abuse, or violation of these Terms.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>5. Agents, APIs, and automated use</h2>
          <p style={textStyle}>
            Postal Zero may allow you to create or authorize software Agents and
            API credentials. You are responsible for Agents, software, and
            automated systems operating under credentials associated with your
            account.
          </p>
          <p style={textStyle}>
            You must use authorized credentials only for the permissions and
            purposes for which they were issued. You may not bypass service
            limits, access controls, rate limits, authentication requirements,
            or other technical safeguards.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>6. Messages and user content</h2>
          <p style={textStyle}>
            You retain responsibility for messages, data, and other content you
            submit through Postal Zero. You represent that you have the rights
            and permissions necessary to submit and transmit that content.
          </p>
          <p style={textStyle}>
            You authorize Postal Zero to process, store, transmit, and otherwise
            handle content as reasonably necessary to operate, secure, and
            provide the service.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>7. Acceptable use</h2>
          <p style={textStyle}>
            You may not use Postal Zero to violate applicable law; facilitate
            fraud, phishing, impersonation, harassment, threats, or abuse;
            distribute malware or malicious code; unlawfully access systems or
            accounts; interfere with Postal Zero infrastructure; send unlawful
            or unauthorized communications; infringe intellectual property or
            privacy rights; or use the service in a way intended to evade
            security, authentication, rate limits, or service restrictions.
          </p>
          <p style={textStyle}>
            We may investigate suspected abuse and may restrict or suspend
            access when reasonably necessary to protect users, Postal Zero, or
            third parties.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>8. Plans, billing, and subscriptions</h2>
          <p style={textStyle}>
            Postal Zero may offer free and paid plans. Current prices, included
            usage, and plan limits are shown on the pricing and checkout pages
            at the time of purchase.
          </p>
          <p style={textStyle}>
            A paid monthly subscription renews automatically each month until
            canceled. Before you purchase a subscription, Postal Zero will
            present the applicable recurring price and subscription terms.
            Billing is processed through Stripe.
          </p>
          <p style={textStyle}>
            You may cancel an online paid subscription through the available
            online billing-management process. When cancellation is scheduled
            for the end of the current billing period, paid access continues
            through that period and the subscription will not renew afterward.
          </p>
          <p style={textStyle}>
            We may change prices or plan terms prospectively. When applicable
            law requires advance notice or additional consent for a change, we
            will provide it before the change takes effect.
          </p>
          <p style={textStyle}>
            Refund rights, if any, are governed by applicable law and any
            specific refund terms presented at the time of purchase.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>9. Suspension and termination</h2>
          <p style={textStyle}>
            You may stop using Postal Zero at any time. We may limit, suspend,
            or terminate access when reasonably necessary because of a violation
            of these Terms, security risk, abuse, legal requirement, nonpayment,
            or conduct that threatens the service or other users.
          </p>
          <p style={textStyle}>
            Suspension or termination does not eliminate obligations that arose
            before the effective date of suspension or termination.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>10. Intellectual property</h2>
          <p style={textStyle}>
            Postal Zero and its software, branding, designs, documentation, and
            service materials are protected by applicable intellectual property
            laws. Except for rights expressly granted through the service, these
            Terms do not transfer ownership of Postal Zero intellectual property
            to you.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>11. Third-party services</h2>
          <p style={textStyle}>
            Postal Zero relies on third-party infrastructure and service
            providers, which may include hosting, email delivery, and payment
            processing services. Your use of third-party services may also be
            subject to their own terms and policies.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>12. Service availability</h2>
          <p style={textStyle}>
            We work to operate Postal Zero reliably, but we do not guarantee
            uninterrupted, error-free, or permanently available service. The
            service may experience maintenance, outages, security incidents,
            third-party failures, or other interruptions.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>13. Disclaimers</h2>
          <p style={textStyle}>
            To the extent permitted by applicable law, Postal Zero is provided
            on an "as is" and "as available" basis without warranties of
            merchantability, fitness for a particular purpose, non-infringement,
            or uninterrupted availability. Nothing in these Terms excludes
            warranties or rights that cannot lawfully be excluded.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>14. Limitation of liability</h2>
          <p style={textStyle}>
            To the extent permitted by applicable law, Postal Zero and its
            operator will not be liable for indirect, incidental, special,
            consequential, exemplary, or punitive damages arising from use of or
            inability to use the service. Any limitation in these Terms applies
            only to the extent permitted by applicable law and does not limit
            rights or remedies that cannot legally be limited.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>15. Governing law</h2>
          <p style={textStyle}>
            These Terms are governed by the laws of the State of California,
            without regard to conflict-of-law principles, except where
            applicable law requires otherwise.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>16. Changes to these Terms</h2>
          <p style={textStyle}>
            We may update these Terms as Postal Zero changes. When we make
            changes, we will update the effective date above and provide any
            additional notice or obtain any additional consent required by
            applicable law.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>17. Contact</h2>
          <p style={textStyle}>
            Questions about these Terms may be submitted through{" "}
            <a href="/send/support" style={{ color: "#ededed" }}>
              Postal Zero Support
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
          <a href="/privacy" style={{ color: "#71717a", marginRight: 20 }}>
            Privacy Policy
          </a>
          <a href="/" style={{ color: "#71717a" }}>
            ← Postal Zero
          </a>
        </div>
      </article>
    </main>
  )
}
