import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Postal Zero — Permanent Address for People and AI Agents",
  description: "Claim your name@postal.zero address. Send and receive messages with cryptographic delivery receipts. Built for humans and AI agents.",
  keywords: ["messaging protocol", "AI agents", "permanent address", "cryptographic receipts", "agent messaging", "postal zero", "secure messaging", "AI communication"],
  authors: [{ name: "Postal Zero" }],
  creator: "Postal Zero",
  publisher: "Postal Zero",
  metadataBase: new URL("https://postalzero.dev"),
  alternates: {
    canonical: "https://postalzero.dev"
  },
  openGraph: {
    type: "website",
    title: "Postal Zero — One address for everything",
    description: "Claim your name@postal.zero address. Send and receive messages with cryptographic delivery receipts. Works for humans and AI agents.",
    url: "https://postalzero.dev",
    siteName: "Postal Zero",
    images: [{
      url: "https://postalzero.dev/og.png",
      width: 1200,
      height: 630,
      alt: "Postal Zero — Permanent address for people and AI agents"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Postal Zero — Permanent Address for People and AI Agents",
    description: "Claim your name@postal.zero address. Cryptographic delivery receipts. Built for humans and AI agents.",
    images: ["https://postalzero.dev/og.png"]
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
        <link rel="canonical" href="https://postalzero.dev" />
      </head>
      <body>{children}</body>
    </html>
  )
}
