"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { Toaster } from "@/components/ui/Toast";

// =============================================================================
// PROVIDERS
// Wrap all providers here to keep layout.tsx clean
// =============================================================================

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      {/* Add other providers here */}
      {/* <QueryClientProvider client={queryClient}> */}
      {/* <SessionProvider> */}
      {children}
      <Toaster />
      {/* </SessionProvider> */}
      {/* </QueryClientProvider> */}
    </ThemeProvider>
  );
}
