"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// NEWSLETTER FORM
// Email subscription form
// =============================================================================

interface NewsletterFormProps {
  onSubmit?: (email: string) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  successMessage?: string;
  variant?: "default" | "inline" | "stacked";
  className?: string;
}

export function NewsletterForm({
  onSubmit,
  placeholder = "Votre email",
  buttonText = "S'inscrire",
  successMessage = "Merci ! Vous êtes inscrit.",
  variant = "default",
  className,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Veuillez entrer un email valide");
      return;
    }

    setStatus("loading");
    try {
      if (onSubmit) {
        await onSubmit(email);
      } else {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMessage("Une erreur est survenue. Réessayez.");
    }
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-2 text-green-600",
          className
        )}
      >
        <Check className="w-5 h-5" />
        <span>{successMessage}</span>
      </motion.div>
    );
  }

  if (variant === "stacked") {
    return (
      <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {status === "loading" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {buttonText}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
      </form>
    );
  }

  // Default and inline variants
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex gap-2",
        variant === "inline" ? "flex-row" : "flex-col sm:flex-row",
        className
      )}
    >
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
      >
        {status === "loading" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {buttonText}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600 sm:hidden">{errorMessage}</p>
      )}
    </form>
  );
}

// =============================================================================
// NEWSLETTER SECTION
// Full section with newsletter form
// =============================================================================

interface NewsletterSectionProps {
  title?: string;
  description?: string;
  onSubmit?: (email: string) => Promise<void>;
  variant?: "default" | "centered" | "split" | "card";
  background?: "default" | "muted" | "primary" | "gradient";
  className?: string;
}

export function NewsletterSection({
  title = "Restez informé",
  description = "Inscrivez-vous à notre newsletter pour recevoir nos dernières actualités.",
  onSubmit,
  variant = "centered",
  background = "muted",
  className,
}: NewsletterSectionProps) {
  const bgStyles = {
    default: "",
    muted: "bg-muted",
    primary: "bg-primary text-primary-foreground",
    gradient: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
  };

  if (variant === "card") {
    return (
      <section className={cn("py-16 md:py-24", className)}>
        <div className="container mx-auto px-4">
          <div
            className={cn(
              "rounded-2xl p-8 md:p-12",
              bgStyles[background] || bgStyles.muted
            )}
          >
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
              {description && (
                <p
                  className={cn(
                    "mt-4",
                    background === "primary" || background === "gradient"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {description}
                </p>
              )}
              <div className="mt-8 max-w-md mx-auto">
                <NewsletterForm onSubmit={onSubmit} />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "split") {
    return (
      <section
        className={cn("py-16 md:py-24", bgStyles[background], className)}
      >
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
              {description && (
                <p
                  className={cn(
                    "mt-4",
                    background === "primary" || background === "gradient"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {description}
                </p>
              )}
            </div>
            <div>
              <NewsletterForm onSubmit={onSubmit} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Centered variant (default)
  return (
    <section className={cn("py-16 md:py-24", bgStyles[background], className)}>
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
          {description && (
            <p
              className={cn(
                "mt-4",
                background === "primary" || background === "gradient"
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              )}
            >
              {description}
            </p>
          )}
          <div className="mt-8 max-w-md mx-auto">
            <NewsletterForm onSubmit={onSubmit} />
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// NEWSLETTER POPUP
// Modal/popup newsletter form
// =============================================================================

interface NewsletterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  onSubmit?: (email: string) => Promise<void>;
}

export function NewsletterPopup({
  isOpen,
  onClose,
  title = "Ne manquez rien !",
  description = "Inscrivez-vous pour recevoir nos meilleures offres et actualités.",
  onSubmit,
}: NewsletterPopupProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-background rounded-2xl p-8 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          ×
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
        </div>

        <NewsletterForm onSubmit={onSubmit} variant="stacked" />

        <p className="mt-4 text-xs text-center text-muted-foreground">
          En vous inscrivant, vous acceptez notre politique de confidentialité.
        </p>
      </motion.div>
    </motion.div>
  );
}
