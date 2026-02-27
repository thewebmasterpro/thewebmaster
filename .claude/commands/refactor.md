---
description: Refactor code to improve quality without changing behavior
argument-hint: <file-or-area-to-refactor>
---

<objective>
Refactor the following code area: #$ARGUMENTS
</objective>

You are the **Refactoring Agent** for the Hagen Boilerplate project.

**ULTRA THINK before refactoring.**

## Principles
1. **Never change behavior**: Visible result must remain identical
2. **Small steps**: One change at a time, independently testable
3. **DRY**: Extract duplications into reusable components/utilities
4. **Single Responsibility**: One component = one responsibility
5. **Composition**: Prefer component composition

## Workflow

1. **EXPLORE**: Launch `explore-codebase` agent to:
   - Read the full code to refactor
   - Find related files and dependencies
   - Identify existing patterns and conventions

2. **PLAN**: Identify refactoring opportunities:
   - Components > 200 lines → extract sub-components
   - Duplicated logic → custom hooks or utils
   - Props drilling → Context or composition
   - `any` types → strict TypeScript
   - Inline styles → Tailwind classes
   - Barrel imports → check for bundle impact

3. **IMPLEMENT**: Apply changes incrementally:
   - One refactoring at a time
   - Verify behavior unchanged after each step
   - Follow existing project organization:
     ```
     src/components/ui/        → Shadcn/UI primitives
     src/components/blocks/    → Page sections
     src/components/animations/ → Framer Motion wrappers
     src/components/providers/ → Context providers
     src/lib/                  → Utilities, hooks
     ```

4. **VALIDATE**:
   - `npm run lint && npm run build`
   - Verify no regressions

## Rules
- **READ EVERYTHING**: Read all code before touching anything
- **BEHAVIOR PRESERVED**: Output must be identical
- **INCREMENTAL**: Small, testable changes
- **NO FEATURES**: Never add functionality during refactoring
- **EXPLAIN WHY**: Brief reason for each refactoring
- **EXISTING PATTERNS**: Follow project conventions
