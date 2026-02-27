"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// BREADCRUMBS
// Navigation breadcrumb trail
// =============================================================================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeLabel?: string;
  separator?: "chevron" | "slash" | "arrow";
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  homeLabel = "Accueil",
  separator = "chevron",
  className,
}: BreadcrumbsProps) {
  const separators = {
    chevron: <ChevronRight className="w-4 h-4 text-muted-foreground" />,
    slash: <span className="text-muted-foreground">/</span>,
    arrow: <span className="text-muted-foreground">→</span>,
  };

  const allItems = showHome
    ? [{ label: homeLabel, href: "/" }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-2 text-sm">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isHome = index === 0 && showHome;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && separators[separator]}

              {isLast ? (
                <span className="text-foreground font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {isHome && <Home className="w-4 h-4" />}
                  {!isHome && item.label}
                </Link>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  {isHome && <Home className="w-4 h-4" />}
                  {!isHome && item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// =============================================================================
// BREADCRUMBS WITH DROPDOWN
// Collapsible breadcrumbs for long paths
// =============================================================================

interface CollapsibleBreadcrumbsProps {
  items: BreadcrumbItem[];
  maxVisible?: number;
  className?: string;
}

export function CollapsibleBreadcrumbs({
  items,
  maxVisible = 3,
  className,
}: CollapsibleBreadcrumbsProps) {
  if (items.length <= maxVisible) {
    return <Breadcrumbs items={items} className={className} />;
  }

  const firstItem = items[0];
  const lastItems = items.slice(-maxVisible + 1);
  const hiddenItems = items.slice(1, -maxVisible + 1);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-2 text-sm">
        {/* Home */}
        <li className="flex items-center gap-2">
          <Link
            href={firstItem.href || "/"}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {/* Collapsed items */}
        <li className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className="relative group">
            <button className="text-muted-foreground hover:text-foreground">
              •••
            </button>
            <div className="absolute left-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-2 hidden group-hover:block z-10 min-w-[150px]">
              {hiddenItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href || "#"}
                  className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </li>

        {/* Visible items */}
        {lastItems.map((item, index) => {
          const isLast = index === lastItems.length - 1;
          return (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              {isLast ? (
                <span className="text-foreground font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href || "#"}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// =============================================================================
// PAGE HEADER WITH BREADCRUMBS
// Common pattern: breadcrumbs + title
// =============================================================================

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("py-8", className)}>
      <div className="container mx-auto px-4">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} className="mb-4" />
        )}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
            {description && (
              <p className="mt-2 text-lg text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
