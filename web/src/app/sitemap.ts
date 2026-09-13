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
    {
      url: "https://app.postalzero.dev/developers",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: "https://app.postalzero.dev/privacy",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://app.postalzero.dev/terms",
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ]
}
