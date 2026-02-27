"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// ACCORDION
// Expandable content sections
// =============================================================================

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  variant?: "default" | "bordered" | "separated" | "minimal";
  iconStyle?: "chevron" | "plus";
  className?: string;
}

export function Accordion({
  items,
  allowMultiple = false,
  variant = "default",
  iconStyle = "chevron",
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenItems((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setOpenItems((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  const isOpen = (id: string) => openItems.includes(id);

  const variantStyles = {
    default: "divide-y divide-border",
    bordered: "border rounded-lg divide-y divide-border",
    separated: "space-y-3",
    minimal: "",
  };

  const itemStyles = {
    default: "",
    bordered: "",
    separated: "border rounded-lg",
    minimal: "border-b border-border last:border-0",
  };

  return (
    <div className={cn(variantStyles[variant], className)}>
      {items.map((item) => (
        <div key={item.id} className={itemStyles[variant]}>
          <button
            onClick={() => toggleItem(item.id)}
            className={cn(
              "flex w-full items-center justify-between py-4 text-left font-medium transition-colors hover:text-primary",
              variant === "bordered" || variant === "separated" ? "px-4" : ""
            )}
            aria-expanded={isOpen(item.id)}
          >
            <span>{item.title}</span>
            <span className="ml-4 shrink-0">
              {iconStyle === "chevron" ? (
                <motion.span
                  animate={{ rotate: isOpen(item.id) ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="block"
                >
                  <ChevronDown className="h-5 w-5" />
                </motion.span>
              ) : isOpen(item.id) ? (
                <Minus className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </span>
          </button>
          <AnimatePresence initial={false}>
            {isOpen(item.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    "pb-4 text-muted-foreground",
                    variant === "bordered" || variant === "separated"
                      ? "px-4"
                      : ""
                  )}
                >
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// FAQ SECTION
// Accordion with section title and description
// =============================================================================

interface FAQSectionProps {
  title?: string;
  description?: string;
  items: AccordionItem[];
  columns?: 1 | 2;
  className?: string;
}

export function FAQSection({
  title = "Questions fréquentes",
  description,
  items,
  columns = 1,
  className,
}: FAQSectionProps) {
  const half = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, half);
  const rightItems = items.slice(half);

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

        {columns === 2 ? (
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Accordion items={leftItems} variant="minimal" />
            <Accordion items={rightItems} variant="minimal" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <Accordion items={items} variant="bordered" />
          </div>
        )}
      </div>
    </section>
  );
}
