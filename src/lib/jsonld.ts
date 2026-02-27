import { seoConfig } from "./seo.config";

// =============================================================================
// JSON-LD STRUCTURED DATA
// Generate structured data for rich snippets in search results
// =============================================================================

/**
 * Organization schema
 * Shows company info in search results
 */
export function organizationJsonLd() {
  const { organization } = seoConfig;
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organization.name,
    url: organization.url,
    logo: `${seoConfig.siteUrl}${organization.logo}`,
    email: organization.email || undefined,
    telephone: organization.phone || undefined,
    sameAs: organization.sameAs,
    address: organization.address.city
      ? {
          "@type": "PostalAddress",
          streetAddress: organization.address.street,
          addressLocality: organization.address.city,
          addressRegion: organization.address.region,
          postalCode: organization.address.postalCode,
          addressCountry: organization.address.country,
        }
      : undefined,
  };
}

/**
 * Website schema
 * Enables sitelinks search box in Google
 */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${seoConfig.siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Article schema
 * For blog posts and articles
 */
export function articleJsonLd({
  title,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  url,
}: {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: image.startsWith("http") ? image : `${seoConfig.siteUrl}${image}`,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: seoConfig.organization.name,
      logo: {
        "@type": "ImageObject",
        url: `${seoConfig.siteUrl}${seoConfig.organization.logo}`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${seoConfig.siteUrl}${url}`,
    },
  };
}

/**
 * Product schema
 * For e-commerce product pages
 */
export function productJsonLd({
  name,
  description,
  image,
  price,
  currency = "EUR",
  availability = "InStock",
  url,
  brand,
  sku,
  reviewCount,
  ratingValue,
}: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  url: string;
  brand?: string;
  sku?: string;
  reviewCount?: number;
  ratingValue?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: image.startsWith("http") ? image : `${seoConfig.siteUrl}${image}`,
    url: `${seoConfig.siteUrl}${url}`,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    sku,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url: `${seoConfig.siteUrl}${url}`,
    },
    aggregateRating:
      reviewCount && ratingValue
        ? {
            "@type": "AggregateRating",
            ratingValue,
            reviewCount,
          }
        : undefined,
  };
}

/**
 * FAQ schema
 * For FAQ pages - shows expandable Q&A in search results
 */
export function faqJsonLd(
  faqs: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Breadcrumb schema
 * Shows breadcrumb trail in search results
 */
export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${seoConfig.siteUrl}${item.url}`,
    })),
  };
}

/**
 * Local Business schema
 * For businesses with physical locations
 */
export function localBusinessJsonLd({
  name,
  description,
  image,
  telephone,
  address,
  openingHours,
  priceRange,
}: {
  name: string;
  description: string;
  image: string;
  telephone: string;
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  openingHours?: string[];
  priceRange?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description,
    image: image.startsWith("http") ? image : `${seoConfig.siteUrl}${image}`,
    telephone,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.region,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    openingHoursSpecification: openingHours,
    priceRange,
  };
}
