import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/inbox",
        "/compose",
        "/login",
        "/forgot-password",
        "/receipt/",
        "/send/",
        "/api/",
      ],
    },
    sitemap: "https://postalzero.dev/sitemap.xml",
    host: "https://postalzero.dev",
  }
}
