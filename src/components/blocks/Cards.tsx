"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// BASE CARD
// Flexible card component
// =============================================================================

interface CardProps {
  children: ReactNode;
  variant?: "default" | "elevated" | "bordered" | "ghost";
  hover?: "none" | "lift" | "scale" | "glow";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

export function Card({
  children,
  variant = "default",
  hover = "none",
  padding = "md",
  className,
}: CardProps) {
  const variantStyles = {
    default: "bg-card border",
    elevated: "bg-card shadow-lg",
    bordered: "bg-transparent border-2",
    ghost: "bg-transparent",
  };

  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const hoverStyles = {
    none: "",
    lift: "transition-transform hover:-translate-y-1 hover:shadow-lg",
    scale: "transition-transform hover:scale-[1.02]",
    glow: "transition-shadow hover:shadow-lg hover:shadow-primary/20",
  };

  return (
    <div
      className={cn(
        "rounded-xl",
        variantStyles[variant],
        paddingStyles[padding],
        hoverStyles[hover],
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// FEATURE CARD
// Icon + title + description
// =============================================================================

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  link?: { href: string; label: string };
  variant?: "default" | "centered" | "horizontal";
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  link,
  variant = "default",
  className,
}: FeatureCardProps) {
  const content = (
    <>
      <div
        className={cn(
          "w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center",
          variant === "centered" && "mx-auto"
        )}
      >
        {icon}
      </div>
      <div className={variant === "horizontal" ? "flex-1" : ""}>
        <h3
          className={cn(
            "text-lg font-semibold mt-4",
            variant === "centered" && "text-center"
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "mt-2 text-muted-foreground",
            variant === "centered" && "text-center"
          )}
        >
          {description}
        </p>
        {link && (
          <Link
            href={link.href}
            className={cn(
              "inline-flex items-center gap-1 mt-4 text-primary hover:underline",
              variant === "centered" && "justify-center w-full"
            )}
          >
            {link.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </>
  );

  return (
    <Card hover="lift" className={className}>
      <div
        className={cn(
          variant === "horizontal" && "flex items-start gap-4"
        )}
      >
        {content}
      </div>
    </Card>
  );
}

// =============================================================================
// IMAGE CARD
// Card with image header
// =============================================================================

interface ImageCardProps {
  image: string;
  alt: string;
  title: string;
  description?: string;
  category?: string;
  date?: string;
  href?: string;
  aspectRatio?: "video" | "square" | "portrait";
  className?: string;
}

export function ImageCard({
  image,
  alt,
  title,
  description,
  category,
  date,
  href,
  aspectRatio = "video",
  className,
}: ImageCardProps) {
  const aspectStyles = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
  };

  const card = (
    <Card hover="lift" padding="none" className={className}>
      <div className={cn("relative overflow-hidden rounded-t-xl", aspectStyles[aspectRatio])}>
        <Image
          src={image}
          alt={alt}
          fill
          className="object-cover transition-transform hover:scale-105"
        />
        {category && (
          <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
            {category}
          </span>
        )}
      </div>
      <div className="p-6">
        {date && (
          <span className="text-sm text-muted-foreground">{date}</span>
        )}
        <h3 className="text-lg font-semibold mt-1">{title}</h3>
        {description && (
          <p className="mt-2 text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
}

// =============================================================================
// PROFILE CARD
// Avatar + name + role
// =============================================================================

interface ProfileCardProps {
  image: string;
  name: string;
  role: string;
  bio?: string;
  social?: { icon: ReactNode; href: string }[];
  variant?: "default" | "horizontal" | "minimal";
  className?: string;
}

export function ProfileCard({
  image,
  name,
  role,
  bio,
  social,
  variant = "default",
  className,
}: ProfileCardProps) {
  if (variant === "horizontal") {
    return (
      <Card hover="lift" className={className}>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden shrink-0">
            <Image src={image} alt={name} fill className="object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{name}</h3>
            <p className="text-primary">{role}</p>
            {bio && (
              <p className="mt-2 text-sm text-muted-foreground">{bio}</p>
            )}
            {social && (
              <div className="flex gap-2 mt-3">
                {social.map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="relative w-12 h-12 rounded-full overflow-hidden">
          <Image src={image} alt={name} fill className="object-cover" />
        </div>
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    );
  }

  // Default: centered card
  return (
    <Card hover="lift" className={cn("text-center", className)}>
      <div className="relative w-24 h-24 rounded-full overflow-hidden mx-auto">
        <Image src={image} alt={name} fill className="object-cover" />
      </div>
      <h3 className="text-lg font-semibold mt-4">{name}</h3>
      <p className="text-primary">{role}</p>
      {bio && (
        <p className="mt-3 text-sm text-muted-foreground">{bio}</p>
      )}
      {social && (
        <div className="flex justify-center gap-2 mt-4">
          {social.map((item, i) => (
            <a
              key={i}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {item.icon}
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// STAT CARD
// Number + label
// =============================================================================

interface StatCardProps {
  value: string;
  label: string;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatCard({
  value,
  label,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-sm mt-2",
                trend.positive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// CARD GRID
// Responsive grid layout
// =============================================================================

interface CardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function CardGrid({
  children,
  columns = 3,
  gap = "md",
  className,
}: CardGridProps) {
  const colStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  const gapStyles = {
    sm: "gap-4",
    md: "gap-6",
    lg: "gap-8",
  };

  return (
    <div className={cn("grid", colStyles[columns], gapStyles[gap], className)}>
      {children}
    </div>
  );
}
