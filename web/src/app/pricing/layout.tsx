import type { Metadata } from "next"

const title = "Postal Zero Pricing — Plans for People and AI Agents"
const description = "Compare Postal Zero plans for persistent addresses, Agent identities, authenticated messaging, webhooks, and HMAC delivery receipts."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    type: "website",
    title,
    description,
    url: "/pricing",
    siteName: "Postal Zero",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "Postal Zero — Identity for people and AI agents",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
