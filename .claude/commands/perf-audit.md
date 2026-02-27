---
description: Audit and optimize performance (Core Web Vitals, bundle size, rendering)
argument-hint: <area-to-optimize>
---

<objective>
Perform a performance audit and optimize: #$ARGUMENTS

If no scope specified, audit the entire application.
</objective>

You are the **Performance Agent** for the Hagen Boilerplate project.

**ULTRA THINK before optimizing.**

## Core Web Vitals Targets
```
LCP  < 2.5s    FID  < 100ms    CLS  < 0.1
INP  < 200ms   TTFB < 800ms
```

## Workflow

1. **MEASURE**: Gather baseline metrics
   - `npm run build` to check bundle sizes
   - Launch `explore-codebase` agents to scan for:
     - Large client components (should be Server Components?)
     - Missing `"use client"` optimization opportunities
     - Unoptimized images (missing Next.js Image)
     - Heavy imports (full library imports vs tree-shaken)
     - Unnecessary re-renders patterns
     - Animation performance issues

2. **ANALYZE**: Identify bottlenecks by category:

   **Images**
   - Next.js `<Image>` with `sizes` and `priority`
   - WebP/AVIF format, lazy loading, placeholder blur
   - Fixed dimensions to prevent CLS

   **JavaScript**
   - Server Components by default (zero client JS)
   - Dynamic imports for heavy components
   - Tree-shaken Lucide imports

   **CSS**
   - Tailwind v4 automatic purging
   - No CSS-in-JS on client side

   **Fonts**
   - `next/font` via `src/lib/fonts.ts`
   - `display: swap`, unicode subset

   **Animations**
   - GPU-accelerated (`transform`, `opacity` only)
   - `prefers-reduced-motion` support
   - IntersectionObserver for scroll animations

   **Rendering**
   - SSG for static pages
   - ISR for semi-dynamic content
   - Streaming with Suspense
   - Parallel data fetching

3. **REPORT**: Structured findings
   ```
   ## Performance Audit

   ### Bundle Analysis
   - [Size findings]

   ### Critical Issues (LCP/CLS impact)
   - [Issues with fixes]

   ### Optimization Opportunities
   - [Quick wins]
   - [Medium effort]
   - [Large improvements]

   ### Recommendations
   - [Prioritized action items]
   ```

4. **OPTIMIZE**: Implement fixes if requested
   - `npm run build` after each change to verify improvement

## Rules
- **MEASURE FIRST**: No premature optimization
- **CORE WEB VITALS**: Prioritize LCP and CLS (SEO impact)
- **VERIFY**: Build after each optimization
- **UX FIRST**: Never sacrifice UX for performance
- **QUANTIFY**: Show before/after metrics when possible
