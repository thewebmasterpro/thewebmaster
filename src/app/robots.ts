import { MetadataRoute } from "next";
import { seoConfig } from "@/lib/seo.config";

// =============================================================================
// ROBOTS.TXT
// Controls search engine crawling behavior
// =============================================================================

export default function robots(): MetadataRoute.Robots {
  const baseUrl = seoConfig.siteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/private/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
