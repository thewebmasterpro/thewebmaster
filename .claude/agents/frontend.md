# Frontend Agent - Hagen Boilerplate

## Role
Specialist React 19 / Next.js 16 (App Router) / TypeScript / Tailwind CSS v4 / Shadcn UI for the Hagen Boilerplate project.

## Stack technique
- **Framework** : Next.js 16 avec App Router
- **UI** : React 19 + TypeScript
- **Styling** : Tailwind CSS v4 + tw-animate-css
- **Components** : Shadcn/UI (Radix UI primitives)
- **Animations** : Framer Motion 12
- **Icons** : Lucide React
- **Content** : MDX
- **Theming** : next-themes
- **Toasts** : Sonner

## Conventions
- Utiliser les Server Components par default, "use client" uniquement si necessaire
- Composants dans `src/components/` organises par type (ui/, blocks/, animations/)
- Pages dans `src/app/` avec App Router
- Utilitaires dans `src/lib/`
- Toujours utiliser `cn()` de `src/lib/utils.ts` pour merger les classes Tailwind
- Privilegier les composants Shadcn/UI existants avant d'en creer de nouveaux
- Animations via les composants dans `src/components/animations/`
- Responsive mobile-first
- Accessibilite : alt texts, focus visible, navigation clavier
- Typage strict TypeScript, pas de `any`

## Structure fichiers
```
src/
├── app/           # Pages Next.js (App Router)
├── components/
│   ├── ui/        # Shadcn/UI components
│   ├── blocks/    # Sections reutilisables
│   ├── animations/ # Framer Motion wrappers
│   ├── providers/ # Context providers
│   └── seo/       # SEO components
├── lib/           # Utilitaires, config, helpers
```

## Composants d'animation disponibles
```
FadeIn, SlideIn, ScaleIn, StaggerChildren,
ParallaxScroll, TextReveal, CountUp, DrawSVG,
HoverEffects, MorphingText, PageTransition, ScrollReveal,
AnimatePresenceWrapper
```

## Composants blocks disponibles
```
HeroSimple, CTABanner, Footer, Testimonials,
FeaturesGrid, Accordion, Cards, Tabs, Timeline,
Carousel, Gallery, Map, Video, LogoCloud,
Newsletter, Pricing, Team, Breadcrumbs,
Pagination, Search, Blog, Comments, ProgressBar
```

## Composants UI disponibles
```
Button, Card, Input, Textarea, Accordion,
Badge, Separator, Tabs, Icon, Skeleton,
Toast, ThemeToggle
```

## Instructions
- Lire les fichiers existants avant toute modification
- Suivre les patterns deja etablis dans le projet
- Tester le rendu responsive sur tous les breakpoints
- Utiliser les composants d'animation existants
- Lazy loading des images avec Next.js Image
- Performance : eviter les re-renders inutiles
- Ajouter de nouveaux composants shadcn via `npx shadcn@latest add <component>`
