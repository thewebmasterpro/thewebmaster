interface AuditEmailParams {
  hostname: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  locale: string;
}

const labels = {
  fr: {
    subject: (type: string, host: string) => `Votre rapport d'audit ${type} — ${host}`,
    greeting: "Bonjour,",
    intro: "Voici votre rapport d'audit complet en pièce jointe.",
    scoreLabel: "Score global",
    siteLabel: "Site analysé",
    cta: "Voir les résultats en ligne",
    footer: "Cet email a été envoyé par The Webmaster. Si vous n'avez pas demandé ce rapport, ignorez ce message.",
    seo: "SEO",
    performance: "Performance",
    security: "Sécurité",
  },
  en: {
    subject: (type: string, host: string) => `Your ${type} audit report — ${host}`,
    greeting: "Hello,",
    intro: "Please find your full audit report attached.",
    scoreLabel: "Overall score",
    siteLabel: "Analyzed site",
    cta: "View results online",
    footer: "This email was sent by The Webmaster. If you did not request this report, please ignore this message.",
    seo: "SEO",
    performance: "Performance",
    security: "Security",
  },
  nl: {
    subject: (type: string, host: string) => `Uw ${type} auditrapport — ${host}`,
    greeting: "Hallo,",
    intro: "Uw volledige auditrapport vindt u in de bijlage.",
    scoreLabel: "Totaalscore",
    siteLabel: "Geanalyseerde site",
    cta: "Bekijk resultaten online",
    footer: "Deze e-mail is verzonden door The Webmaster. Als u dit rapport niet heeft aangevraagd, negeer dan dit bericht.",
    seo: "SEO",
    performance: "Prestatie",
    security: "Beveiliging",
  },
};

export function getAuditEmailSubject({ hostname, auditType, locale }: AuditEmailParams): string {
  const t = labels[locale as keyof typeof labels] || labels.fr;
  const typeName = t[auditType];
  return t.subject(typeName, hostname);
}

export function getAuditEmailHtml({ hostname, auditType, score, grade, locale }: AuditEmailParams): string {
  const t = labels[locale as keyof typeof labels] || labels.fr;
  const typeName = t[auditType];

  const scoreColor = score >= 85 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  const auditPath = auditType === "seo" ? "seo-audit" : auditType === "performance" ? "performance-audit" : "security-audit";
  const baseUrl = `https://thewebmaster.pro/${locale}/${auditPath}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">
        The<span style="color:#b8860b;">Webmaster</span>
      </h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">
        ${typeName} Audit Report
      </p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
      <p style="margin:0 0 16px;color:#334155;font-size:15px;">${t.greeting}</p>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;">${t.intro}</p>

      <!-- Score card -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;font-weight:800;color:${scoreColor};line-height:1;">${grade}</div>
        <div style="font-size:14px;color:#64748b;margin-top:4px;">${score}/100</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:8px;">${t.scoreLabel}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;">${t.siteLabel}</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${hostname}</td>
        </tr>
      </table>

      <div style="text-align:center;">
        <a href="${baseUrl}" style="display:inline-block;background:#b8860b;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
          ${t.cta}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-radius:0 0 12px 12px;padding:16px 32px;border:1px solid #e4e4e7;border-top:none;">
      <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
        ${t.footer}
      </p>
    </div>
  </div>
</body>
</html>`;
}
