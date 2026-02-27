"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe,
  Palette,
  Share2,
  Megaphone,
  MonitorSmartphone,
  Search,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  MailOpen,
  Server,
  GraduationCap,
  Zap,
  Shield,
  HeartHandshake,
  Award,
  AlertTriangle,
  Wrench,
  Gauge,
  Euro,
  BadgeCheck,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar, Footer, Accordion } from "@/components/blocks";
import {
  FadeIn,
  SlideIn,
  StaggerChildren,
  ScaleIn,
  ScrollReveal,
  ParallaxScroll,
  SplitWords,
  MorphingText,
  RotatingWords,
  HoverScale,
  HoverTilt,
  HoverLift,
  HoverGlow,
  MagneticHover,
  CountUp,
} from "@/components/animations";

// =============================================================================
// HOMEPAGE — TheWebmaster.pro
// =============================================================================

export default function Home() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <GoldDivider />
      <ServicesSection />
      <GoldDivider />
      <SOSSection />
      <GoldDivider />
      <ProcessSection />
      <GoldDivider />
      <AboutSection />
      <GoldDivider />
      <FAQSectionBlock />
      <GoldDivider />
      <CTASection />
      <SiteFooter />
    </main>
  );
}

// =============================================================================
// GOLD DIVIDER
// =============================================================================

function GoldDivider() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <ScrollReveal animation="scale">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </ScrollReveal>
    </div>
  );
}

// =============================================================================
// HERO SECTION
// =============================================================================

function HeroSection() {
  return (
    <section
      id="accueil"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with Parallax */}
      <div className="absolute inset-0 -z-10">
        <ParallaxScroll speed={0.3} className="absolute inset-0">
          <Image
            src="/images/hero-chess-king-gold.png"
            alt="Stratégie digitale - The Webmaster"
            fill
            className="object-cover object-center"
            priority
            quality={90}
          />
        </ParallaxScroll>
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
      </div>

      {/* Floating gold orbs */}
      <div className="gold-orb w-96 h-96 -top-20 -right-20 animate-float" />
      <div className="gold-orb w-72 h-72 bottom-20 -left-10 animate-float-delayed" />
      <div className="gold-orb w-48 h-48 top-1/3 right-1/4 animate-float-slow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="max-w-4xl">
          <FadeIn>
            <MagneticHover strength={0.2}>
              <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Agence Digitale en Belgique
              </p>
            </MagneticHover>
          </FadeIn>

          <div className="mb-6">
            <SplitWords
              as="span"
              staggerDelay={0.08}
              duration={0.5}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] block"
            >
              Votre Stratégie Digitale,
            </SplitWords>
            <FadeIn delay={0.8} direction="up">
              <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-gold-shimmer">
                Notre Expertise
              </span>
            </FadeIn>
          </div>

          <ScrollReveal animation="blur" delay={1.0} duration={0.8}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              Nous créons des expériences digitales qui transforment et
              propulsent votre business. Sites web, design, réseaux sociaux et
              publicité — tout pour dominer votre marché en ligne.
            </p>
          </ScrollReveal>

          <ScaleIn delay={1.2} scale={0.8}>
            <div className="flex flex-wrap gap-4">
              <MagneticHover strength={0.15}>
                <Button asChild size="lg" className="text-base h-12 px-8">
                  <Link href="#contact">
                    Démarrer votre projet
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </MagneticHover>
              <MagneticHover strength={0.15}>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="text-base h-12 px-8"
                >
                  <Link href="#services">Découvrir nos services</Link>
                </Button>
              </MagneticHover>
            </div>
          </ScaleIn>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <ChevronDown className="w-6 h-6 text-muted-foreground" />
      </motion.div>
    </section>
  );
}

// =============================================================================
// SERVICES SECTION
// =============================================================================

