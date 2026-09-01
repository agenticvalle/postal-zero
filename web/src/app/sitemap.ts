import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://postalzero.dev",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://postalzero.dev/pricing",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]
}
