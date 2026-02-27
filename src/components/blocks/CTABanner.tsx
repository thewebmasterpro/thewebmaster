"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations";
import { cn } from "@/lib/utils";

interface CTABannerProps {
  title: string;
  subtitle?: string;
  cta: { label: string; url: string };
  ctaSecondary?: { label: string; url: string };
  variant?: "primary" | "dark" | "gradient";
  alignment?: "left" | "center";
  className?: string;
}

export function CTABanner({
  title,
  subtitle,
  cta,
  ctaSecondary,
  variant = "primary",
  alignment = "center",
  className,
}: CTABannerProps) {
  const variants = {
    primary: "bg-primary text-primary-foreground",
    dark: "bg-zinc-900 text-white",
    gradient: "bg-gradient-to-r from-primary to-purple-600 text-white",
  };

  const alignmentClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
  };

  return (
    <section className={cn("py-20 px-4", variants[variant], className)}>
      <div className="max-w-4xl mx-auto">
        <FadeIn
          className={cn(
            "flex flex-col gap-6",
            alignmentClasses[alignment]
          )}
        >
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          {subtitle && (
            <p className="text-lg opacity-90 max-w-2xl">{subtitle}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2">
            <Button
              asChild
              size="lg"
              variant={variant === "primary" ? "secondary" : "default"}
            >
              <Link href={cta.url}>{cta.label}</Link>
            </Button>
            {ctaSecondary && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-current"
              >
                <Link href={ctaSecondary.url}>{ctaSecondary.label}</Link>
              </Button>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
