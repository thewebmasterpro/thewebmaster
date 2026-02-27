"use client";

import { useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// PROGRESS BAR
// Animated progress bar
// =============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  valueFormat?: "percent" | "fraction" | "custom";
  customFormat?: (value: number, max: number) => string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient" | "striped";
  color?: string;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  valueFormat = "percent",
  customFormat,
  size = "md",
  variant = "default",
  color,
  animated = true,
  className,
}: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const percentage = Math.min((value / max) * 100, 100);
  const displayValue = !animated ? percentage : (isInView ? percentage : 0);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isInView && animated) {
      const timer = setTimeout(() => setShouldAnimate(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isInView, animated]);

  const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const formatValue = () => {
    if (customFormat) return customFormat(value, max);
    switch (valueFormat) {
      case "percent":
        return `${Math.round(percentage)}%`;
      case "fraction":
        return `${value}/${max}`;
      default:
        return `${value}`;
    }
  };

  const barStyles = {
    default: color || "bg-primary",
    gradient: "bg-gradient-to-r from-primary to-primary/60",
    striped:
      "bg-primary bg-stripes animate-stripes",
  };

  return (
    <div ref={ref} className={className}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showValue && (
            <span className="text-sm text-muted-foreground">{formatValue()}</span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-muted overflow-hidden",
          sizeStyles[size]
        )}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${shouldAnimate || !animated ? displayValue : 0}%` }}
          transition={{ duration: animated ? 1 : 0, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full transition-all",
            barStyles[variant],
            color
          )}
        />
      </div>
      <style jsx>{`
        .bg-stripes {
          background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
          );
          background-size: 1rem 1rem;
        }
        .animate-stripes {
          animation: stripes 1s linear infinite;
        }
        @keyframes stripes {
          0% {
            background-position: 1rem 0;
          }
          100% {
            background-position: 0 0;
          }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// PROGRESS GROUP
// Multiple progress bars
// =============================================================================

interface ProgressItem {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

interface ProgressGroupProps {
  items: ProgressItem[];
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

export function ProgressGroup({
  items,
  size = "md",
  animated = true,
  className,
}: ProgressGroupProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item, index) => (
        <ProgressBar
          key={index}
          value={item.value}
          max={item.max}
          label={item.label}
          color={item.color}
          size={size}
          animated={animated}
        />
      ))}
    </div>
  );
}

// =============================================================================
// CIRCULAR PROGRESS
// Circular/ring progress indicator
// =============================================================================

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
  color?: string;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showValue = true,
  label,
  color = "stroke-primary",
  className,
}: CircularProgressProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });

  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <svg
        ref={ref}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={color}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: isInView ? offset : circumference,
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <span className="text-2xl font-bold">{Math.round(percentage)}%</span>
          )}
          {label && (
            <span className="text-sm text-muted-foreground">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SKILLS SECTION
// Section with skill progress bars
// =============================================================================

interface Skill {
  name: string;
  level: number;
  color?: string;
}

interface SkillsSectionProps {
  title?: string;
  description?: string;
  skills: Skill[];
  columns?: 1 | 2;
  className?: string;
}

export function SkillsSection({
  title = "Compétences",
  description,
  skills,
  columns = 2,
  className,
}: SkillsSectionProps) {
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

        <div
          className={cn(
            "grid gap-6 max-w-4xl mx-auto",
            columns === 2 ? "md:grid-cols-2" : ""
          )}
        >
          {skills.map((skill, index) => (
            <ProgressBar
              key={index}
              value={skill.level}
              label={skill.name}
              color={skill.color}
              size="md"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
