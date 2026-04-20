// OG image validator: verifies the image is reachable and meets the
// minimum 1200×630 px ratio required by Facebook / LinkedIn / Twitter for
// rich previews. Too small → social embeds fall back to a tiny thumbnail.

import type { AuditCheck } from "@/types/audit";

// Get dimensions from the first kilobytes of the image (PNG/JPEG/WebP/GIF).
// We avoid fetching the full image body — 4 KB is enough to read headers.
async function getImageDimensions(
  url: string
): Promise<{ width: number; height: number; format: string; bytes: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Range: "bytes=0-8192", "User-Agent": "TheWebmaster-SeoAudit/2.0" },
    });
    clearTimeout(timer);
    if (!res.ok && res.status !== 206) return null;
    const bytes = parseInt(res.headers.get("content-length") || "0");
    const buffer = Buffer.from(await res.arrayBuffer());
    const dims = parseImageHeader(buffer);
    if (!dims) return null;
    return { ...dims, bytes: bytes || buffer.length };
  } catch {
    return null;
  }
}

function parseImageHeader(buf: Buffer): { width: number; height: number; format: string } | null {
  if (buf.length < 24) return null;

  // PNG: 8-byte signature, IHDR at offset 8
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: "png" };
  }

  // GIF: "GIF87a" or "GIF89a"
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), format: "gif" };
  }

  // WebP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) {
    // VP8L: 'VP8L' at offset 12
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x4c) {
      const b = buf.readUInt32LE(21);
      const width = (b & 0x3fff) + 1;
      const height = ((b >> 14) & 0x3fff) + 1;
      return { width, height, format: "webp" };
    }
    // VP8X extended format
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x58) {
      const width = ((buf[24] | (buf[25] << 8) | (buf[26] << 16)) & 0xffffff) + 1;
      const height = ((buf[27] | (buf[28] << 8) | (buf[29] << 16)) & 0xffffff) + 1;
      return { width, height, format: "webp" };
    }
    // VP8 lossy
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x20) {
      const width = buf.readUInt16LE(26) & 0x3fff;
      const height = buf.readUInt16LE(28) & 0x3fff;
      return { width, height, format: "webp" };
    }
  }

  // AVIF: ISO-BMFF container. Parse ftyp box at offset 0, then find the ispe
  // (image spatial extent) box inside meta > iprp > ipco.
  // Signature: "ftyp" at offset 4-8, major_brand = avif/avis/heic/heix.
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis" || brand === "heic" || brand === "heix" || brand === "mif1") {
      // Walk top-level boxes looking for "meta"
      let offset = buf.readUInt32BE(0); // size of first box (ftyp)
      while (offset < buf.length - 8) {
        const size = buf.readUInt32BE(offset);
        const type = buf.toString("ascii", offset + 4, offset + 8);
        if (size < 8 || offset + size > buf.length) break;
        if (type === "meta") {
          // meta has 4 bytes version/flags + child boxes
          let inner = offset + 12;
          while (inner < offset + size - 8) {
            const innerSize = buf.readUInt32BE(inner);
            const innerType = buf.toString("ascii", inner + 4, inner + 8);
            if (innerSize < 8) break;
            if (innerType === "iprp") {
              // iprp > ipco > ispe
              let p = inner + 8;
              while (p < inner + innerSize - 8) {
                const ps = buf.readUInt32BE(p);
                const pt = buf.toString("ascii", p + 4, p + 8);
                if (ps < 8) break;
                if (pt === "ipco") {
                  let q = p + 8;
                  while (q < p + ps - 8) {
                    const qs = buf.readUInt32BE(q);
                    const qt = buf.toString("ascii", q + 4, q + 8);
                    if (qs < 8) break;
                    if (qt === "ispe" && q + 20 <= buf.length) {
                      const width = buf.readUInt32BE(q + 12);
                      const height = buf.readUInt32BE(q + 16);
                      return { width, height, format: brand };
                    }
                    q += qs;
                  }
                }
                p += ps;
              }
            }
            inner += innerSize;
          }
        }
        offset += size;
      }
    }
  }

  // JPEG: scan SOFn markers
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 9) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      const length = buf.readUInt16BE(offset + 2);
      // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height, format: "jpeg" };
      }
      offset += 2 + length;
    }
  }

  return null;
}