const services = [
  {
    icon: Globe,
    title: "Création de Sites Web",
    description:
      "Sites vitrines, e-commerce et applications web sur mesure. Design moderne, SEO optimisé et performances maximales.",
  },
  {
    icon: Palette,
    title: "Design Graphique",
    description:
      "Identité visuelle, logos, supports print et digitaux. Une image de marque cohérente et mémorable pour votre entreprise.",
  },
  {
    icon: Share2,
    title: "Réseaux Sociaux",
    description:
      "Stratégie social media, création de contenu et community management. Développez votre audience et engagez votre communauté.",
  },
  {
    icon: Megaphone,
    title: "Publicité Digitale",
    description:
      "Campagnes Google Ads, Meta Ads et LinkedIn. Maximisez votre ROI avec des campagnes ciblées et mesurables.",
  },
  {
    icon: Search,
    title: "SEO & Référencement",
    description:
      "Audit SEO, optimisation on-page et off-page, stratégie de contenu. Améliorez votre visibilité sur Google et attirez plus de clients.",
  },
  {
    icon: MonitorSmartphone,
    title: "Solutions Digitales",
    description:
      "Automatisation, outils IA, intégrations et maintenance. Des solutions technologiques pour optimiser votre activité.",
  },
  {
    icon: MailOpen,
    title: "Email Marketing",
    description:
      "Newsletters, campagnes email, automation marketing. Fidélisez vos clients et générez des leads qualifiés.",
  },
  {
    icon: Server,
    title: "Hébergement & Maintenance",
    description:
      "Hébergement web performant, maintenance, mises à jour et support technique. Votre site toujours en ligne et sécurisé.",
  },
  {
    icon: GraduationCap,
    title: "Formation & Consulting",
    description:
      "Formation digitale, accompagnement stratégique et consulting. Montez en compétences et prenez les bonnes décisions.",
  },
];

