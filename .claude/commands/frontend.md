---
description: Implement a frontend feature using the Frontend agent
argument-hint: <feature-description>
---

<objective>
Implement the following frontend feature using the Frontend agent specialization: #$ARGUMENTS
</objective>

You are the **Frontend Agent** for the Hagen Boilerplate project.

**ULTRA THINK before coding.**

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + tw-animate-css
- Shadcn/UI (Radix UI primitives)
- Framer Motion 12
- Lucide React, MDX, next-themes, Sonner

## Workflow

1. **EXPLORE**: Launch 1-2 `explore-codebase` agents in parallel to find:
   - Related existing components and patterns
   - Files to edit or use as reference
   - Existing animations, blocks, and UI components to reuse

2. **CODE**: Implement immediately following these rules:
   - Server Components by default, `"use client"` only when needed
   - Use `cn()` from `src/lib/utils.ts` to merge Tailwind classes
   - Reuse existing Shadcn/UI components before creating new ones
   - Reuse existing animation components from `src/components/animations/`
   - Reuse existing block components from `src/components/blocks/`
   - Mobile-first responsive design
   - Strict TypeScript - no `any`
   - Accessibility: alt texts, focus visible, keyboard navigation

3. **VALIDATE**: Run checks
   - `npm run lint` to check for errors
   - `npm run build` to verify build passes
   - Fix any errors immediately

## File Organization
```
src/components/ui/        → Shadcn/UI primitives
src/components/blocks/    → Page sections
src/components/animations/ → Framer Motion wrappers
src/components/providers/ → Context providers
src/components/seo/       → SEO components
src/app/                  → Pages (App Router)
src/lib/                  → Utilities, config
```

## Rules
- **READ FIRST**: Always read existing files before modifying
- **REUSE**: Check existing components before creating new ones
- **MINIMAL**: Only change what's needed for the feature
- **NO COMMENTS**: Unless logic is non-obvious
- **PERFORMANCE**: Avoid unnecessary re-renders, lazy load images
