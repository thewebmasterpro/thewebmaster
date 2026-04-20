import type { StackInfo, ThreatVector, SiteType } from "@/types/audit";

// SEO-specific threat model: Google algorithm risks, AI Overview readiness,
// crawl budget waste, de-indexation risks. Not a copy of the security one —
// these are dangers to organic ranking, not to user data.

interface SeoThreatTemplate extends Omit<ThreatVector, "relatedCheckIds"> {
  relatedCheckIds: string[];
  applies: (ctx: { stack: StackInfo; siteType: SiteType; hasTracking: boolean }) => boolean;
}

const TEMPLATES: SeoThreatTemplate[] = [
  {
    id: "seo-google-helpful-content",
    title: "Pénalité Helpful Content System de Google",
    description: "Les sites avec peu de contenu unique, generic AI-written text, ou contenu affiliate de faible valeur perdent 30-80% de trafic organique lors des mises à jour core. Le contenu doit apporter une valeur que l'utilisateur ne trouvera pas ailleurs.",
    severity: "high",
    relatedCheckIds: ["onpage-content-length", "onpage-h1", "onpage-heading-structure", "jsonld-absent"],
    mitigations: [
      "Auditez chaque page : apporte-t-elle une info/expérience unique ?",
      "Réécrivez les pages thin-content (<300 mots) avec des cas concrets, exemples, screenshots",
      "Supprimez les pages auto-générées qui n'apportent aucune valeur (tag pages vides, pagination infinie)",
      "Publiez sous une identité d'auteur réelle (E-E-A-T) avec Schema Person + credentials",
    ],
    applies: ({ siteType }) => siteType === "article" || siteType === "blog" || siteType === "corporate",
  },
  {
    id: "seo-ai-overview-readiness",
    title: "Absence de la Google AI Overview (anciens featured snippets)",
    description: "Google cite désormais des sources dans ses AI Overviews. Les pages sans Schema.org structuré, sans H1 clair, ou sans réponses factuelles directes ne sont jamais citées — perte de trafic haute intentionnalité.",
    severity: "medium",
    relatedCheckIds: ["jsonld-absent", "jsonld-incomplete", "onpage-h1", "onpage-heading-structure"],
    mitigations: [
      "Structurez le contenu en Q&A direct (question en H2, réponse en 1-2 phrases immédiatement après)",
      "Ajoutez Schema FAQPage + HowTo pour les contenus how-to",
      "Le premier paragraphe doit répondre factuellement à la question du titre",
      "Utilisez des listes <ul>/<ol> et tableaux pour les données comparatives",
    ],
    applies: ({ siteType }) => siteType === "article" || siteType === "blog" || siteType === "corporate",
  },
  {
    id: "seo-crawl-budget-waste",
    title: "Gaspillage de budget crawl",
    description: "Google alloue un budget de crawl par site. Un sitemap sans <lastmod>, des faceted URLs infinies, des redirections en chaîne, ou du contenu dupliqué dilapident ce budget — les pages importantes ne sont re-crawlées qu'une fois par mois.",
    severity: "medium",
    relatedCheckIds: ["sitemap-no-lastmod", "sitemap-stale", "tech-canonical", "hreflang-no-reciprocity"],
    mitigations: [
      "Ajoutez <lastmod> à TOUTES les URLs du sitemap (pas seulement l'accueil)",
      "Bloquez les paramètres d'URL inutiles dans robots.txt (?sort=, ?filter=, ?utm_=)",
      "Canonicalisez les variantes d'URL : /page vs /page/ vs /page?id=1",
      "Supprimez les redirect chains (301 → 301 → 200) en pointant directement vers la destination finale",
    ],
    applies: ({ siteType }) => siteType === "ecommerce" || siteType === "blog",
  },
  {
    id: "seo-ecommerce-product-schema",
    title: "Absence de rich results Product",
    description: "Sans Schema Product + Offer + AggregateRating, vos fiches produits n'apparaissent pas avec les étoiles/prix dans les SERP — le CTR chute de 30-50% vs les concurrents qui les affichent.",
    severity: "high",
    relatedCheckIds: ["jsonld-incomplete", "jsonld-absent"],
    mitigations: [
      "JSON-LD Product avec name, image, description, brand, offers (price, priceCurrency, availability)",
      "AggregateRating si avis clients disponibles (ratingValue, reviewCount)",
      "Review individuelles sur les fiches détaillées",
      "Testez via https://search.google.com/test/rich-results",
    ],
    applies: ({ siteType }) => siteType === "ecommerce",
  },
  {
    id: "seo-nextjs-missing-metadata-api",
    title: "Metadata Next.js non utilisée",
    description: "Sur Next.js 14+, ne pas utiliser `export const metadata` ou `generateMetadata` mène à des duplicate titles/descriptions sur toutes les routes dynamiques. Impact direct sur le ranking des pages profondes.",
    severity: "high",
    relatedCheckIds: ["onpage-title", "onpage-metadesc", "tech-canonical"],
    mitigations: [
      "Chaque `page.tsx` doit exporter `metadata` ou `generateMetadata`",
      "Pour les routes dynamiques : générer title + description à partir des params",
      "Définir `metadataBase` dans `app/layout.tsx` pour OG images relatives",
    ],
    applies: ({ stack }) => stack.frontend === "Next.js",
  },
  {
    id: "seo-wordpress-yoast-vs-rankmath-config",
    title: "Mauvaise configuration plugin SEO WordPress",
    description: "Yoast/Rank Math mal configurés génèrent des canonical incorrects, des meta robots noindex sur des pages importantes, ou des schemas incomplets. Plus dangereux que l'absence de plugin.",
    severity: "medium",
    relatedCheckIds: ["onpage-meta-robots", "tech-canonical", "jsonld-incomplete"],
    mitigations: [
      "Audit Yoast / Rank Math : vérifier qu'AUCUNE page utile n'est en noindex (Search Console > Couverture)",
      "Régénérer le sitemap après changement de permaliens",
      "Désactiver les breadcrumbs si le thème les gère déjà (duplicate schema)",
      "Activer le clean-up des schemas inutiles (Website, Organization sur chaque page)",
    ],
    applies: ({ stack }) => stack.cms === "WordPress",
  },
  {
    id: "seo-shopify-duplicate-content",
    title: "Contenu dupliqué Shopify (variantes produits)",
    description: "Shopify génère par défaut des URLs /products/x?variant=123 sans canonical — chaque variante devient une page dupliquée. Google panalise tout le domaine.",
    severity: "high",
    relatedCheckIds: ["tech-canonical", "hreflang-no-reciprocity"],
    mitigations: [
      "Ajouter {{ canonical_url }} dans theme.liquid",
      "Configurer `seo: preventDefault` pour les routes variantes",
      "Si multi-langue : utiliser les hreflang natifs Shopify Markets",
    ],
    applies: ({ stack }) => stack.cms === "Shopify",
  },
  {
    id: "seo-missing-tracking",
    title: "Absence de tracking analytics",
    description: "Sans GA4 / Plausible / Umami installé correctement, impossible de mesurer le ROI SEO. Les décisions de contenu se prennent à l'aveugle.",
    severity: "low",
    relatedCheckIds: ["offpage-analytics"],
    mitigations: [
      "Installer GA4 via Google Tag Manager",
      "Alternative RGPD-friendly : Plausible / Umami (pas de cookie, pas de consentement requis)",
      "Lier la Search Console à GA4 pour les rapports Query",
    ],
    applies: ({ hasTracking }) => !hasTracking,
  },
  {
    id: "seo-mobile-first-indexing",
    title: "Mobile-first indexing : problèmes responsive",
    description: "Google indexe depuis 2023 la version mobile exclusivement. Un site avec du contenu masqué en mobile, des CTAs inaccessibles ou une vitesse < 2.5s LCP subit une dégradation significative du ranking.",
    severity: "high",
    relatedCheckIds: ["tech-viewport", "perf-render-blocking", "tech-ttfb"],
    mitigations: [
      "Testez sur https://pagespeed.web.dev/ (mode mobile)",
      "Assurez-vous que TOUT le contenu est présent dans le HTML mobile (pas seulement desktop)",
      "Objectifs : LCP < 2.5s, CLS < 0.1, INP < 200ms",
      "Utilisez `next/image` avec `priority` sur l'image LCP above-the-fold",
    ],
    applies: () => true,
  },
  {
    id: "seo-duplicate-indexation-dev",
    title: "Indexation accidentelle d'environnements dev/staging",
    description: "Sous-domaines dev.* ou staging.* parfois indexés (oubli de robots.txt). Résultat : duplicate content qui cannibalise le site de prod + fuite d'informations sensibles.",
    severity: "high",
    relatedCheckIds: ["tech-robots", "onpage-meta-robots"],
    mitigations: [
      "Sur dev/staging : `X-Robots-Tag: noindex, nofollow` au niveau du serveur",
      "Protéger par Basic Auth (double protection)",
      "Vérifier Search Console > `site:dev.exemple.com` qu'aucune URL n'est indexée",
    ],
    applies: () => true,
  },
];

export function buildSeoThreatModel(
  stack: StackInfo,
  siteType: SiteType,
  hasTracking: boolean,
  checks: { id: string; status: string }[]
): ThreatVector[] {
  const checkStatusById = new Map(checks.map((c) => [c.id, c.status]));
  const applicable = TEMPLATES.filter((t) => t.applies({ stack, siteType, hasTracking }));

  // Rank by severity + whether any related check is currently failing
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const scored = applicable.map((t) => {
    const hasFailingCheck = t.relatedCheckIds.some((id) => {
      const status = checkStatusById.get(id);
      return status === "fail" || status === "warn";
    });
    return {
      threat: t,
      priority: (severityRank[t.severity] ?? 4) - (hasFailingCheck ? 10 : 0),
    };
  });
  scored.sort((a, b) => a.priority - b.priority);

  return scored.slice(0, 5).map(({ threat }) => ({
    id: threat.id,
    title: threat.title,
    description: threat.description,
    severity: threat.severity,
    relatedCheckIds: threat.relatedCheckIds,
    mitigations: threat.mitigations,
  }));
}
