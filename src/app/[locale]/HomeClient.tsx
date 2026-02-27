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
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { LucideIcon } from "lucide-react";

// =============================================================================
// ICON MAPS (icons can't be serialized in JSON dictionaries)
// =============================================================================

const serviceIcons: LucideIcon[] = [
  Globe,
  Palette,
  Share2,
  Megaphone,
  Search,
  MonitorSmartphone,
  MailOpen,
  Server,
  GraduationCap,
];

const sosProblemIcons: LucideIcon[] = [
  AlertTriangle,
  Wrench,
  AlertTriangle,
  Gauge,
];

const sosWhyUsIcons: LucideIcon[] = [
  BadgeCheck,
  Rocket,
  HeartHandshake,
  Euro,
];

const uspIcons: LucideIcon[] = [Zap, Shield, HeartHandshake, Award];

// =============================================================================
// HOMEPAGE — TheWebmaster.pro
// =============================================================================

interface HomeClientProps {
  dictionary: Dictionary;
  locale: string;
}

export default function HomeClient({ dictionary, locale }: HomeClientProps) {
  const d = dictionary;

  const navLinks = [
    { label: d.nav.home, href: "#accueil" },
    { label: d.nav.services, href: "#services" },
    { label: d.nav.troubleshooting, href: "#sos" },
    { label: d.nav.process, href: "#processus" },
    { label: d.nav.about, href: "#about" },
    { label: d.nav.faq, href: "#faq" },
    { label: d.nav.contact, href: "#contact" },
  ];

  return (
    <main>
      <Navbar links={navLinks} ctaLabel={d.nav.cta} ctaHref="#contact" locale={locale} />
      <HeroSection d={d} />
      <GoldDivider />
      <ServicesSection d={d} />
      <GoldDivider />
      <SOSSection d={d} />
      <GoldDivider />
      <ProcessSection d={d} />
      <GoldDivider />
      <AboutSection d={d} />
      <GoldDivider />
      <FAQSectionBlock d={d} />
      <GoldDivider />
      <CTASection d={d} />
      <SiteFooter d={d} locale={locale} />
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

function HeroSection({ d }: { d: Dictionary }) {
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
            alt={d.hero.heroImageAlt}
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
                {d.hero.badge}
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
              {d.hero.title1}
            </SplitWords>
            <FadeIn delay={0.8} direction="up">
              <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-gold-shimmer">
                {d.hero.title2}
              </span>
            </FadeIn>
          </div>

          <ScrollReveal animation="blur" delay={1.0} duration={0.8}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              {d.hero.description}
            </p>
          </ScrollReveal>

          <ScaleIn delay={1.2} scale={0.8}>
            <div className="flex flex-wrap gap-4">
              <MagneticHover strength={0.15}>
                <Button asChild size="lg" className="text-base h-12 px-8">
                  <Link href="#contact">
                    {d.hero.ctaPrimary}
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
                  <Link href="#services">{d.hero.ctaSecondary}</Link>
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

function ServicesSection({ d }: { d: Dictionary }) {
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
              {d.services.label}
            </p>
          </ScrollReveal>
          <ScrollReveal animation="slide-up" duration={0.6}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {d.services.title}{" "}
              <span className="text-primary">{d.services.titleHighlight}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="blur" delay={0.3}>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {d.services.description}
            </p>
          </ScrollReveal>
        </div>

        <StaggerChildren
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {d.services.items.map((service, index) => {
            const Icon = serviceIcons[index] || Globe;
            return (
              <HoverLift key={service.title} y={-6} shadow>
                <div className="group relative p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm card-hover-glow h-full">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:animate-icon-float transition-colors">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </HoverLift>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}

// =============================================================================
// SOS WORDPRESS SECTION
// =============================================================================

function SOSSection({ d }: { d: Dictionary }) {
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
            {d.sos.label}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {d.sos.title}{" "}
            <span className="text-primary">{d.sos.titleHighlight}</span>
            {d.sos.titleEnd ? ` ${d.sos.titleEnd}` : ""}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {d.sos.description}
          </p>
        </ScrollReveal>

        {/* Problems list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-20">
          {d.sos.problems.map((problem, index) => {
            const Icon = sosProblemIcons[index] || AlertTriangle;
            return (
              <ScrollReveal
                key={problem}
                animation={index % 2 === 0 ? "slide-left" : "slide-right"}
                delay={index * 0.1}
              >
                <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm">{problem}</span>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Why choose us */}
        <StaggerChildren
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
          staggerDelay={0.1}
        >
          {d.sos.whyUs.map((item, index) => {
            const Icon = sosWhyUsIcons[index] || BadgeCheck;
            return (
              <HoverScale key={item.title} scale={1.05}>
                <div className="group text-center p-4 rounded-xl card-hover-glow">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:animate-icon-float transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </HoverScale>
            );
          })}
        </StaggerChildren>

        {/* Pricing cards */}
        <StaggerChildren
          className="grid gap-6 md:grid-cols-3"
          staggerDelay={0.1}
        >
          {d.sos.pricing.map((plan) => (
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
                    &euro;<CountUp to={plan.price} duration={1.5} />
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

function ProcessSection({ d }: { d: Dictionary }) {
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
            {d.process.label}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {d.process.title}{" "}
            <RotatingWords
              words={d.process.rotatingWords}
              interval={3000}
              wordClassName="text-primary"
            />
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {d.process.description}
          </p>
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {d.process.steps.map((item, index) => (
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

function AboutSection({ d }: { d: Dictionary }) {
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
                alt={d.about.imageAlt}
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
                {d.about.label}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {d.about.title}{" "}
                <span className="text-primary">{d.about.titleHighlight}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {d.about.description}
              </p>
              <ul className="space-y-4">
                {d.about.advantages.map((advantage, index) => (
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
                    {d.about.cta}
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
          {d.usps.map((usp, index) => {
            const Icon = uspIcons[index] || Zap;
            return (
              <HoverGlow
                key={usp.title}
                color="oklch(0.78 0.145 75 / 0.3)"
                blur={25}
                className="rounded-xl"
              >
                <div className="group text-center p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm card-hover-glow">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:animate-icon-float transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{usp.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {usp.description}
                  </p>
                </div>
              </HoverGlow>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}

// =============================================================================
// FAQ SECTION
// =============================================================================

function FAQSectionBlock({ d }: { d: Dictionary }) {
  const faqItems = d.faq.items.map((item, index) => ({
    id: `faq-${index + 1}`,
    title: item.title,
    content: item.content,
  }));

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
              {d.faq.label}
            </p>
          </ScrollReveal>
          <ScrollReveal animation="slide-up" delay={0.1}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {d.faq.title}{" "}
              <span className="text-primary">{d.faq.titleHighlight}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="blur" delay={0.3}>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {d.faq.description}
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

function CTASection({ d }: { d: Dictionary }) {
  return (
    <section id="contact" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background Image with Parallax */}
      <div className="absolute inset-0 -z-10">
        <ParallaxScroll speed={0.2} className="absolute inset-0">
          <Image
            src="/images/hero-chess-pawn-data.png"
            alt=""
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
                {d.contact.label}
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                {d.contact.title}{" "}
                <MorphingText
                  texts={d.contact.morphingWords}
                  interval={2500}
                  duration={0.4}
                  className="text-primary"
                />{" "}
                {d.contact.titleEnd}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                {d.contact.description}
              </p>

              <div className="space-y-4">
                {[
                  {
                    href: "tel:+32491348143",
                    icon: Phone,
                    label: d.contact.phone,
                    value: "+32 491 34 81 43",
                  },
                  {
                    href: "mailto:contact@thewebmaster.pro",
                    icon: Mail,
                    label: d.contact.email,
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
                        {d.contact.location}
                      </p>
                      <p className="font-semibold">{d.contact.locationValue}</p>
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
                  {d.contact.formTitle}
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
                        {d.contact.formName}
                      </label>
                      <input
                        type="text"
                        id="name"
                        placeholder={d.contact.formNamePlaceholder}
                        className="w-full h-11 px-4 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-2"
                      >
                        {d.contact.formEmail}
                      </label>
                      <input
                        type="email"
                        id="email"
                        placeholder={d.contact.formEmailPlaceholder}
                        className="w-full h-11 px-4 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium mb-2"
                    >
                      {d.contact.formSubject}
                    </label>
                    <select
                      id="subject"
                      className="w-full h-11 px-4 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="">
                        {d.contact.formSubjectPlaceholder}
                      </option>
                      {Object.entries(d.contact.formSubjectOptions).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium mb-2"
                    >
                      {d.contact.formMessage}
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      placeholder={d.contact.formMessagePlaceholder}
                      className="w-full px-4 py-3 rounded-lg border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                    />
                  </div>
                  <MagneticHover strength={0.15}>
                    <Button type="submit" size="lg" className="w-full">
                      {d.contact.formSubmit}
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

function SiteFooter({ d, locale }: { d: Dictionary; locale: string }) {
  return (
    <Footer
      logo={
        <span className="text-xl font-bold tracking-tight">
          The<span className="text-primary">Webmaster</span>
        </span>
      }
      description={d.footer.description}
      columns={[
        {
          title: d.footer.servicesTitle,
          links: d.footer.servicesLinks.map((label) => ({
            label,
            url: "#services",
          })),
        },
        {
          title: d.footer.companyTitle,
          links: [
            { label: d.footer.companyLinks.about, url: "#about" },
            { label: d.footer.companyLinks.process, url: "#processus" },
            { label: d.footer.companyLinks.faq, url: "#faq" },
            { label: d.footer.companyLinks.contact, url: "#contact" },
          ],
        },
        {
          title: d.footer.contactTitle,
          links: [
            { label: "+32 491 34 81 43", url: "tel:+32491348143" },
            {
              label: "contact@thewebmaster.pro",
              url: "mailto:contact@thewebmaster.pro",
            },
            { label: d.contact.locationValue, url: "#contact" },
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
        {
          label: d.footer.legal,
          url: `/${locale}/mentions-legales`,
        },
        {
          label: d.footer.privacy,
          url: `/${locale}/politique-de-confidentialite`,
        },
      ]}
      copyright={d.footer.copyright}
    />
  );
}
