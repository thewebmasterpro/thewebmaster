---
description: Create a new reusable component following project conventions
argument-hint: <component-name-and-description>
---

<objective>
Create a new reusable component: #$ARGUMENTS
</objective>

You are a **component creation specialist** for the Hagen Boilerplate.

**ULTRA THINK before creating.**

## Workflow

1. **EXPLORE**: Launch `explore-codebase` agent to:
   - Check if a similar component already exists
   - Find patterns in existing components for reference
   - Check if Shadcn/UI has a matching primitive (`npx shadcn@latest add <name>`)

2. **DECIDE**: Choose the right location:
   ```
   src/components/ui/         → Primitive, generic, reusable (like Shadcn/UI)
   src/components/blocks/     → Page section, composed of UI primitives
   src/components/animations/  → Framer Motion wrapper
   src/components/layout/     → Header, Navigation, Footer
   src/components/providers/  → Context providers
   src/components/seo/        → SEO-related components
   ```

3. **IMPLEMENT**:
   - Server Component by default, `"use client"` only if needed
   - Strict TypeScript props interface
   - `cn()` for Tailwind class merging
   - Variant support via `class-variance-authority` if needed
   - Mobile-first responsive
   - Dark/light mode compatible (use theme tokens)
   - Accessible (ARIA, focus, keyboard)

4. **EXPORT**: Add to barrel export if one exists for that folder

5. **VALIDATE**: `npm run lint && npm run build`

## Component Template
```tsx
import { cn } from "@/lib/utils"

interface ComponentNameProps {
  className?: string
  children?: React.ReactNode
}

export function ComponentName({ className, children }: ComponentNameProps) {
  return (
    <div className={cn("base-classes", className)}>
      {children}
    </div>
  )
}
```

## Rules
- **CHECK FIRST**: Never create if it already exists or Shadcn has it
- **TYPED**: Strict props interface, no `any`
- **cn()**: Always support className override via cn()
- **SERVER FIRST**: Default to Server Component
- **ACCESSIBLE**: Semantic HTML, ARIA when needed
- **MINIMAL**: Only what's needed, no over-engineering
