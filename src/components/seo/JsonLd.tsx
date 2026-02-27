// =============================================================================
// JSON-LD COMPONENT
// Injects structured data into the page head
// =============================================================================

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  const jsonLdArray = Array.isArray(data) ? data : [data];
  
  return (
    <>
      {jsonLdArray.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

// =============================================================================
// USAGE
// =============================================================================
// import { JsonLd } from "@/components/seo/JsonLd";
// import { organizationJsonLd, articleJsonLd } from "@/lib/jsonld";
//
// // In layout.tsx (global schemas)
// <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
//
// // In page.tsx (page-specific schema)
// <JsonLd data={articleJsonLd({ title: "...", ... })} />
