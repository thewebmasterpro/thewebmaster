"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// PAGINATION
// Page navigation component
// =============================================================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  siblingCount?: number;
  showFirstLast?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  siblingCount = 1,
  showFirstLast = true,
  className,
}: PaginationProps) {
  const getPageUrl = (page: number) => {
    if (page === 1) return baseUrl;
    return `${baseUrl}?page=${page}`;
  };

  // Generate page numbers to show
  const generatePages = () => {
    const pages: (number | "ellipsis")[] = [];

    // Always show first page
    if (showFirstLast) pages.push(1);

    // Calculate range around current page
    const start = Math.max(2, currentPage - siblingCount);
    const end = Math.min(totalPages - 1, currentPage + siblingCount);

    // Add ellipsis if needed before range
    if (start > 2) {
      pages.push("ellipsis");
    } else if (start === 2 && showFirstLast) {
      // No ellipsis needed
    }

    // Add pages in range
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    // Add ellipsis if needed after range
    if (end < totalPages - 1) {
      pages.push("ellipsis");
    }

    // Always show last page
    if (showFirstLast && totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pages = generatePages();

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      ) : (
        <span className="w-10 h-10 flex items-center justify-center text-muted-foreground/50">
          <ChevronLeft className="w-5 h-5" />
        </span>
      )}

      {/* Page numbers */}
      {pages.map((page, index) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground"
          >
            <MoreHorizontal className="w-5 h-5" />
          </span>
        ) : (
          <Link
            key={page}
            href={getPageUrl(page)}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-colors",
              currentPage === page
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label="Page suivante"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      ) : (
        <span className="w-10 h-10 flex items-center justify-center text-muted-foreground/50">
          <ChevronRight className="w-5 h-5" />
        </span>
      )}
    </nav>
  );
}

// =============================================================================
// SIMPLE PAGINATION
// Previous/Next only
// =============================================================================

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  showPageInfo?: boolean;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  baseUrl,
  showPageInfo = true,
  className,
}: SimplePaginationProps) {
  const getPageUrl = (page: number) => {
    if (page === 1) return baseUrl;
    return `${baseUrl}?page=${page}`;
  };

  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        className
      )}
    >
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </Link>
      ) : (
        <div />
      )}

      {showPageInfo && (
        <span className="text-sm text-muted-foreground">
          Page {currentPage} sur {totalPages}
        </span>
      )}

      {currentPage < totalPages ? (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}

// =============================================================================
// LOAD MORE
// Load more button for infinite scroll
// =============================================================================

interface LoadMoreProps {
  onLoadMore: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  loadingText?: string;
  buttonText?: string;
  className?: string;
}

export function LoadMore({
  onLoadMore,
  isLoading = false,
  hasMore = true,
  loadingText = "Chargement...",
  buttonText = "Charger plus",
  className,
}: LoadMoreProps) {
  if (!hasMore) return null;

  return (
    <div className={cn("flex justify-center", className)}>
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="px-6 py-3 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
      >
        {isLoading ? loadingText : buttonText}
      </button>
    </div>
  );
}

// =============================================================================
// PAGINATION INFO
// Showing X-Y of Z items
// =============================================================================

interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className,
}: PaginationInfoProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Affichage de <span className="font-medium">{start}</span> à{" "}
      <span className="font-medium">{end}</span> sur{" "}
      <span className="font-medium">{totalItems}</span> résultats
    </p>
  );
}
