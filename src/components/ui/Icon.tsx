"use client";

import { LucideIcon, LucideProps } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// ICON COMPONENT
// Wrapper around Lucide icons for consistency and easy customization
// =============================================================================

type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeMap: Record<IconSize, string> = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
  "2xl": "w-10 h-10",
};

interface IconProps extends Omit<LucideProps, "size"> {
  icon: LucideIcon;
  size?: IconSize | number;
  className?: string;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: IconComponent, size = "md", className, ...props }, ref) => {
    const sizeClass = typeof size === "string" ? sizeMap[size] : undefined;
    const sizeStyle = typeof size === "number" ? { width: size, height: size } : undefined;

    return (
      <IconComponent
        ref={ref}
        className={cn(sizeClass, className)}
        style={sizeStyle}
        {...props}
      />
    );
  }
);

Icon.displayName = "Icon";

// =============================================================================
// ICON BUTTON
// Icon wrapped in a clickable button with hover states
// =============================================================================

interface IconButtonProps extends IconProps {
  onClick?: () => void;
  label: string; // Required for accessibility
  variant?: "ghost" | "outline" | "solid";
  disabled?: boolean;
}

const variantStyles = {
  ghost: "hover:bg-muted rounded-md p-1.5 transition-colors",
  outline: "border hover:bg-muted rounded-md p-1.5 transition-colors",
  solid: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md p-1.5 transition-colors",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "md", className, onClick, label, variant = "ghost", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          variantStyles[variant],
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <Icon icon={icon} size={size} {...props} />
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

// =============================================================================
// USAGE EXAMPLES
// =============================================================================
// import { ArrowRight, Check, Menu } from "lucide-react";
// import { Icon, IconButton } from "@/components/ui/Icon";
//
// <Icon icon={ArrowRight} size="md" />
// <Icon icon={Check} size="lg" className="text-green-500" />
// <Icon icon={Menu} size={24} />
//
// <IconButton icon={Menu} label="Open menu" onClick={() => {}} />
// <IconButton icon={Check} label="Confirm" variant="solid" />
