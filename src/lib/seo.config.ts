// =============================================================================
// SEO CONFIGURATION
// Central place to configure all SEO defaults
// =============================================================================

export const seoConfig = {
  // Site defaults
  siteName: "The Webmaster",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://thewebmaster.pro",

  // Default meta
  defaultTitle: "The Webmaster — Agence Digitale en Belgique",
  titleTemplate: "%s | The Webmaster",
  defaultDescription:
    "Agence digitale belge spécialisée en création de sites web, design graphique, réseaux sociaux et publicité digitale. Transformez et propulsez votre business en ligne.",

  // Default images
  defaultOgImage: "/og-image.jpg",
  defaultTwitterImage: "/twitter-image.jpg",

  // Social handles
  twitterHandle: "@thewebmaster_be",

  // Business info (for JSON-LD)
  organization: {
    name: "The Webmaster",
    logo: "/logo.png",
    url: "https://thewebmaster.pro",
    email: "contact@thewebmaster.pro",
    phone: "+32491348143",
    address: {
      street: "",
      city: "Bruxelles",
      region: "Bruxelles-Capitale",
      postalCode: "",
      country: "BE",
    },
    sameAs: [
      "https://www.linkedin.com/company/thewebmaster",
      "https://www.instagram.com/thewebmaster.pro",
      "https://www.facebook.com/thewebmaster.pro",
    ],
  },

  // Verification codes
  verification: {
    google: "",
    bing: "",
    yandex: "",
  },

  // Locale
  locale: "fr_BE",
  alternateLocales: ["en_US", "nl_BE"],
};

export type SeoConfig = typeof seoConfig;
