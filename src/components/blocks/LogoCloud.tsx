"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// =============================================================================
// LOGO CLOUD
// Display client/partner logos
// =============================================================================

interface Logo {
  src: string;
  alt: string;
  href?: string;
  width?: number;
  height?: number;
}

interface LogoCloudProps {
  logos: Logo[];
  title?: string;
  variant?: "default" | "grid" | "scroll";
  grayscale?: boolean;
  columns?: 3 | 4 | 5 | 6;
  className?: string;
}

export function LogoCloud({
  logos,
  title,
  variant = "default",
  grayscale = true,
  columns = 5,
  className,
}: LogoCloudProps) {
  const colStyles = {
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  const renderLogo = (logo: Logo, index: number) => {
    const imgElement = (
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width || 160}
        height={logo.height || 48}
        className={cn(
          "max-h-12 w-auto object-contain transition-all",
          grayscale && "grayscale hover:grayscale-0 opacity-60 hover:opacity-100"
        )}
      />
    );

    const wrapper = (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.05 }}
        className="flex items-center justify-center p-4"
      >
        {imgElement}
      </motion.div>
    );

    if (logo.href) {
      return (
        <a
          key={index}
          href={logo.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {wrapper}
        </a>
      );
    }

    return <div key={index}>{wrapper}</div>;
  };

  if (variant === "scroll") {
    return (
      <div className={cn("overflow-hidden py-8", className)}>
        {title && (
          <p className="text-center text-sm text-muted-foreground mb-8">
            {title}
          </p>
        )}
        <div className="relative">
          <div className="flex animate-scroll">
            {[...logos, ...logos].map((logo, index) => (
              <div
                key={index}
                className="flex-shrink-0 mx-8"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width || 160}
                  height={logo.height || 48}
                  className={cn(
                    "max-h-10 w-auto object-contain",
                    grayscale && "grayscale opacity-60"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .animate-scroll {
            animation: scroll 30s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={className}>
      {title && (
        <p className="text-center text-sm text-muted-foreground mb-8">
          {title}
        </p>
      )}
      <div className={cn("grid gap-8 items-center", colStyles[columns])}>
        {logos.map((logo, index) => renderLogo(logo, index))}
      </div>
    </div>
  );
}

// =============================================================================
// LOGO SECTION
// Full section with logos
// =============================================================================

interface LogoSectionProps {
  title?: string;
  subtitle?: string;
  logos: Logo[];
  variant?: "default" | "grid" | "scroll";
  grayscale?: boolean;
  background?: "default" | "muted" | "primary";
  className?: string;
}

export function LogoSection({
  title = "Ils nous font confiance",
  subtitle,
  logos,
  variant = "default",
  grayscale = true,
  background = "default",
  className,
}: LogoSectionProps) {
  const bgStyles = {
    default: "",
    muted: "bg-muted",
    primary: "bg-primary text-primary-foreground",
  };

  return (
    <section className={cn("py-12 md:py-16", bgStyles[background], className)}>
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            {subtitle && (
              <p
                className={cn(
                  "mt-2",
                  background === "primary"
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        <LogoCloud logos={logos} variant={variant} grayscale={grayscale} />
      </div>
    </section>
  );
}

// =============================================================================
// PARTNERS GRID
// Detailed partner cards
// =============================================================================

interface Partner {
  logo: string;
  name: string;
  description?: string;
  href?: string;
}

interface PartnersGridProps {
  title?: string;
  partners: Partner[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function PartnersGrid({
  title = "Nos partenaires",
  partners,
  columns = 3,
  className,
}: PartnersGridProps) {
  const colStyles = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {title}
          </h2>
        )}
        <div className={cn("grid gap-6", colStyles[columns])}>
          {partners.map((partner, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              {partner.href ? (
                <a
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="h-16 flex items-center justify-center mb-4">
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={160}
                      height={48}
                      className="max-h-12 w-auto object-contain"
                    />
                  </div>
                  <h3 className="font-semibold text-center">{partner.name}</h3>
                  {partner.description && (
                    <p className="mt-2 text-sm text-muted-foreground text-center">
                      {partner.description}
                    </p>
                  )}
                </a>
              ) : (
                <div className="bg-card border rounded-xl p-6">
                  <div className="h-16 flex items-center justify-center mb-4">
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={160}
                      height={48}
                      className="max-h-12 w-auto object-contain"
                    />
                  </div>
                  <h3 className="font-semibold text-center">{partner.name}</h3>
                  {partner.description && (
                    <p className="mt-2 text-sm text-muted-foreground text-center">
                      {partner.description}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
