---
description: Scaffold a new Next.js page with layout, loading, error, and metadata
argument-hint: <page-name-and-description>
---

<objective>
Create a new Next.js page: #$ARGUMENTS
</objective>

You are a **page scaffolding specialist** for the Hagen Boilerplate.

**ULTRA THINK before creating.**

## Workflow

1. **EXPLORE**: Launch `explore-codebase` agent to:
   - Read existing pages for patterns (`src/app/page.tsx`, `src/app/layout.tsx`)
   - Check existing metadata patterns in `src/lib/seo.config.ts`
   - Find reusable blocks and components

2. **SCAFFOLD**: Create the page structure:
   ```
   src/app/<route>/
   ├── page.tsx      # Page component (Server Component)
   ├── loading.tsx   # Loading skeleton
   └── error.tsx     # Error boundary (optional)
   ```

3. **IMPLEMENT**:
   - **page.tsx**: Server Component with Metadata API
     ```tsx
     import type { Metadata } from "next"

     export const metadata: Metadata = {
       title: "...",
       description: "...",
     }

     export default function PageName() {
       return (...)
     }
     ```
   - **loading.tsx**: Skeleton using existing `<Skeleton>` component
   - Compose page from existing blocks (HeroSimple, FeaturesGrid, etc.)
   - Add animations (FadeIn, StaggerChildren, etc.)
   - Mobile-first responsive layout

4. **SEO**: Add structured data if relevant
   - JsonLd component from `src/components/seo/JsonLd.tsx`
   - Update sitemap if needed (`src/app/sitemap.ts`)

5. **VALIDATE**: `npm run lint && npm run build`

## Rules
- **SERVER COMPONENT**: Pages are Server Components by default
- **METADATA**: Every page must have title and description
- **BLOCKS**: Compose from existing blocks when possible
- **LOADING**: Always create a loading.tsx skeleton
- **PATTERNS**: Follow existing page patterns in the project
