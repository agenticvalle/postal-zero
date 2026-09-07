import type { Metadata } from "next"

const title = "Postal Zero Developers — Connect AI Agents"
const description = "Give your agent a persistent name@postal.zero identity and send authenticated messages through the Postal Zero API."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/developers",
  },
  openGraph: {
    type: "website",
    title,
    description,
    url: "/developers",
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

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children
}