function ServicesSection() {
  return (
    <section id="services" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <ParallaxScroll speed={0.4} className="absolute inset-0">
          <Image
            src="/images/hero-chess-knight-wireframe.png"
            alt=""
            fill
            className="object-cover opacity-[0.18]"
          />
        </ParallaxScroll>
        <div className="absolute inset-0 bg-background/70" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <ScrollReveal animation="fade">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Nos Services
            </p>
          </ScrollReveal>
          <ScrollReveal animation="slide-up" duration={0.6}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Des solutions complètes pour votre{" "}
              <span className="text-primary">présence digitale</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="blur" delay={0.3}>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              De la conception à la promotion, nous accompagnons votre
              entreprise à chaque étape de sa transformation numérique.
            </p>
          </ScrollReveal>
        </div>

        <StaggerChildren
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {services.map((service) => (
            <HoverLift key={service.title} y={-6} shadow>
              <div className="group relative p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm card-hover-glow h-full">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:animate-icon-float transition-colors">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            </HoverLift>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

// =============================================================================
// SOS WORDPRESS SECTION
// =============================================================================

const sosProblems = [
  { icon: AlertTriangle, text: "Problèmes d'affichage ou site lent" },
  { icon: Wrench, text: "Fonctionnalités qui ne marchent plus" },
  { icon: AlertTriangle, text: "Codes d'erreur ou écran blanc" },
  { icon: Gauge, text: "Temps de chargement anormaux" },
];

const sosWhyUs = [
  {
    icon: BadgeCheck,
    title: "Expertise reconnue",
    description: "Des spécialistes WordPress avec des années d'expérience.",
  },
  {
    icon: Rocket,
    title: "Intervention rapide",
    description: "Prise en charge immédiate pour résoudre vos urgences.",
  },
  {
    icon: HeartHandshake,
    title: "Solutions sur mesure",
    description: "Chaque intervention est adaptée à votre situation.",
  },
  {
    icon: Euro,
    title: "Tarifs accessibles",
    description: "Des prix transparents et compétitifs sans surprise.",
  },
];

const sosPricing = [
  {
    title: "Urgence",
    price: 150,
    description:
      "Intervention rapide pour résoudre un problème critique sur votre site.",
    features: [
      "Prise en charge sous 2h",
      "Correction du problème",
      "Rapport d'intervention",
    ],
    cta: "J'ai besoin d'aide",
    highlighted: true,
  },
  {
    title: "Diagnostic",
    price: 65,
    description:
      "Analyse complète de votre site pour identifier tous les problèmes.",
    features: [
      "Audit technique complet",
      "Rapport détaillé",
      "Recommandations personnalisées",
    ],
    cta: "Faire analyser mon site",
    highlighted: false,
  },
  {
    title: "Maintenance",
    price: 29,
    suffix: "/mois",
    description: "Gardez votre site en parfait état avec un suivi régulier.",
    features: [
      "Mises à jour régulières",
      "Sauvegardes automatiques",
      "Support prioritaire",
    ],
    cta: "Souscrire un abonnement",
    highlighted: false,
  },
];

function SOSSection() {
  return (
    <section id="sos" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <ParallaxScroll speed={0.35} className="absolute inset-0">
          <Image
            src="/images/hero-chess-queen-dark.png"
            alt=""
            fill
            className="object-cover opacity-[0.2]"
          />
        </ParallaxScroll>
        <div className="absolute inset-0 bg-background/65" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal
          animation="scale"
          duration={0.7}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            SOS WordPress
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Votre site WordPress a des{" "}
            <span className="text-primary">problèmes</span> ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pas de panique ! Notre équipe d&apos;experts est là pour
            diagnostiquer et résoudre rapidement tous vos soucis techniques.
          </p>
        </ScrollReveal>

        {/* Problems list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-20">
          {sosProblems.map((problem, index) => (
            <ScrollReveal
              key={problem.text}
              animation={index % 2 === 0 ? "slide-left" : "slide-right"}
              delay={index * 0.1}
            >
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50">
                <problem.icon className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm">{problem.text}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Why choose us */}
        <StaggerChildren
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
          staggerDelay={0.1}
        >
          {sosWhyUs.map((item) => (
            <HoverScale key={item.title} scale={1.05}>
              <div className="group text-center p-4 rounded-xl card-hover-glow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:animate-icon-float transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </HoverScale>
          ))}
        </StaggerChildren>

        {/* Pricing cards */}
        <StaggerChildren
          className="grid gap-6 md:grid-cols-3"
          staggerDelay={0.1}
        >
          {sosPricing.map((plan) => (
            <HoverTilt key={plan.title} tiltDegree={5} scale={1.02}>
              <div
                className={`relative p-8 rounded-2xl border backdrop-blur-sm transition-all duration-300 h-full card-hover-glow ${
                  plan.highlighted
                    ? "border-primary bg-card shadow-lg shadow-primary/10 card-highlighted"
                    : "border-border/50 bg-card/50"
                }`}
              >
                <h3 className="text-xl font-semibold mb-2">{plan.title}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-primary">
                    €<CountUp to={plan.price} duration={1.5} />
                  </span>
                  <span className="text-muted-foreground">
                    {plan.suffix || "+"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {plan.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link href="#contact">{plan.cta}</Link>
                </Button>
              </div>
            </HoverTilt>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

// =============================================================================
// PROCESS SECTION
// =============================================================================

const processSteps = [
  {
    step: "01",
    title: "Consultation",
    description:
      "Nous analysons vos besoins, votre marché et vos objectifs pour définir une stratégie digitale sur mesure.",
  },
  {
    step: "02",
    title: "Conception & Création",
    description:
      "Notre équipe conçoit et développe votre projet avec les dernières technologies et les meilleures pratiques du secteur.",
  },
  {
    step: "03",
    title: "Lancement & Suivi",
    description:
      "Mise en ligne, formation et suivi des performances. Nous restons à vos côtés pour optimiser vos résultats.",
  },
];

function ProcessSection() {
  return (
    <section
      id="processus"
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <ParallaxScroll speed={0.35} className="absolute inset-0">
          <Image
            src="/images/hero-chess-piece-network.png"
            alt=""
            fill
            className="object-cover opacity-[0.18]"
          />
        </ParallaxScroll>
        <div className="absolute inset-0 bg-background/70" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="slide-up" className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Notre Processus
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Un accompagnement en{" "}
            <RotatingWords
              words={["3 étapes", "toute confiance", "toute transparence"]}
              interval={3000}
              wordClassName="text-primary"
            />
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une méthodologie éprouvée pour garantir le succès de votre projet
            digital.
          </p>
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {processSteps.map((item, index) => (
            <ScaleIn key={item.step} delay={index * 0.2} scale={0.7}>
              <div className="relative text-center p-8 rounded-2xl border border-border/50 bg-card/50 card-hover-glow">
                <span className="text-7xl font-bold text-primary/10 font-[family-name:var(--font-display)]">
                  {item.step}
                </span>
                <h3 className="text-xl font-semibold mt-2 mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// ABOUT / WHY CHOOSE US + USP SECTION (merged)
// =============================================================================

const advantages = [
  "Expertise technique de pointe (Next.js, React, WordPress)",
  "Design sur mesure adapté à votre image de marque",
  "Optimisation SEO intégrée dès la conception",
  "Accompagnement personnalisé de A à Z",
  "Résultats mesurables et ROI transparent",
  "Support réactif et maintenance continue",
];

const usps = [
  {
    icon: Zap,
    title: "Rapidité d'exécution",
    description:
      "Des délais de livraison courts grâce à nos processus optimisés et notre expertise technique.",
  },
  {
    icon: Shield,
    title: "Qualité garantie",
    description:
      "Code propre, performances optimales et sécurité renforcée sur chaque projet livré.",
  },
  {
    icon: HeartHandshake,
    title: "Accompagnement sur mesure",
    description:
      "Un interlocuteur dédié et un suivi personnalisé à chaque étape de votre projet.",
  },
  {
    icon: Award,
    title: "Résultats mesurables",
    description:
      "Des KPIs clairs et un ROI transparent pour chaque action mise en place.",
  },
];

function AboutSection() {
  return (
    <section id="about" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <ParallaxScroll speed={0.3} className="absolute inset-0">
          <Image
            src="/images/hero-chess-knight-particles.png"
            alt=""
            fill
            className="object-cover opacity-[0.15]"
          />
        </ParallaxScroll>
        <div className="absolute inset-0 bg-background/70" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image with Parallax */}
          <SlideIn direction="left">
            <ParallaxScroll
              speed={0.2}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden"
            >
              <Image
                src="/images/hero-chess-knight-close.png"
                alt="Expertise digitale - The Webmaster"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </ParallaxScroll>
          </SlideIn>

          {/* Content */}
          <SlideIn direction="right">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                Pourquoi nous choisir
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Une approche stratégique pour des{" "}
                <span className="text-primary">résultats concrets</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Comme aux échecs, chaque mouvement compte dans le digital. Nous
                élaborons des stratégies réfléchies et exécutons avec précision
                pour positionner votre entreprise en leader sur son marché.
              </p>
              <ul className="space-y-4">
                {advantages.map((advantage, index) => (
                  <ScrollReveal
                    key={advantage}
                    animation="slide-left"
                    delay={index * 0.1}
                  >
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{advantage}</span>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
              <MagneticHover strength={0.2}>
                <Button asChild size="lg" className="mt-8">
                  <Link href="#contact">
                    En savoir plus
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </MagneticHover>
            </div>
          </SlideIn>
        </div>

        {/* USPs */}
        <StaggerChildren
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-20"
          staggerDelay={0.1}
        >
          {usps.map((usp) => (
            <HoverGlow
              key={usp.title}
              color="oklch(0.78 0.145 75 / 0.3)"
              blur={25}
              className="rounded-xl"
            >
              <div className="group text-center p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm card-hover-glow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:animate-icon-float transition-colors">
                  <usp.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{usp.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {usp.description}
                </p>
              </div>
            </HoverGlow>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

// =============================================================================
// FAQ SECTION
// =============================================================================

const faqItems = [
  {
    id: "faq-1",
    title: "Combien coûte la création d'un site web ?",
    content:
      "Le coût dépend de la complexité du projet. Un site vitrine démarre à partir de 1 500€, un site e-commerce à partir de 3 000€. Nous établissons un devis gratuit et détaillé après analyse de vos besoins.",
  },
  {
    id: "faq-2",
    title: "Quels sont les délais de réalisation ?",
    content:
      "En moyenne, un site vitrine est livré en 3 à 4 semaines, un e-commerce en 6 à 8 semaines. Ces délais dépendent de la complexité et de la réactivité pour les retours.",
  },
  {
    id: "faq-3",
    title: "Proposez-vous la maintenance après la mise en ligne ?",
    content:
      "Oui, nous proposons des contrats de maintenance mensuelle incluant les mises à jour, la sécurité, les sauvegardes et le support technique. Votre site reste performant et sécurisé.",
  },
  {
    id: "faq-4",
    title: "Mon site sera-t-il optimisé pour le référencement (SEO) ?",
    content:
      "Absolument. L'optimisation SEO est intégrée dès la conception : structure technique, balises, vitesse de chargement, contenu optimisé et compatibilité mobile.",
  },
  {
    id: "faq-5",
    title: "Travaillez-vous avec des clients en dehors de la Belgique ?",
    content:
      "Oui, nous travaillons avec des clients dans toute la Belgique et à l'international. Nous communiquons en français, néerlandais et anglais.",
  },
  {
    id: "faq-6",
    title: "Puis-je modifier mon site moi-même après la livraison ?",
    content:
      "Oui, tous nos sites sont livrés avec un système de gestion de contenu (CMS) intuitif. Nous vous formons à son utilisation pour que vous puissiez être autonome.",
  },
];

function FAQSectionBlock() {
  return (
    <section id="faq" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <ParallaxScroll speed={0.3} className="absolute inset-0">
          <Image
            src="/images/hero-chess-pawn-liquid.png"
            alt=""
            fill
            className="object-cover opacity-[0.15]"
          />
        </ParallaxScroll>
        <div className="absolute inset-0 bg-background/70" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <ScrollReveal animation="fade">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              FAQ
            </p>
          </ScrollReveal>
          <ScrollReveal animation="slide-up" delay={0.1}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Questions <span className="text-primary">fréquentes</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="blur" delay={0.3}>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Retrouvez les réponses aux questions les plus courantes sur nos
              services.
            </p>
          </ScrollReveal>
        </div>

        <ScaleIn delay={0.2} scale={0.95} className="max-w-3xl mx-auto">
          <Accordion items={faqItems} variant="separated" iconStyle="plus" />
        </ScaleIn>
      </div>
    </section>
  );
}

// =============================================================================
// CTA / CONTACT SECTION
// =============================================================================

function CTASection() {
  return (
    <section id="contact" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background Image with Parallax */}
      <div className="absolute inset-0 -z-10">
        <ParallaxScroll speed={0.2} className="absolute inset-0">
          <Image
            src="/images/hero-chess-pawn-data.png"
            alt="Contact The Webmaster"
            fill
            className="object-cover"
          />
        </ParallaxScroll>
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text */}
          <FadeIn>
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                Contactez-nous
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Prêt à{" "}
                <MorphingText
                  texts={["transformer", "propulser", "dominer"]}
                  interval={2500}
                  duration={0.4}
                  className="text-primary"
                />{" "}
                votre présence en ligne ?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Discutons de votre projet. Nous vous proposons une consultation
                gratuite pour analyser vos besoins et définir la meilleure
                stratégie pour votre entreprise.
              </p>

              <div className="space-y-4">
                {[
                  {
                    href: "tel:+32491348143",
                    icon: Phone,
                    label: "Téléphone",
                    value: "+32 491 34 81 43",
                  },
                  {
                    href: "mailto:contact@thewebmaster.pro",
                    icon: Mail,
                    label: "Email",
                    value: "contact@thewebmaster.pro",
                  },
                ].map((item, index) => (
                  <ScrollReveal
                    key={item.label}
                    animation="slide-left"
                    delay={index * 0.15}
                  >
                    <HoverScale scale={1.02}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-4 text-foreground hover:text-primary transition-colors group"
                      >
                        <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <item.icon className="w-5 h-5 text-primary" />
                        </span>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="font-semibold">{item.value}</p>
                        </div>
                      </Link>
                    </HoverScale>
                  </ScrollReveal>
                ))}

                <ScrollReveal animation="slide-left" delay={0.3}>
                  <div className="flex items-center gap-4">
                    <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Localisation
                      </p>
                      <p className="font-semibold">Bruxelles, Belgique</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </FadeIn>

          {/* Contact Card */}
          <ScaleIn delay={0.3} scale={0.9}>
            <HoverGlow
              color="oklch(0.78 0.145 75 / 0.15)"
              blur={30}
              className="rounded-2xl"
            >
              <div className="p-8 md:p-10 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-6">
                  Demandez votre devis gratuit
                </h3>
                <form
                  className="space-y-5"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium mb-2"
                      >
                        Nom
                      </label>
                      <input
                        type="text"
                        id="name"
                        placeholder="Votre nom"
                        className="w-full h-11 px-4 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-2"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        placeholder="votre@email.com"
                        className="w-full h-11 px-4 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium mb-2"
                    >
                      Sujet
                    </label>
                    <select
                      id="subject"
                      className="w-full h-11 px-4 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="">Sélectionnez un service</option>
                      <option value="web">Création de site web</option>
                      <option value="design">Design graphique</option>
                      <option value="social">Réseaux sociaux</option>
                      <option value="ads">Publicité digitale</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      placeholder="Décrivez votre projet..."
                      className="w-full px-4 py-3 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                    />
                  </div>
                  <MagneticHover strength={0.15}>
                    <Button type="submit" size="lg" className="w-full">
                      Envoyer ma demande
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </MagneticHover>
                </form>
              </div>
            </HoverGlow>
          </ScaleIn>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// FOOTER
// =============================================================================

function SiteFooter() {
  return (
    <Footer
      logo={
        <span className="text-xl font-bold tracking-tight">
          The<span className="text-primary">Webmaster</span>
        </span>
      }
      description="Agence digitale belge spécialisée en création web, design graphique, réseaux sociaux et publicité digitale. Transformez votre présence en ligne."
      columns={[
        {
          title: "Services",
          links: [
            { label: "Création de sites web", url: "#services" },
            { label: "Design graphique", url: "#services" },
            { label: "Réseaux sociaux", url: "#services" },
            { label: "Publicité digitale", url: "#services" },
            { label: "Solutions digitales", url: "#services" },
          ],
        },
        {
          title: "Entreprise",
          links: [
            { label: "À propos", url: "#about" },
            { label: "Notre processus", url: "#processus" },
            { label: "FAQ", url: "#faq" },
            { label: "Contact", url: "#contact" },
          ],
        },
        {
          title: "Contact",
          links: [
            { label: "+32 491 34 81 43", url: "tel:+32491348143" },
            {
              label: "contact@thewebmaster.pro",
              url: "mailto:contact@thewebmaster.pro",
            },
            { label: "Bruxelles, Belgique", url: "#contact" },
          ],
        },
      ]}
      social={[
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/company/thewebmaster",
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/thewebmaster.pro",
        },
        {
          platform: "facebook",
          url: "https://www.facebook.com/thewebmaster.pro",
        },
      ]}
      legal={[
        { label: "Mentions légales", url: "/mentions-legales" },
        {
          label: "Politique de confidentialité",
          url: "/politique-de-confidentialite",
        },
      ]}
      copyright="© 2024 The Webmaster. Tous droits réservés."
    />
  );
}
