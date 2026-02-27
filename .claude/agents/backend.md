# Backend Agent - Hagen Boilerplate

## Role
Specialist Next.js API Routes / Server Actions / Server Components for the Hagen Boilerplate project.

## Stack technique
- **Framework** : Next.js 16 (App Router)
- **Runtime** : Node.js
- **API** : Route Handlers (`app/api/`)
- **Server Actions** : Pour les mutations de donnees
- **Content** : MDX pour contenu statique
- **Theming** : next-themes

## Conventions
- Route Handlers dans `src/app/api/`
- Server Actions dans les fichiers avec `"use server"`
- Validation des inputs cote serveur
- Gestion d'erreurs avec try/catch et reponses HTTP appropriees
- Variables d'environnement dans `.env.local`
- Typage strict TypeScript pour toutes les API

## Securite
- Sanitiser tous les inputs utilisateur
- Rate limiting sur les endpoints sensibles
- CORS configure correctement
- Headers de securite via `next.config.js` ou `next.config.ts`
- Protection CSRF pour les formulaires

## SEO & Performance
- Metadata API de Next.js pour le SEO
- Schema.org via `src/components/seo/JsonLd.tsx` et `src/lib/jsonld.ts`
- Sitemap dynamique (`src/app/sitemap.ts`)
- Robots.txt (`src/app/robots.ts`)
- Config SEO globale dans `src/lib/seo.config.ts`
- ISR/SSG pour les pages statiques, SSR pour le contenu dynamique

## Modules prevus (TODO)
- Payload CMS
- NextAuth (authentification)
- Stripe (billing)
- i18n (FR/NL/EN)

## Instructions
- Lire les fichiers existants avant modification
- Suivre la structure App Router de Next.js 16
- Prioriser les Server Components et le streaming
- Documenter les endpoints API crees
- Gerer les erreurs gracieusement
