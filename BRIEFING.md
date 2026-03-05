# Briefing Technique — TheWebmaster.pro
> Généré le 5 mars 2026 — À utiliser comme plan d'action

---

## 1. CRITIQUE — À faire immédiatement

### 1.1 DNS & Hébergement
- **Le domaine `thewebmaster.pro` ne pointe vers aucun serveur** (DNS_PROBE_FINISHED_NXDOMAIN)
- Configurer les enregistrements DNS A/CNAME chez le registrar vers l'hébergement choisi
- Choisir un hébergement : Vercel (recommandé pour Next.js), Coolify, VPS, etc.

### 1.2 Variables d'environnement en production
Les clés suivantes doivent être configurées sur l'hébergement :
```
RESEND_API_KEY=re_...                     # Clé API Resend (pas encore créée)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc4F4As...  # ✅ Configuré en local
RECAPTCHA_SECRET_KEY=6Lc4F4As...            # ✅ Configuré en local
```
- **Resend** : créer un compte sur https://resend.com, vérifier le domaine `thewebmaster.pro`, générer une API key
- **reCAPTCHA** : ajouter le domaine de production dans https://www.google.com/recaptcha/admin

### 1.3 Formulaire de contact
- Le formulaire est codé et fonctionnel mais **non testé en conditions réelles** (pas de clé Resend)
- Tester l'envoi d'email une fois Resend configuré
- Vérifier que le `from: noreply@thewebmaster.pro` est autorisé (domaine à vérifier dans Resend)

---

## 2. IMPORTANT — Améliorations prioritaires

### 2.1 Migration Middleware → Proxy (Next.js 16)
- **Warning** : `The "middleware" file convention is deprecated. Please use "proxy" instead.`
- Le fichier `src/middleware.ts` utilise l'ancienne convention
- Migrer vers la nouvelle API `proxy` de Next.js 16 : https://nextjs.org/docs/messages/middleware-to-proxy

