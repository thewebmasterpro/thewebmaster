"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-muted-foreground/20">500</h1>
        <h2 className="text-2xl font-semibold mt-4">Une erreur est survenue</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Nous sommes désolés, quelque chose s&apos;est mal passé. Veuillez réessayer.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="px-6 py-3 border rounded-lg hover:bg-muted transition-colors"
          >
            Accueil
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-8">
            Code erreur: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
