import { headers } from "next/headers";
import Script from "next/script";
import { fontVariables } from "@/lib/fonts";
import { organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Providers } from "@/components/providers";
import "./globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const locale = headersList.get("x-locale") || "fr";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Script
          defer
          src="https://analytics.hagendigital.com/script.js"
          data-website-id="f8bfa504-b4d8-4b3a-b40f-45fe1aa76f81"
          strategy="afterInteractive"
        />
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      </head>
      <body className={`${fontVariables} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