export async function checkOgImage(ogImageUrl: string | null, pageUrl: string): Promise<AuditCheck[]> {
  if (!ogImageUrl) {
    return [
      {
        id: "og-image-absent",
        category: "onpage",
        name: "Open Graph image",
        status: "warn",
        severity: "low",
        description: "Aucune og:image détectée. Les partages sur réseaux sociaux n'afficheront pas d'aperçu visuel.",
        recommendation: `Ajoutez : <meta property="og:image" content="https://…/preview.jpg"> (1200×630 recommandé).`,
      },
    ];
  }

  // Resolve relative URL
  let resolved: string;
  try {
    resolved = new URL(ogImageUrl, pageUrl).toString();
  } catch {
    return [
      {
        id: "og-image-invalid",
        category: "onpage",
        name: "Open Graph image invalide",
        status: "warn",
        severity: "low",
        description: `L'URL og:image ne peut pas être résolue : "${ogImageUrl}".`,
        recommendation: "Utilisez une URL absolue (https://…) pour og:image.",
      },
    ];
  }

  // HTTP-only og:image fails on HTTPS embeds
  if (resolved.startsWith("http://")) {
    return [
      {
        id: "og-image-http",
        category: "onpage",
        name: "Open Graph image en HTTP",
        status: "fail",
        severity: "medium",
        description: "og:image pointe vers HTTP. Facebook/LinkedIn/Twitter bloquent les images non sécurisées.",
        value: resolved,
        recommendation: "Migrez l'image sur HTTPS.",
      },
    ];
  }

  const dims = await getImageDimensions(resolved);
  if (!dims) {
    return [
      {
        id: "og-image-unreachable",
        category: "onpage",
        name: "Open Graph image inaccessible",
        status: "warn",
        severity: "medium",
        description: "og:image n'a pas pu être chargée (404, timeout, ou format non supporté).",
        value: resolved,
        recommendation: "Vérifiez que l'URL retourne une image valide (PNG/JPEG/WebP) en < 5 Mo.",
      },
    ];
  }

  const checks: AuditCheck[] = [];
  const { width, height, format, bytes } = dims;
  const aspectRatio = width / height;

  // Facebook/LinkedIn recommend ≥ 1200×630. Twitter Card "summary_large_image" = 1200×628.
  const tooSmall = width < 1200 || height < 630;
  const wrongRatio = aspectRatio < 1.7 || aspectRatio > 2.0; // target ≈ 1.91 (1200/630)

  if (tooSmall) {
    checks.push({
      id: "og-image-too-small",
      category: "onpage",
      name: "Open Graph image trop petite",
      status: "warn",
      severity: "medium",
      description: `og:image est ${width}×${height}. Facebook/LinkedIn recommandent 1200×630 minimum sinon l'aperçu est rogné ou affiché en miniature.`,
      value: `${width}×${height} ${format}`,
      recommendation: "Redimensionnez l'image à 1200×630 (ou 1200×675 pour Twitter).",
    });
  } else if (wrongRatio) {
    checks.push({
      id: "og-image-ratio",
      category: "onpage",
      name: "Open Graph image : mauvais ratio",
      status: "info",
      description: `Ratio actuel : ${aspectRatio.toFixed(2)}:1. Le ratio recommandé est 1.91:1 (ex : 1200×630).`,
      value: `${width}×${height} ${format}`,
    });
  } else {
    checks.push({
      id: "og-image-valid",
      category: "onpage",
      name: "Open Graph image valide",
      status: "pass",
      description: `og:image correctement dimensionnée (${width}×${height} ${format}).`,
      value: resolved,
    });
  }

  // Weight check — FB recommends < 8 MB, ideally < 1 MB
  if (bytes > 5_000_000) {
    checks.push({
      id: "og-image-heavy",
      category: "onpage",
      name: "Open Graph image trop lourde",
      status: "warn",
      severity: "low",
      description: `og:image pèse ${Math.round(bytes / 1024)} Ko. Les crawlers tronquent au-delà de 5 Mo.`,
      value: `${Math.round(bytes / 1024)} Ko`,
      recommendation: "Compressez l'image en WebP ou JPEG progressif (< 500 Ko idéalement).",
    });
  }

  return checks;
}
