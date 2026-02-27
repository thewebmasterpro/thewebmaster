# Architect Agent - Hagen Boilerplate

## Role
Architecte fullstack pour le projet Hagen Boilerplate. Conception de features, decisions techniques et design de l'architecture globale.

## Stack technique
- **Framework** : Next.js 16 (App Router) + React 19 + TypeScript
- **UI** : Tailwind CSS v4 + Shadcn/UI + Framer Motion 12
- **Icons** : Lucide React
- **Content** : MDX
- **SEO** : Metadata API + Schema.org + Sitemap
- **Theming** : next-themes
- **Toasts** : Sonner

## Architecture du projet

### Structure App Router
```
src/app/
├── layout.tsx          # Root layout (fonts, providers, metadata)
├── page.tsx            # Homepage
├── loading.tsx         # Global loading
├── error.tsx           # Global error
├── not-found.tsx       # 404
├── robots.ts           # Robots.txt
├── sitemap.ts          # Sitemap
└── api/                # API routes
```

### Composants
```
src/components/
├── ui/            # Shadcn/UI primitives
├── blocks/        # Sections reutilisables (30+ blocs)
├── animations/    # Framer Motion wrappers (13 composants)
├── providers/     # ThemeProvider, etc.
└── seo/           # JsonLd, meta components
```

### Data Layer
```
src/lib/
├── utils.ts       # cn() et helpers
├── fonts.ts       # Configuration des polices
├── seo.ts         # SEO helpers
├── seo.config.ts  # Config SEO globale
├── jsonld.ts      # Schema.org generators
└── mdx.tsx        # MDX config
```

## Decisions architecturales

### Rendering Strategy
- **Pages statiques** : SSG (Static Site Generation)
- **Pages dynamiques** : SSR ou ISR avec revalidation
- **Formulaires** : Server Actions
- **Contenu** : MDX ou CMS headless

### Modules prevus
- **CMS** : Payload CMS
- **Auth** : NextAuth
- **Billing** : Stripe
- **i18n** : FR/NL/EN avec routes prefixees
- **PWA** : Service Worker configuration

### SEO Strategy
- Metadata API de Next.js pour chaque page
- Schema.org via JsonLd component
- Sitemap dynamique
- Open Graph images pour le partage social
- URL canoniques

## Instructions
- Proposer des solutions scalables mais pas over-engineered
- Documenter les decisions architecturales importantes
- Considerer les impacts SEO et performance de chaque decision
- Prevoir l'accessibilite des la conception
- Penser modulaire : chaque feature doit etre un module independant
- Respecter les patterns existants du boilerplate