### 2.2 Security Headers du site lui-même
Le site thewebmaster.pro n'a **aucun security header** configuré :
- Ajouter dans `next.config.ts` ou via le serveur :
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.google.com https://analytics.hagendigital.com; ...
  ```
- Ironique : l'outil d'audit de sécurité du site détectera des failles sur son propre site !

### 2.3 Pages légales non traduites
- `mentions-legales` et `politique-de-confidentialite` sont en français uniquement
- Les routes existent pour `/nl/` et `/en/` mais le contenu reste en FR
- Traduire le contenu juridique en néerlandais et anglais
- Adapter les URLs : `/en/legal-notice`, `/nl/wettelijke-vermeldingen` (optionnel, les slugs FR fonctionnent)

### 2.4 SPF / DMARC / DKIM pour les emails
- Configurer les enregistrements DNS pour l'envoi d'email :
  - **SPF** : `v=spf1 include:resend.com -all`
  - **DMARC** : `v=DMARC1; p=quarantine; rua=mailto:dmarc@thewebmaster.pro`
  - **DKIM** : fourni par Resend après vérification du domaine

---

## 3. RECOMMANDÉ — Qualité & Performance

### 3.1 SEO
- [ ] Ajouter un `og-image.jpg` (1200x630) — actuellement référencé dans le code mais le fichier n'existe peut-être pas
- [ ] Ajouter des données structurées pour les services (JSON-LD `Service`)
- [ ] Ajouter des données structurées FAQ (`FAQPage`)
- [ ] Vérifier le sitemap dans Google Search Console une fois le site en ligne
- [ ] Soumettre le sitemap aux 3 langues

### 3.2 Performance
- [ ] Optimiser les images chess (certaines sont en PNG, convertir en WebP/AVIF)
- [ ] Vérifier le Largest Contentful Paint (LCP) — l'image hero est en `priority` mais vérifier en prod
- [ ] Audit Lighthouse une fois déployé
- [ ] Ajouter `loading="lazy"` sur les images below-the-fold (Framer Motion parallax peut interférer)

### 3.3 Accessibilité
- [ ] Audit WCAG 2.1 AA
- [ ] Vérifier le contraste des couleurs gold/primary sur fond sombre
- [ ] Ajouter des `aria-label` sur les éléments interactifs sans texte
- [ ] Vérifier la navigation au clavier (tab order, focus visible)
- [ ] Le LanguageSwitcher utilise `window.location.href` — pas de SPA navigation (acceptable mais brusque)

### 3.4 Tests
- [ ] Ajouter des tests E2E (Playwright) pour le formulaire de contact
- [ ] Tester le changement de langue FR → NL → EN
- [ ] Tester le middleware de redirection locale
- [ ] Tester la page security-audit avec différents sites

---

## 4. NICE TO HAVE — Évolutions futures

### 4.1 Fonctionnalités
- [ ] Ajouter un blog/actualités (`/[locale]/blog/`) pour le SEO long-tail
- [ ] Ajouter une page portfolio/réalisations
- [ ] Ajouter un système de prise de RDV (Calendly/Cal.com)
- [ ] Ajouter un chat en direct (Crisp, Intercom, ou custom)
- [ ] Animation de chargement de page (page transition avec Framer Motion)

### 4.2 Outil Security Audit — Améliorations
- [ ] Ajouter un export PDF du rapport
- [ ] Ajouter un historique des scans (stockage local ou DB)
- [ ] Ajouter un scan récurrent automatique
- [ ] Ajouter la vérification des headers `Content-Type` sur les assets
- [ ] Ajouter la détection de versions vulnérables (WordPress, plugins connus)
- [ ] Ajouter un test de performance Lighthouse-like (CLS, FID, LCP via CrUX API)
- [ ] Rate limiter l'API `/api/security-audit` pour éviter les abus

### 4.3 Infrastructure
- [ ] CI/CD : GitHub Actions pour build + deploy automatique
- [ ] Monitoring : uptime check (UptimeRobot, Better Stack)
- [ ] Backup automatique du repo
- [ ] Environment staging pour tester avant prod

---

## 5. Architecture actuelle (référence rapide)

```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, providers, analytics, reCAPTCHA)
│   ├── sitemap.ts              # Sitemap i18n (9 URLs)
│   ├── robots.ts               # robots.txt
│   ├── api/
│   │   ├── contact/route.ts    # Envoi email via Resend + reCAPTCHA v3
│   │   └── security-audit/route.ts  # API d'audit de sécurité
│   └── [locale]/
│       ├── layout.tsx           # Layout locale (SEO hreflang)
│       ├── page.tsx             # Server wrapper → HomeClient
│       ├── HomeClient.tsx       # Page d'accueil (toutes sections)
│       ├── security-audit/      # Page cachée audit sécurité
│       ├── mentions-legales/
│       └── politique-de-confidentialite/
├── components/
│   ├── blocks/                  # Navbar (+ LanguageSwitcher), Footer, Accordion
│   ├── animations/              # Framer Motion (parallax, morphing, hover, etc.)
│   ├── ui/                      # Shadcn/UI
│   └── seo/                     # JsonLd
├── lib/
│   ├── i18n/                    # Config, get-dictionary, dictionaries (fr/nl/en)
│   ├── seo.ts / seo.config.ts  # SEO utilities
│   ├── fonts.ts                 # Geist fonts
│   └── jsonld.ts                # Structured data
└── middleware.ts                # Locale detection (à migrer vers proxy)
```

## 6. Stack technique
- **Framework** : Next.js 16.1.6 (App Router, Turbopack)
- **UI** : React 19, Tailwind CSS v4, Shadcn/UI, Framer Motion 12
- **i18n** : Custom (JSON dictionaries, pas de librairie externe)
- **Email** : Resend
- **Anti-spam** : reCAPTCHA v3
- **Analytics** : Umami (auto-hébergé)
- **Repo** : https://github.com/thewebmasterpro/thewebmaster.git

---

*Ce document sert de briefing pour les prochaines sessions de développement.*
