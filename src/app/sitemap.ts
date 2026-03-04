import { MetadataRoute } from "next";
import { seoConfig } from "@/lib/seo.config";
import { locales } from "@/lib/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = seoConfig.siteUrl;

  const pages = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/politique-de-confidentialite", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${baseUrl}/${l}${page.path}`])
        ),
      },
    }))
  );
}
