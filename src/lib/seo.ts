import { Metadata } from "next";
import { seoConfig } from "./seo.config";

// =============================================================================
// SEO UTILITIES
// Helper functions to generate metadata for pages
// =============================================================================

interface PageSeoProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  keywords?: string[];
  noIndex?: boolean;
  noFollow?: boolean;
}

/**
 * Generate metadata for a page
 * @example
 * export const metadata = generateMetadata({
 *   title: "About Us",
 *   description: "Learn more about our team",
 * });
 */
export function generateMetadata({
  title,
  description = seoConfig.defaultDescription,
  image = seoConfig.defaultOgImage,
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  keywords,
  noIndex = false,
  noFollow = false,
}: PageSeoProps = {}): Metadata {
  const finalTitle = title
    ? seoConfig.titleTemplate.replace("%s", title)
    : seoConfig.defaultTitle;
  
  const imageUrl = image.startsWith("http")
    ? image
    : `${seoConfig.siteUrl}${image}`;

  const pageUrl = url
    ? `${seoConfig.siteUrl}${url}`
    : seoConfig.siteUrl;

  return {
    title: finalTitle,
    description,
    keywords,
    authors: authors?.map((name) => ({ name })),
    
    // Robots
    robots: {
      index: !noIndex,
      follow: !noFollow,
      googleBot: {
        index: !noIndex,
        follow: !noFollow,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    
    // Open Graph
    openGraph: {
      title: finalTitle,
      description,
      url: pageUrl,
      siteName: seoConfig.siteName,
      locale: seoConfig.locale,
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: finalTitle,
        },
      ],
      ...(type === "article" && {
        publishedTime,
        modifiedTime,
        authors,
      }),
    },
    
    // Twitter
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description,
      images: [imageUrl],
      creator: seoConfig.twitterHandle,
      site: seoConfig.twitterHandle,
    },
    
    // Canonical
    alternates: {
      canonical: pageUrl,
    },
    
    // Verification
    verification: {
      google: seoConfig.verification.google || undefined,
      yandex: seoConfig.verification.yandex || undefined,
      other: seoConfig.verification.bing
        ? { "msvalidate.01": seoConfig.verification.bing }
        : undefined,
    },
  };
}

/**
 * Merge page metadata with defaults
 * Use in page.tsx for custom metadata
 */
export function mergeMetadata(pageMetadata: Metadata): Metadata {
  return {
    ...generateMetadata(),
    ...pageMetadata,
  };
}
