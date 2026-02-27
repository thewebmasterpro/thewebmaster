import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { seoConfig } from "@/lib/seo.config";

const localeMap: Record<string, string> = {
  fr: "fr_BE",
  nl: "nl_BE",
  en: "en_US",
};

const seoTitles: Record<string, string> = {
  fr: "The Webmaster — Agence Digitale en Belgique",
  nl: "The Webmaster — Digitaal Bureau in België",
  en: "The Webmaster — Digital Agency in Belgium",
};

const seoDescriptions: Record<string, string> = {
  fr: "Agence digitale belge spécialisée en création de sites web, design graphique, réseaux sociaux et publicité digitale. Transformez et propulsez votre business en ligne.",
  nl: "Belgisch digitaal bureau gespecialiseerd in webdesign, grafisch ontwerp, sociale media en digitale reclame. Transformeer en lanceer uw online business.",
  en: "Belgian digital agency specialising in web design, graphic design, social media and digital advertising. Transform and propel your online business.",
};

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = seoConfig.siteUrl;

  return {
    title: seoTitles[locale] || seoTitles.fr,
    description: seoDescriptions[locale] || seoDescriptions.fr,
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        fr: `${siteUrl}/fr`,
        nl: `${siteUrl}/nl`,
        en: `${siteUrl}/en`,
        "x-default": `${siteUrl}/fr`,
      },
    },
    openGraph: {
      title: seoTitles[locale] || seoTitles.fr,
      description: seoDescriptions[locale] || seoDescriptions.fr,
      url: `${siteUrl}/${locale}`,
      siteName: seoConfig.siteName,
      locale: localeMap[locale] || "fr_BE",
      alternateLocale: Object.entries(localeMap)
        .filter(([k]) => k !== locale)
        .map(([, v]) => v),
      type: "website",
      images: [
        {
          url: `${siteUrl}${seoConfig.defaultOgImage}`,
          width: 1200,
          height: 630,
          alt: seoTitles[locale] || seoTitles.fr,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitles[locale] || seoTitles.fr,
      description: seoDescriptions[locale] || seoDescriptions.fr,
      creator: seoConfig.twitterHandle,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return (
    <div lang={locale}>
      {children}
    </div>
  );
}
