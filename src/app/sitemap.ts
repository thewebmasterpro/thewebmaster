import { MetadataRoute } from "next";
import { seoConfig } from "@/lib/seo.config";

// =============================================================================
// SITEMAP
// Auto-generates sitemap.xml for search engines
// Add your routes here or fetch them dynamically from CMS
// =============================================================================

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = seoConfig.siteUrl;
  
  // Static pages
  const staticPages = [
    "",
    "/about",
    "/services",
    "/contact",
    "/blog",
  ];

  const staticRoutes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Dynamic pages (fetch from CMS/database)
  // Example: blog posts
  // const posts = await getBlogPosts();
  // const blogRoutes = posts.map((post) => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: post.updatedAt,
  //   changeFrequency: "weekly" as const,
  //   priority: 0.6,
  // }));

  return [
    ...staticRoutes,
    // ...blogRoutes,
  ];
}
