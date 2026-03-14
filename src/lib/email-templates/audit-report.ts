interface AuditEmailParams {
  hostname: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  locale: string;
  reportText?: string;
}

const labels = {
  fr: {
    subject: (type: string, host: string) => `Votre rapport d'audit ${type} — ${host}`,
    greeting: "Bonjour,",
    intro: "Voici votre rapport d'audit complet.",
    scoreLabel: "Score global",
    siteLabel: "Site analysé",
    reportLabel: "Rapport complet",
    cta: "Relancer un audit en ligne",
    footer: "Cet email a été envoyé par The Webmaster. Si vous n'avez pas demandé ce rapport, ignorez ce message.",
    seo: "SEO",
    performance: "Performance",
    security: "Sécurité",
  },
  en: {
    subject: (type: string, host: string) => `Your ${type} audit report — ${host}`,
    greeting: "Hello,",
    intro: "Here is your full audit report.",
    scoreLabel: "Overall score",
    siteLabel: "Analyzed site",
    reportLabel: "Full Report",
    cta: "Run a new audit online",
    footer: "This email was sent by The Webmaster. If you did not request this report, please ignore this message.",
    seo: "SEO",
    performance: "Performance",
    security: "Security",
  },
  nl: {
    subject: (type: string, host: string) => `Uw ${type} auditrapport — ${host}`,
    greeting: "Hallo,",
    intro: "Hier is uw volledige auditrapport.",
    scoreLabel: "Totaalscore",
    siteLabel: "Geanalyseerde site",
    reportLabel: "Volledig rapport",
    cta: "Nieuwe audit uitvoeren",
    footer: "Deze e-mail is verzonden door The Webmaster. Als u dit rapport niet heeft aangevraagd, negeer dan dit bericht.",
    seo: "SEO",
    performance: "Prestatie",
    security: "Beveiliging",
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reportTextToHtml(reportText: string): string {
  const lines = reportText.split("\n");
  let html = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      html += '<div style="height:8px;"></div>';
      continue;
    }

    // Section headers (lines of === or ---)
    if (/^[=]{3,}$/.test(trimmed) || /^[-]{3,}$/.test(trimmed)) {
      html += '<hr style="border:none;border-top:1px solid #e2e8f0;margin:4px 0;">';
      continue;
    }

    // Severity tags like [CRITIQUE], [ELEVE], [MOYEN]
    const escaped = escapeHtml(trimmed);
    let styled = escaped
      .replace(/\[(CRITIQUE|CRITICAL|KRITIEK)\]/g, '<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700;">$1</span>')
      .replace(/\[(ELEVE|HIGH|HOOG)\]/g, '<span style="background:#ffedd5;color:#ea580c;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700;">$1</span>')
      .replace(/\[(MOYEN|MEDIUM|GEMIDDELD)\]/g, '<span style="background:#fef9c3;color:#ca8a04;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700;">$1</span>')
      .replace(/\[(FAIBLE|LOW|LAAG)\]/g, '<span style="background:#ecfdf5;color:#16a34a;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700;">$1</span>');

    // Bullet points
    if (trimmed.startsWith("- ")) {
      html += `<div style="padding:4px 0 4px 12px;color:#334155;font-size:13px;line-height:1.5;">● ${styled.slice(2)}</div>`;
      continue;
    }

    // Section titles (ALL CAPS lines)
    if (/^[A-ZÉÈÊÀÙÛÔÎÏÜ\s\-()]{4,}$/.test(trimmed) && !trimmed.startsWith("-")) {
      html += `<div style="padding:12px 0 4px;color:#0f172a;font-size:14px;font-weight:700;letter-spacing:0.5px;">${escaped}</div>`;
      continue;
    }

    // Regular lines
    html += `<div style="padding:2px 0;color:#475569;font-size:13px;line-height:1.5;">${styled}</div>`;
  }

  return html;
}

export function getAuditEmailSubject({ hostname, auditType, locale }: AuditEmailParams): string {
  const t = labels[locale as keyof typeof labels] || labels.fr;
  const typeName = t[auditType];
  return t.subject(typeName, hostname);
}

export function getAuditEmailHtml({ hostname, auditType, score, grade, locale, reportText }: AuditEmailParams): string {
  const t = labels[locale as keyof typeof labels] || labels.fr;
  const typeName = t[auditType];

  const scoreColor = score >= 85 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  const auditPath = auditType === "seo" ? "seo-audit" : auditType === "performance" ? "performance-audit" : "security-audit";
  const baseUrl = `https://thewebmaster.pro/${locale}/${auditPath}`;

  const reportSection = reportText
    ? `
      <!-- Full Report -->
      <div style="margin-top:24px;padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #b8860b;">
          ${t.reportLabel}
        </div>
        ${reportTextToHtml(reportText)}
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
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

      ${reportSection}

      <div style="text-align:center;margin-top:24px;">
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
