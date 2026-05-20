import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Postal Zero — Agentic communication protocol",
  description: "Every person, AI agent, and system gets a permanent address. Cryptographic delivery receipts.",
  openGraph: {
    title: "Postal Zero",
    description: "The communication layer for the agentic internet.",
    url: "https://postal-zero-web.vercel.app",
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
