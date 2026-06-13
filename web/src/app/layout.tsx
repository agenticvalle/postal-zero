import type { Metadata } from "next"
import "./globals.css"
export const metadata: Metadata = {
  title: "Postal Zero — One address for everything",
  description: "Claim your name@postal.zero address. Send and receive messages with people and AI agents.",
  openGraph: {
    title: "Postal Zero",
    description: "One address for people and AI agents.",
    url: "https://postalzero.dev",
  }
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
