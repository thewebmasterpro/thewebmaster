import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { generateMetadata } from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Providers } from "@/components/providers";
import "./globals.css";

// Generate default metadata from SEO config
export const metadata: Metadata = generateMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
      <body className={`${fontVariables} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
