"use client";

import { useState } from "react";
import { Lock, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnlockTranslations {
  unlockTitle: string;
  unlockDesc: string;
  unlockEmail: string;
  unlockButton: string;
  unlockSending: string;
  unlockSuccess: string;
  unlockError: string;
}

interface UnlockGateProps {
  t: UnlockTranslations;
  siteUrl: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  locale: string;
  reportText: string;
  onUnlocked: () => void;
}

export default function UnlockGate({
  t,
  siteUrl,
  auditType,
  score,
  grade,
  locale,
  reportText,
  onUnlocked,
}: UnlockGateProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/audit-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          siteUrl,
          auditType,
          score,
          grade,
          locale,
          reportText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.unlockError);
      }

      setSuccess(true);
      // Store unlock state in sessionStorage
      sessionStorage.setItem(`audit-unlocked-${auditType}`, "true");
      // Brief delay to show success message before revealing results
      setTimeout(() => {
        onUnlocked();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unlockError);
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 rounded-2xl border border-green-500/30 bg-green-500/5 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <p className="text-green-600 font-medium">{t.unlockSuccess}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Blurred overlay hint */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background z-10 pointer-events-none rounded-2xl" />

      {/* Placeholder blurred content */}
      <div className="h-40 rounded-2xl bg-muted/30 blur-sm mb-6" />
      <div className="h-24 rounded-2xl bg-muted/20 blur-sm mb-6" />
      <div className="h-32 rounded-2xl bg-muted/10 blur-sm" />

      {/* Unlock form overlay */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto p-8 rounded-2xl border border-border/50 bg-card shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t.unlockTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.unlockDesc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.unlockEmail}
                required
                className="w-full h-11 pl-10 pr-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                disabled={sending}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={sending || !email.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.unlockSending}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  {t.unlockButton}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
