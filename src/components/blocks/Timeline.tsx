"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// =============================================================================
// TIMELINE
// Chronological content display
// =============================================================================

interface TimelineItem {
  id: string;
  date?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  content?: ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  variant?: "default" | "alternating" | "compact";
  lineColor?: string;
  className?: string;
}

export function Timeline({
  items,
  variant = "default",
  lineColor = "bg-border",
  className,
}: TimelineProps) {
  if (variant === "alternating") {
    return (
      <div className={cn("relative", className)}>
        {/* Center line */}
        <div
          className={cn(
            "absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full",
            lineColor
          )}
        />

        <div className="space-y-12">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex items-center",
                index % 2 === 0 ? "justify-start" : "justify-end"
              )}
            >
              {/* Content */}
              <div
                className={cn(
                  "w-5/12",
                  index % 2 === 0 ? "pr-8 text-right" : "pl-8 text-left"
                )}
              >
                {item.date && (
                  <span className="text-sm text-muted-foreground">
                    {item.date}
                  </span>
                )}
                <h3 className="text-xl font-semibold mt-1">{item.title}</h3>
                {item.description && (
                  <p className="mt-2 text-muted-foreground">
                    {item.description}
                  </p>
                )}
                {item.content}
              </div>

              {/* Center dot */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("relative pl-6", className)}>
        {/* Line */}
        <div
          className={cn("absolute left-0 top-2 bottom-2 w-0.5", lineColor)}
        />

        <div className="space-y-6">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Dot */}
              <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

              <div className="flex items-baseline gap-4">
                {item.date && (
                  <span className="text-sm text-muted-foreground shrink-0">
                    {item.date}
                  </span>
                )}
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("relative pl-8", className)}>
      {/* Line */}
      <div className={cn("absolute left-3 top-0 bottom-0 w-0.5", lineColor)} />

      <div className="space-y-10">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Dot/Icon */}
            <div
              className={cn(
                "absolute -left-8 flex items-center justify-center",
                item.icon
                  ? "w-10 h-10 -ml-2 rounded-full bg-primary text-primary-foreground"
                  : "w-6 h-6 rounded-full bg-primary border-4 border-background"
              )}
            >
              {item.icon}
            </div>

            {/* Content */}
            <div className="bg-card border rounded-lg p-6">
              {item.date && (
                <span className="text-sm text-muted-foreground">
                  {item.date}
                </span>
              )}
              <h3 className="text-xl font-semibold mt-1">{item.title}</h3>
              {item.description && (
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              )}
              {item.content}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TIMELINE SECTION
// Full section with timeline
// =============================================================================

interface TimelineSectionProps {
  title?: string;
  description?: string;
  items: TimelineItem[];
  variant?: "default" | "alternating" | "compact";
  className?: string;
}

export function TimelineSection({
  title = "Notre Histoire",
  description,
  items,
  variant = "default",
  className,
}: TimelineSectionProps) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          {description && (
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <Timeline items={items} variant={variant} />
        </div>
      </div>
    </section>
  );
}
