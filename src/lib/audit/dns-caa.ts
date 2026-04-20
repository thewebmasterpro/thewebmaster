import type { AuditCheck } from "@/types/audit";

// CAA records restrict which certificate authorities may issue certs for a
// domain. Absence → any CA can issue, which widens the attack surface for
// mis-issuance. Present + restrictive → bonne pratique.

interface DnsAnswer {
  name: string;
  type: number;
  data: string;
  TTL?: number;
}

interface DnsResponse {
  Status: number;
  Answer?: DnsAnswer[];
}

async function doh(name: string, type: string): Promise<DnsResponse | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      signal: controller.signal,
      headers: { Accept: "application/dns-json" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as DnsResponse;
  } catch {
    return null;
  }
}

export async function checkCAA(hostname: string): Promise<AuditCheck[]> {
  // Try exact hostname first, then walk up to the registrable parent.
  const candidates = [hostname];
  const parts = hostname.split(".");
  if (parts.length > 2) candidates.push(parts.slice(1).join("."));

  for (const candidate of candidates) {
    const res = await doh(candidate, "CAA");
    const caaRecords = (res?.Answer ?? []).filter((a) => a.type === 257);
    if (caaRecords.length > 0) {
      // Parse CAA record data (format: "0 issue \"letsencrypt.org\"")
      const issuers = caaRecords
        .map((r) => {
          const m = r.data.match(/\b(issue|issuewild|iodef)\b\s+"([^"]*)"/i);
          return m ? `${m[1]} ${m[2]}` : r.data;
        })
        .filter(Boolean);
      const hasIodef = caaRecords.some((r) => /\biodef\b/i.test(r.data));
      const unrestricted = caaRecords.some((r) => /\bissue\s+";"/i.test(r.data));
      return [
        {
          id: "dns-caa",
          category: "infra",
          name: "Enregistrements CAA DNS",
          status: unrestricted ? "warn" : "pass",
          severity: unrestricted ? "low" : undefined,
          description: unrestricted
            ? `CAA présent mais autorise toutes les CA (issue ";"). Restreignez aux CA que vous utilisez réellement.`
            : `CAA configuré sur ${candidate} — seules les CA listées peuvent émettre des certificats.${hasIodef ? " Iodef présent." : ""}`,
          value: issuers.slice(0, 3).join(" | "),
          recommendation: unrestricted
            ? `Remplacez "issue \\";\\";" par des CA précises : \`${candidate}. CAA 0 issue "letsencrypt.org"\`.`
            : undefined,
        },
      ];
    }
  }

  return [
    {
      id: "dns-caa",
      category: "infra",
      name: "Enregistrements CAA DNS",
      status: "info",
      description: "Aucun enregistrement CAA trouvé. Toute autorité de certification peut émettre un certificat pour ce domaine.",
      recommendation: `Ajoutez un enregistrement CAA chez votre registrar. Exemple (Let's Encrypt uniquement) :\n\n${hostname}. CAA 0 issue "letsencrypt.org"\n${hostname}. CAA 0 iodef "mailto:security@${hostname}"`,
    },
  ];
}
