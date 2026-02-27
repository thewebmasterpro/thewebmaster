import type { MDXComponents } from "mdx/types";
import { mdxComponents } from "@/lib/mdx";

// This file is required for @next/mdx to work with App Router
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...mdxComponents,
    ...components,
  };
}
