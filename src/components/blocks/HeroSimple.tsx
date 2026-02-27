"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations";
import { cn } from "@/lib/utils";

interface HeroSimpleProps {
  title: string;
  subtitle?: string;
  cta: { label: string; url: string };
  ctaSecondary?: { label: string; url: string };
  image?: { src: string; alt: string };
  alignment?: "left" | "center" | "right";
  overlay?: boolean;
  className?: string;
}

export function HeroSimple({
  title,
  subtitle,
  cta,
  ctaSecondary,
  image,
  alignment = "center",
  overlay = false,
  className,
}: HeroSimpleProps) {
  const alignmentClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  };

  return (
    <section
      className={cn(
        "relative min-h-[80vh] flex items-center justify-center px-4 py-20",
        className
      )}
    >
      {image && (
        <>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className="object-cover -z-10"
            priority
          />
          {overlay && (
            <div className="absolute inset-0 bg-black/50 -z-10" />
          )}
        </>
      )}

      <div
        className={cn(
          "max-w-4xl mx-auto flex flex-col gap-6",
          alignmentClasses[alignment]
        )}
      >
        <FadeIn>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            {title}
          </h1>
        </FadeIn>

        {subtitle && (
          <FadeIn delay={0.1}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              {subtitle}
            </p>
          </FadeIn>
        )}

        <FadeIn delay={0.2}>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button asChild size="lg">
              <Link href={cta.url}>{cta.label}</Link>
            </Button>
            {ctaSecondary && (
              <Button asChild variant="outline" size="lg">
                <Link href={ctaSecondary.url}>{ctaSecondary.label}</Link>
              </Button>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
