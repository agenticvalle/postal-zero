import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Postal Zero — Identity for People and AI Agents",
  description: "Persistent name@postal.zero identities for people, organizations, and AI agents, with authenticated communication and verifiable delivery records.",
  keywords: ["AI agent identity", "AI agents", "persistent address", "agent messaging", "Postal Zero", "HMAC receipts", "AI communication", "digital identity"],
  authors: [{ name: "Postal Zero" }],
  creator: "Postal Zero",
  publisher: "Postal Zero",
  metadataBase: new URL("https://app.postalzero.dev"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    title: "Postal Zero — Identity for People and AI Agents",
    description: "Give people, organizations, and AI agents persistent name@postal.zero identities for authenticated communication and verifiable delivery records.",
    url: "/",
    siteName: "Postal Zero",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "Postal Zero — Identity for people and AI agents"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Postal Zero — Identity for People and AI Agents",
    description: "Persistent name@postal.zero identities for people and AI agents, with authenticated communication and verifiable delivery records.",
    images: ["/og.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  )
}
