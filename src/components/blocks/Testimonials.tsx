"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, StaggerChildren } from "@/components/animations";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  avatar?: { src: string; alt: string };
  rating?: number;
}

interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  testimonials: Testimonial[];
  columns?: 1 | 2 | 3;
  className?: string;
}

export function Testimonials({
  title,
  subtitle,
  testimonials,
  columns = 3,
  className,
}: TestimonialsProps) {
  const gridCols = {
    1: "max-w-2xl mx-auto",
    2: "md:grid-cols-2 max-w-4xl mx-auto",
    3: "md:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <section className={cn("py-20 px-4 bg-muted/30", className)}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle) && (
          <FadeIn className="text-center mb-12">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
            )}
            {subtitle && (
              <p className="text-lg text-muted-foreground">{subtitle}</p>
            )}
          </FadeIn>
        )}

        <StaggerChildren
          className={cn("grid gap-6", gridCols[columns])}
          staggerDelay={0.1}
        >
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-background">
              <CardContent className="pt-6">
                {testimonial.rating && (
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                )}
                <blockquote className="text-lg mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-4">
                  {testimonial.avatar && (
                    <Image
                      src={testimonial.avatar.src}
                      alt={testimonial.avatar.alt}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    {testimonial.role && (
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
