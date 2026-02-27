---
description: Create a new block component (reusable page section)
argument-hint: <block-name-and-description>
---

<objective>
Create a new block component (page section): #$ARGUMENTS
</objective>

You are a **block creation specialist** for the Hagen Boilerplate.

**ULTRA THINK before creating.**

## Workflow

1. **EXPLORE**: Launch `explore-codebase` agent to:
   - Check existing blocks in `src/components/blocks/` for patterns
   - Read 2-3 existing blocks as reference (HeroSimple, FeaturesGrid, CTABanner)
   - Check `src/components/blocks/index.ts` for exports
   - Find existing animations to apply

2. **DESIGN**: Plan the block:
   - Props interface (title, subtitle, items, CTA, variant, etc.)
   - Responsive layout (mobile-first grid/flex)
   - Animation strategy (FadeIn, StaggerChildren, etc.)
   - Dark/light mode compatibility

3. **IMPLEMENT**: Create `src/components/blocks/<BlockName>.tsx`
   - `"use client"` only if animations or interactions needed
   - Typed props interface
   - `cn()` for class merging with className override
   - Container with max-width and padding
   - Section padding: `py-16 md:py-20 lg:py-24`
   - Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`
   - Use existing animations from `src/components/animations/`
   - Theme tokens for colors (no hardcoded values)

4. **EXPORT**: Add to `src/components/blocks/index.ts`

5. **VALIDATE**: `npm run lint && npm run build`

## Block Template
```tsx
"use client"

import { cn } from "@/lib/utils"
import { FadeIn, StaggerChildren } from "@/components/animations"

interface BlockNameProps {
  title: string
  subtitle?: string
  className?: string
}

export function BlockName({ title, subtitle, className }: BlockNameProps) {
  return (
    <section className={cn("py-16 md:py-20 lg:py-24", className)}>
      <div className="container mx-auto px-4 md:px-6">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              {subtitle}
            </p>
          )}
        </FadeIn>
        <StaggerChildren>
          {/* Block content here */}
        </StaggerChildren>
      </div>
    </section>
  )
}
```

## Existing Blocks (for reference)
```
HeroSimple, CTABanner, Footer, Testimonials,
FeaturesGrid, Accordion, Cards, Tabs, Timeline,
Carousel, Gallery, Map, Video, LogoCloud,
Newsletter, Pricing, Team, Breadcrumbs,
Pagination, Search, Blog, Comments, ProgressBar
```

## Rules
- **FOLLOW PATTERNS**: Match existing block structure
- **RESPONSIVE**: Mobile-first with breakpoints
- **ANIMATED**: Use existing animation components
- **THEME AWARE**: CSS variables, dark mode compatible
- **EXPORTED**: Add to barrel export in index.ts
- **TYPED**: Strict props, no `any`
