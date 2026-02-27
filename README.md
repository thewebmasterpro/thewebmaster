# Hagen Boilerplate

Boilerplate Next.js moderne pour créer des sites web professionnels rapidement.

## 🚀 Stack

- **Next.js 14** — App Router, Server Components
- **TypeScript** — Type-safe
- **Tailwind CSS v4** — Styling utility-first
- **shadcn/ui** — Composants UI accessibles
- **Framer Motion** — Animations fluides
- **Lucide Icons** — Icônes

## 📦 Structure

```
src/
├── app/                    # Routes Next.js
│   ├── page.tsx           # Page d'accueil
│   ├── layout.tsx         # Layout principal
│   └── globals.css        # Styles globaux
├── components/
│   ├── ui/                # Composants shadcn/ui
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── animations/        # Wrappers Framer Motion
│   │   ├── FadeIn.tsx
│   │   ├── SlideIn.tsx
│   │   ├── ScaleIn.tsx
│   │   └── StaggerChildren.tsx
│   └── blocks/            # Sections de page
│       ├── HeroSimple.tsx
│       ├── FeaturesGrid.tsx
│       ├── CTABanner.tsx
│       ├── Testimonials.tsx
│       └── Footer.tsx
└── lib/
    └── utils.ts           # Utilitaires (cn, etc.)
```

## 🎯 Quick Start

```bash
# Cloner
git clone <repo> mon-projet
cd mon-projet

# Installer
npm install

# Lancer
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 🎨 Composants d'animation

```tsx
import { FadeIn, SlideIn, StaggerChildren } from "@/components/animations";

// Fade in au scroll
<FadeIn direction="up" delay={0.2}>
  <Card>...</Card>
</FadeIn>

// Slide depuis la gauche
<SlideIn direction="left">
  <Image />
</SlideIn>

// Enfants apparaissent en cascade
<StaggerChildren staggerDelay={0.1}>
  <Item />
  <Item />
  <Item />
</StaggerChildren>
```

## 🧱 Blocs disponibles

| Bloc | Description |
|------|-------------|
| `HeroSimple` | Hero avec titre, sous-titre, CTA |
| `FeaturesGrid` | Grille de fonctionnalités avec icônes |
| `CTABanner` | Bannière d'appel à l'action |
| `Testimonials` | Témoignages clients |
| `Footer` | Pied de page multi-colonnes |

## 🎨 Personnalisation

### Couleurs

Modifier `src/app/globals.css` :

```css
:root {
  --primary: 220 90% 56%;
  --primary-foreground: 0 0% 100%;
  /* ... */
}
```

### Ajouter des composants shadcn/ui

```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add form
```

## 📝 TODO

- [ ] Ajouter Payload CMS
- [ ] Module Auth (NextAuth)
- [ ] Module Billing (Stripe)
- [ ] PWA config
- [ ] SEO metadata helpers
- [ ] i18n (FR/NL/EN)
- [ ] Plus de blocs (Pricing, FAQ, Contact...)

## 📄 License

MIT — Hagen Digital
