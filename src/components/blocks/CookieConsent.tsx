"use client";

import { useState, useEffect } from "react";
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
  const [locale, setLocale] = useState("fr");

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
    const pathLocale = window.location.pathname.split("/")[1];
    if (pathLocale && translations[pathLocale]) {
      setLocale(pathLocale);
    }
  }, []);

  function handleConsent(accepted: boolean) {
    localStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "refused");
    setVisible(false);
  }

  if (!visible) return null;

  const t = translations[locale] || translations.fr;

  return (
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
  );
}
