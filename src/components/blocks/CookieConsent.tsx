"use client";

import { useState, useEffect, useCallback } from "react";
import Script from "next/script";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "cookie-consent";

const translations: Record<string, { message: string; accept: string; refuse: string; privacy: string }> = {
  fr: {
    message: "Ce site utilise des cookies analytiques pour améliorer votre expérience. En continuant, vous acceptez notre",
    accept: "Accepter",
    refuse: "Refuser",
    privacy: "politique de confidentialité",
  },
  nl: {
    message: "Deze site gebruikt analytische cookies om uw ervaring te verbeteren. Door verder te gaan, accepteert u ons",
    accept: "Accepteren",
    refuse: "Weigeren",
    privacy: "privacybeleid",
  },
  en: {
    message: "This site uses analytical cookies to improve your experience. By continuing, you accept our",
    accept: "Accept",
    refuse: "Refuse",
    privacy: "privacy policy",
  },
};

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<"accepted" | "refused" | null>(null);
  const [locale, setLocale] = useState("fr");

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "refused") {
      setConsent(stored);
    } else {
      setVisible(true);
    }
    const pathLocale = window.location.pathname.split("/")[1];
    if (pathLocale && translations[pathLocale]) {
      setLocale(pathLocale);
    }
  }, []);

  const handleConsent = useCallback((accepted: boolean) => {
    const value = accepted ? "accepted" : "refused";
    localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setVisible(false);
  }, []);

  const t = translations[locale] || translations.fr;

  return (
    <>
      {/* Only load analytics after user accepts cookies */}
      {consent === "accepted" && (
        <Script
          defer
          src="https://analytics.hagendigital.com/script.js"
          data-website-id="f8bfa504-b4d8-4b3a-b40f-45fe1aa76f81"
          strategy="afterInteractive"
        />
      )}

      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-4">
            <p className="text-sm text-muted-foreground flex-1">
              {t.message}{" "}
              <Link
                href={`/${locale}/politique-de-confidentialite`}
                className="underline hover:text-foreground"
              >
                {t.privacy}
              </Link>
              .
            </p>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => handleConsent(false)}>
                {t.refuse}
              </Button>
              <Button size="sm" onClick={() => handleConsent(true)}>
                {t.accept}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
