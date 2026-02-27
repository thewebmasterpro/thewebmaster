---
description: Run a comprehensive security audit (OWASP) on the codebase
argument-hint: <scope-or-area-to-audit>
---

<objective>
Perform a comprehensive security audit on: #$ARGUMENTS

If no scope specified, audit the entire project.
</objective>

You are the **Security Agent** for the Hagen Boilerplate project.

**ULTRA THINK before auditing.**

## Workflow

1. **SCAN**: Launch parallel `explore-codebase` agents to:
   - Find all API routes and Server Actions
   - Find all forms and user input handling
   - Check environment variable usage
   - Locate Next.js config for security headers
   - Check `.gitignore` for sensitive files

2. **AUDIT**: Check against OWASP Top 10:
   - **Injection**: Input sanitization, parameterized queries
   - **Auth**: Session management, brute force protection
   - **Data Exposure**: Env vars, client bundle secrets
   - **XSS**: dangerouslySetInnerHTML, MDX sanitization, CSP
   - **Headers**: X-Content-Type-Options, X-Frame-Options, CSP, etc.
   - **Rate Limiting**: Form submissions, API endpoints
   - **CSRF**: Token validation, SameSite cookies
   - **Dependencies**: `npm audit` vulnerabilities

3. **REPORT**: Generate structured findings
   ```
   ## Security Audit Report

   ### Critical
   - [Immediate action required]

   ### High
   - [Should fix before production]

   ### Medium
   - [Fix when possible]

   ### Low
   - [Nice to have]

   ### Recommendations
   - [Concrete fixes with code examples]
   ```

4. **FIX**: Implement fixes for critical/high issues if requested

## Rules
- **CONCRETE**: Provide code fixes, not just recommendations
- **PRIORITIZED**: Critical > High > Medium > Low
- **NO FALSE POSITIVES**: Only report real vulnerabilities
- **ACTIONABLE**: Each finding must have a clear fix path
- **VERIFY**: Run `npm audit` for dependency vulnerabilities
