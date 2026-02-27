"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn, StaggerChildren } from "@/components/animations";
import { cn } from "@/lib/utils";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturesGridProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  features: Feature[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function FeaturesGrid({
  eyebrow,
  title,
  subtitle,
  features,
  columns = 3,
  className,
}: FeaturesGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={cn("py-20 px-4", className)} id="features">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-12">
          {eyebrow && (
            <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">
              {eyebrow}
            </p>
          )}
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          {subtitle && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </FadeIn>

        <StaggerChildren
          className={cn("grid gap-6", gridCols[columns])}
          staggerDelay={0.1}
        >
          {features.map((feature, index) => (
            <Card key={index} className="border bg-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
