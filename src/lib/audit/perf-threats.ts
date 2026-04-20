import type { StackInfo, ThreatVector } from "@/types/audit";

// Performance threat model: the attacks are not attackers here, they are
// business / UX consequences of poor performance. We surface the top 5
// risks most applicable to the detected stack + findings.

interface PerfThreatTemplate extends Omit<ThreatVector, "relatedCheckIds"> {
  relatedCheckIds: string[];
  applies: (ctx: { stack: StackInfo }) => boolean;
}

const TEMPLATES: PerfThreatTemplate[] = [
  {
    id: "perf-cwv-ranking-penalty",
    title: "Pénalité ranking Google pour Core Web Vitals insuffisants",
    description: "Depuis 2021 (Page Experience Update), les Core Web Vitals sont un facteur de ranking. Un LCP > 4 s ou CLS > 0.25 fait perdre 10-30 % de trafic organique par rapport à un concurrent au niveau.",
    severity: "high",
    relatedCheckIds: ["cwv-lcp", "cwv-cls", "cwv-inp", "cwv-lighthouse-score"],
    mitigations: [
      "Ciblez LCP < 2.5 s (idéalement < 1.8 s) : image hero en priority, preload font critique, serveur < 200 ms TTFB",
      "CLS < 0.1 : dimensions explicites sur toutes les images, reserved ad-slots, font-display swap avec size-adjust",
      "INP < 200 ms : splittez les handlers d'interaction lourds, yield au main-thread avec requestIdleCallback",
    ],
    applies: () => true,
  },
  {
    id: "perf-mobile-abandonment",
    title: "Taux d'abandon mobile (pages lentes)",
    description: "53 % des utilisateurs mobile abandonnent une page qui met > 3 s à charger (Google, 2023). Sur 3G/4G saturé, chaque 100 Ko de JS = ~1 s de parsing supplémentaire.",
    severity: "high",
    relatedCheckIds: ["perf-budget-scripts", "perf-budget-total", "cwv-lcp"],
    mitigations: [
      "Réduisez le JavaScript total à < 400 Ko minifié",
      "Testez depuis un vrai device bas de gamme (Moto G4) via Lighthouse",
      "Activez HTTP/3 pour réduire la latence sur réseau mobile",
    ],
    applies: () => true,
  },
  {
    id: "perf-third-party-tax",
    title: "Taxe des scripts tiers",
    description: "Les scripts tiers (analytics, chat, ads, A/B testing) représentent en médiane 45 % du JavaScript total d'une page commerciale (HTTP Archive 2024). Chacun ajoute DNS + TLS + parsing + main-thread blocking.",
    severity: "medium",
    relatedCheckIds: ["perf-third-party-count", "perf-ads-heavy", "perf-chat-widget"],
    mitigations: [
      "Audit ROI par outil : un tag installé en 2020 rapporte-t-il encore des données exploitées ?",
      "Consolidez via Google Tag Manager (1 script + règles) vs N scripts séparés",
      "Chargez après l'interaction utilisateur (chat sur clic, analytics sur idle)",
    ],
    applies: () => true,
  },
  {
    id: "perf-nextjs-image-misuse",
    title: "Mauvaise utilisation de next/image",
    description: "Sur Next.js, une balise <img> native (au lieu de next/image) sert des images non-optimisées, non-responsive, sans AVIF/WebP automatique — impact direct sur le LCP.",
    severity: "medium",
    relatedCheckIds: ["perf-budget-images", "cwv-lcp"],
    mitigations: [
      "Remplacez toutes les <img> par <Image> de next/image",
      "Définissez `priority` sur l'image LCP above-the-fold",
      "Utilisez `sizes` pour servir la résolution adaptée au viewport",
    ],
    applies: (ctx) => ctx.stack.frontend === "Next.js",
  },
  {
    id: "perf-wordpress-plugin-bloat",
    title: "Plugin bloat WordPress",
    description: "Un site WordPress moyen charge 12-20 plugins, chacun injectant du CSS et du JS sur TOUTES les pages. Résultat : pages > 3 Mo avec 40+ requêtes pour une home page simple.",
    severity: "high",
    relatedCheckIds: ["perf-budget-total", "perf-script-count"],
    mitigations: [
      "Audit plugin par plugin : chaque plugin indispensable justifie son poids ?",
      "Plugin `Asset CleanUp` ou `Perfmatters` pour désactiver les assets par page",
      "Utilisez un plugin de cache (WP Rocket, LiteSpeed) qui fait aussi la minification + critical CSS",
    ],
    applies: (ctx) => ctx.stack.cms === "WordPress",
  },
  {
    id: "perf-shopify-theme-bloat",
    title: "Theme bloat Shopify",
    description: "Les thèmes Shopify gratuits (Dawn, etc.) sont légers, mais les thèmes premium et customisations agence ajoutent souvent 500 Ko+ de JavaScript pour des effets visuels peu utiles.",
    severity: "medium",
    relatedCheckIds: ["perf-budget-scripts", "cwv-lcp"],
    mitigations: [
      "Audit Shopify `theme check` pour repérer les anti-patterns",
      "Retirez les sliders, parallax, animations JS non-critiques",
      "Configurez l'image hero comme priority + formats modernes",
    ],
    applies: (ctx) => ctx.stack.cms === "Shopify",
  },
  {
    id: "perf-no-cdn-tax",
    title: "Absence de CDN",
    description: "Sans CDN, les visiteurs distants du serveur origine souffrent d'une latence élevée (150-400 ms de RTT). Le TTFB s'effondre sur mobile hors Europe.",
    severity: "medium",
    relatedCheckIds: ["cwv-server-response", "cwv-lcp"],
    mitigations: [
      "Cloudflare (gratuit) : DNS + CDN + SSL en 5 minutes",
      "Vercel / Netlify : edge automatique pour les sites statiques ou Next.js",
      "Sur AWS/GCP : ajoutez CloudFront / Cloud CDN devant l'origine",
    ],
    applies: (ctx) => ctx.stack.hosting === null,
  },
  {
    id: "perf-font-foit-flash",
    title: "FOIT : texte invisible pendant le chargement des fontes",
    description: "Sans `font-display: swap`, le texte reste invisible jusqu'à 3 s sur une connexion lente. L'utilisateur pense que la page est cassée et clique ailleurs.",
    severity: "medium",
    relatedCheckIds: ["perf-font-display-missing", "perf-font-display-block", "perf-google-fonts-v1"],
    mitigations: [
      "Ajoutez `font-display: swap` à tous les @font-face",
      "Préchargez la fonte primaire : `<link rel=\"preload\" as=\"font\" type=\"font/woff2\" crossorigin>`",
      "Utilisez `next/font` qui gère tout cela automatiquement",
    ],
    applies: () => true,
  },
  {
    id: "perf-large-dom",
    title: "DOM trop volumineux",
    description: "Un DOM > 1500 nœuds augmente le coût de chaque recalc de layout. Les animations deviennent saccadées, les handlers d'events se multiplient, la mémoire explose sur mobile.",
    severity: "low",
    relatedCheckIds: ["cwv-tbt", "cwv-inp"],
    mitigations: [
      "Virtualisez les longues listes (react-virtual, @tanstack/virtual)",
      "Lazy-render les sections below-the-fold avec IntersectionObserver",
      "Supprimez le HTML inutile injecté par les builders visuels",
    ],
    applies: () => true,
  },
  {
    id: "perf-cache-miss",
    title: "Cache navigateur sous-exploité",
    description: "Sans Cache-Control long + URL versionnées, chaque visite re-télécharge les assets. Coût : TTFB équivalent à une première visite à chaque retour.",
    severity: "medium",
    relatedCheckIds: ["perf-cache-headers"],
    mitigations: [
      "Assets statiques (JS, CSS, fontes, images) : `Cache-Control: public, max-age=31536000, immutable`",
      "URLs versionnées (hash dans le nom du fichier) → invalidation propre lors des déploiements",
      "HTML : `Cache-Control: no-cache` ou TTL court (60 s) + ETag",
    ],
    applies: () => true,
  },
];

export function buildPerfThreatModel(
  stack: StackInfo,
  checks: { id: string; status: string }[]
): ThreatVector[] {
  const checkStatusById = new Map(checks.map((c) => [c.id, c.status]));
  const applicable = TEMPLATES.filter((t) => t.applies({ stack }));

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
