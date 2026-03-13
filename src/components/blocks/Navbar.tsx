"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { locales } from "@/lib/i18n/config";

interface NavLink {
  label: string;
  href: string;
}

interface NavDropdown {
  label: string;
  children: NavLink[];
}

type NavItem = NavLink | NavDropdown;

function isDropdown(item: NavItem): item is NavDropdown {
  return "children" in item;
}

const navLabels = {
  fr: {
    tools: "Outils",
    seo: "Audit SEO",
    perf: "Audit Performance",
    sec: "Audit Sécurité",
    home: "Accueil",
    services: "Services",
    sos: "Dépannage",
    process: "Processus",
    about: "À propos",
    faq: "FAQ",
    contact: "Contact",
  },
  en: {
    tools: "Tools",
    seo: "SEO Audit",
    perf: "Performance Audit",
    sec: "Security Audit",
    home: "Home",
    services: "Services",
    sos: "Support",
    process: "Process",
    about: "About",
    faq: "FAQ",
    contact: "Contact",
  },
  nl: {
    tools: "Tools",
    seo: "SEO Audit",
    perf: "Prestatie Audit",
    sec: "Beveiligingsaudit",
    home: "Home",
    services: "Diensten",
    sos: "Ondersteuning",
    process: "Proces",
    about: "Over ons",
    faq: "FAQ",
    contact: "Contact",
  },
};

function getDefaultLinks(locale: string): NavItem[] {
  const t = navLabels[locale as keyof typeof navLabels] || navLabels.fr;
  const toolsMenu: NavDropdown = {
    label: t.tools,
    children: [
      { label: t.seo, href: "/seo-audit" },
      { label: t.perf, href: "/performance-audit" },
      { label: t.sec, href: "/security-audit" },
    ],
  };
  return [
    { label: t.home, href: "#accueil" },
    { label: t.services, href: "#services" },
    { label: t.sos, href: "#sos" },
    { label: t.process, href: "#processus" },
    { label: t.about, href: "#about" },
    { label: t.faq, href: "#faq" },
    toolsMenu,
    { label: t.contact, href: "#contact" },
  ];
}

interface NavbarProps {
  logo?: React.ReactNode;
  links?: NavItem[];
  ctaLabel?: string;
  ctaHref?: string;
  locale?: string;
  className?: string;
}

function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    // Replace current locale in path with new locale
    const segments = pathname.split("/");
    segments[1] = newLocale;
    window.location.href = segments.join("/");
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/30 p-0.5">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={cn(
            "px-2 py-1 text-xs font-semibold uppercase rounded-md transition-all",
            l === locale
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function DesktopDropdown({ item, locale }: { item: NavDropdown; locale: string }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        onClick={() => setOpen(!open)}
      >
        {item.label}
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 min-w-50 rounded-lg border border-border/50 bg-background/95 backdrop-blur-xl shadow-lg overflow-hidden"
          >
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={`/${locale}${child.href}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileDropdown({
  item,
  locale,
  onLinkClick,
}: {
  item: NavDropdown;
  locale: string;
  onLinkClick: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
      >
        {item.label}
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={`/${locale}${child.href}`}
                onClick={onLinkClick}
                className="block pl-8 pr-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar({
  logo,
  links,
  ctaLabel = "Devis gratuit",
  ctaHref = "#contact",
  locale = "fr",
  className,
}: NavbarProps) {
  const navLinks = links ?? getDefaultLinks(locale);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent",
        className
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            {logo || (
              <span className="text-xl font-bold tracking-tight">
                The<span className="text-primary">Webmaster</span>
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) =>
              isDropdown(item) ? (
                <DesktopDropdown key={item.label} item={item} locale={locale} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              )
            )}
          </div>

          {/* Desktop CTA + Language */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher locale={locale} />
            <Link
              href="tel:+32491348143"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>+32 491 34 81 43</span>
            </Link>
            <Button asChild size="sm">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="lg:hidden p-2 text-foreground"
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          >
            {isMobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-background/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((item) =>
                isDropdown(item) ? (
                  <MobileDropdown
                    key={item.label}
                    item={item}
                    locale={locale}
                    onLinkClick={handleLinkClick}
                  />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                )
              )}
              <div className="pt-4 space-y-3">
                <div className="px-4 py-2">
                  <LanguageSwitcher locale={locale} />
                </div>
                <Link
                  href="tel:+32491348143"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground"
                >
                  <Phone className="w-4 h-4" />
                  +32 491 34 81 43
                </Link>
                <Button asChild className="w-full">
                  <Link href={ctaHref} onClick={handleLinkClick}>
                    {ctaLabel}
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
