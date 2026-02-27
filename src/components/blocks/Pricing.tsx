"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// PRICING CARD
// Individual pricing plan
// =============================================================================

interface PricingFeature {
  text: string;
  included: boolean;
  tooltip?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  priceYearly?: number | string;
  currency?: string;
  period?: string;
  features: PricingFeature[] | string[];
  cta: { text: string; href: string };
  popular?: boolean;
  badge?: string;
}

interface PricingCardProps {
  plan: PricingPlan;
  yearly?: boolean;
  variant?: "default" | "bordered" | "elevated";
  className?: string;
}

export function PricingCard({
  plan,
  yearly = false,
  variant = "default",
  className,
}: PricingCardProps) {
  const price = yearly && plan.priceYearly ? plan.priceYearly : plan.price;
  const displayPrice = typeof price === "number" ? price : price;

  const variantStyles = {
    default: plan.popular
      ? "bg-primary text-primary-foreground"
      : "bg-card border",
    bordered: plan.popular
      ? "border-2 border-primary bg-card"
      : "border-2 bg-card",
    elevated: plan.popular
      ? "bg-primary text-primary-foreground shadow-xl scale-105"
      : "bg-card shadow-lg",
  };

  const buttonStyles = plan.popular
    ? variant === "default"
      ? "bg-background text-foreground hover:bg-background/90"
      : "bg-primary text-primary-foreground hover:bg-primary/90"
    : "bg-primary text-primary-foreground hover:bg-primary/90";

  const featureIconColor = plan.popular && variant === "default"
    ? "text-primary-foreground"
    : "text-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "rounded-2xl p-8 relative",
        variantStyles[variant],
        className
      )}
    >
      {/* Badge */}
      {(plan.popular || plan.badge) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className={cn(
              "px-4 py-1 rounded-full text-sm font-medium",
              plan.popular && variant === "default"
                ? "bg-background text-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {plan.badge || "Populaire"}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold">{plan.name}</h3>
        {plan.description && (
          <p
            className={cn(
              "mt-2 text-sm",
              plan.popular && variant === "default"
                ? "text-primary-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {plan.description}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="mt-6 text-center">
        <div className="flex items-baseline justify-center gap-1">
          {plan.currency && (
            <span className="text-2xl font-semibold">{plan.currency}</span>
          )}
          <span className="text-5xl font-bold">{displayPrice}</span>
          {plan.period && (
            <span
              className={cn(
                "text-sm",
                plan.popular && variant === "default"
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              )}
            >
              /{plan.period}
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="mt-8 space-y-3">
        {plan.features.map((feature, index) => {
          const isObject = typeof feature === "object";
          const text = isObject ? feature.text : feature;
          const included = isObject ? feature.included : true;

          return (
            <li key={index} className="flex items-start gap-3">
              {included ? (
                <Check className={cn("w-5 h-5 shrink-0", featureIconColor)} />
              ) : (
                <X
                  className={cn(
                    "w-5 h-5 shrink-0",
                    plan.popular && variant === "default"
                      ? "text-primary-foreground/40"
                      : "text-muted-foreground/40"
                  )}
                />
              )}
              <span
                className={cn(
                  !included &&
                    (plan.popular && variant === "default"
                      ? "text-primary-foreground/60 line-through"
                      : "text-muted-foreground line-through")
                )}
              >
                {text}
              </span>
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      <a
        href={plan.cta.href}
        className={cn(
          "mt-8 block w-full py-3 px-6 rounded-lg text-center font-medium transition-colors",
          buttonStyles
        )}
      >
        {plan.cta.text}
      </a>
    </motion.div>
  );
}

// =============================================================================
// PRICING SECTION
// Full pricing section with toggle
// =============================================================================

interface PricingSectionProps {
  title?: string;
  description?: string;
  plans: PricingPlan[];
  showToggle?: boolean;
  toggleLabels?: { monthly: string; yearly: string };
  yearlySavings?: string;
  variant?: "default" | "bordered" | "elevated";
  className?: string;
}

export function PricingSection({
  title = "Tarifs",
  description,
  plans,
  showToggle = true,
  toggleLabels = { monthly: "Mensuel", yearly: "Annuel" },
  yearlySavings = "2 mois offerts",
  variant = "default",
  className,
}: PricingSectionProps) {
  const [yearly, setYearly] = useState(false);

  const hasYearlyPrices = plans.some((plan) => plan.priceYearly !== undefined);

  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          )}
          {description && (
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          )}

          {/* Toggle */}
          {showToggle && hasYearlyPrices && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <span
                className={cn(
                  "text-sm font-medium",
                  !yearly ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {toggleLabels.monthly}
              </span>
              <button
                onClick={() => setYearly(!yearly)}
                className={cn(
                  "relative w-14 h-7 rounded-full transition-colors",
                  yearly ? "bg-primary" : "bg-muted"
                )}
              >
                <motion.div
                  animate={{ x: yearly ? 28 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow"
                />
              </button>
              <span
                className={cn(
                  "text-sm font-medium flex items-center gap-2",
                  yearly ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {toggleLabels.yearly}
                {yearlySavings && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    {yearlySavings}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Plans */}
        <div
          className={cn(
            "grid gap-8 items-start",
            plans.length === 2 && "md:grid-cols-2 max-w-4xl mx-auto",
            plans.length === 3 && "md:grid-cols-3 max-w-6xl mx-auto",
            plans.length >= 4 && "md:grid-cols-2 lg:grid-cols-4"
          )}
        >
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              yearly={yearly}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// COMPARISON TABLE
// Feature comparison across plans
// =============================================================================

interface ComparisonFeature {
  name: string;
  tooltip?: string;
  values: (boolean | string)[];
}

interface ComparisonTableProps {
  plans: { name: string; price: string }[];
  features: ComparisonFeature[];
  className?: string;
}

export function ComparisonTable({
  plans,
  features,
  className,
}: ComparisonTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="py-4 px-4 text-left font-semibold">
              Fonctionnalités
            </th>
            {plans.map((plan, i) => (
              <th key={i} className="py-4 px-4 text-center">
                <div className="font-semibold">{plan.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {plan.price}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-4 px-4 text-sm">{feature.name}</td>
              {feature.values.map((value, j) => (
                <td key={j} className="py-4 px-4 text-center">
                  {typeof value === "boolean" ? (
                    value ? (
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm">{value}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
