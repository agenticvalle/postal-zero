import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://app.postalzero.dev",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://app.postalzero.dev/pricing",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]
}
