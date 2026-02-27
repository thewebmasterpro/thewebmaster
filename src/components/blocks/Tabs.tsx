"use client";

import { useState, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// =============================================================================
// TABS
// Tabbed content navigation
// =============================================================================

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  variant?: "default" | "pills" | "underline" | "bordered";
  fullWidth?: boolean;
  className?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  variant = "default",
  fullWidth = false,
  className,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const containerStyles = {
    default: "border-b border-border",
    pills: "bg-muted p-1 rounded-lg inline-flex",
    underline: "border-b border-border",
    bordered: "border rounded-lg p-1 inline-flex",
  };

  const tabStyles = {
    default:
      "px-4 py-2 -mb-px border-b-2 border-transparent hover:text-primary transition-colors",
    pills: "px-4 py-2 rounded-md transition-colors",
    underline:
      "px-4 py-2 -mb-px border-b-2 border-transparent hover:text-primary transition-colors",
    bordered: "px-4 py-2 rounded-md transition-colors",
  };

  const activeStyles = {
    default: "border-primary text-primary",
    pills: "bg-background shadow-sm text-foreground",
    underline: "border-primary text-primary",
    bordered: "bg-primary text-primary-foreground",
  };

  const inactiveStyles = {
    default: "text-muted-foreground",
    pills: "text-muted-foreground hover:text-foreground",
    underline: "text-muted-foreground",
    bordered: "text-muted-foreground hover:text-foreground",
  };

  return (
    <div className={className}>
      <div
        className={cn(
          containerStyles[variant],
          fullWidth && "flex w-full"
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              tabStyles[variant],
              fullWidth && "flex-1",
              activeTab === tab.id
                ? activeStyles[variant]
                : inactiveStyles[variant],
              "flex items-center justify-center gap-2 font-medium"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={activeTab === tab.id ? "block" : "hidden"}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tab.content}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// VERTICAL TABS
// Tabs on the side
// =============================================================================

interface VerticalTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function VerticalTabs({
  tabs,
  defaultTab,
  className,
}: VerticalTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={cn("flex gap-8", className)}>
      <div className="flex flex-col w-48 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-3 text-left rounded-lg transition-colors flex items-center gap-2",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={activeTab === tab.id ? "block" : "hidden"}
          >
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tab.content}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TAB SECTION
// Full section with tabs
// =============================================================================

interface TabSectionProps {
  title?: string;
  description?: string;
  tabs: Tab[];
  variant?: "default" | "pills" | "underline";
  centered?: boolean;
  className?: string;
}

export function TabSection({
  title,
  description,
  tabs,
  variant = "pills",
  centered = true,
  className,
}: TabSectionProps) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className={cn("mb-12", centered && "text-center")}>
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}

        <div className={centered ? "flex flex-col items-center" : ""}>
          <Tabs tabs={tabs} variant={variant} />
        </div>
      </div>
    </section>
  );
}
