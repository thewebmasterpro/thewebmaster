// Robust HTML parsing helpers. We avoid adding a full DOM parser dependency
// (jsdom/cheerio) to keep the server bundle small — instead we strip scripts
// and styles first, then use structured regex that tolerates attribute order,
// quote style, and whitespace variations.

export function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Finds every <meta> tag and returns a normalised array of {key, value}.
 * Handles both `name="x"` and `property="x"` attributes, in any order.
 */
export function parseMetaTags(html: string): { key: string; value: string }[] {
  const result: { key: string; value: string }[] = [];
  const metaTagRegex = /<meta\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaTagRegex.exec(html)) !== null) {
    const attrs = match[1];
    const keyMatch = attrs.match(/\b(?:name|property|http-equiv|itemprop)\s*=\s*["']([^"']+)["']/i);
    const valueMatch = attrs.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (keyMatch && valueMatch) {
      result.push({ key: keyMatch[1].toLowerCase(), value: valueMatch[1].trim() });
    }
  }
  return result;
}

export function getMetaContent(metas: { key: string; value: string }[], key: string): string | null {
  const needle = key.toLowerCase();
  const match = metas.find((m) => m.key === needle);
  return match ? match.value : null;
}

export function getAllMetas(metas: { key: string; value: string }[], key: string): string[] {
  const needle = key.toLowerCase();
  return metas.filter((m) => m.key === needle).map((m) => m.value);
}

/**
 * Parses <link> tags into a normalised array. Gives access to all canonical,
 * alternate, icon, preconnect, preload, manifest declarations.
 */
export interface LinkTag {
  rel: string;
  href: string;
  hreflang?: string;
  type?: string;
  sizes?: string;
  media?: string;
  crossorigin?: string;
}

export function parseLinkTags(html: string): LinkTag[] {
  const result: LinkTag[] = [];
  const linkRegex = /<link\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1];
    const href = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
    if (!rel || !href) continue;
    result.push({
      rel: rel.toLowerCase().trim(),
      href: href.trim(),
      hreflang: attrs.match(/\bhreflang\s*=\s*["']([^"']+)["']/i)?.[1],
      type: attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1],
      sizes: attrs.match(/\bsizes\s*=\s*["']([^"']+)["']/i)?.[1],
      media: attrs.match(/\bmedia\s*=\s*["']([^"']+)["']/i)?.[1],
      crossorigin: attrs.match(/\bcrossorigin\s*=\s*["']?([^"'\s>]+)["']?/i)?.[1],
    });
  }
  return result;
}

export function getLinksByRel(links: LinkTag[], rel: string): LinkTag[] {
  const needle = rel.toLowerCase();
  return links.filter((l) => l.rel.split(/\s+/).includes(needle));
}

/**
 * Extracts the <title> content, ignoring any title that lives inside a <svg>
 * or <script> block (common false positive on regex-only parsers).
 */
export function extractPageTitle(html: string): string | null {
  const cleaned = stripScriptsAndStyles(html)
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "");
  const match = cleaned.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, "").trim() || null;
}

export function extractLangAttribute(html: string): string | null {
  const match = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);
  return match ? match[1].trim() : null;
}

/**
 * Extracts headings from the rendered-ish content only (scripts/styles stripped).
 * Returns H1 through H6 in document order.
 */
export function extractHeadings(html: string): { tag: string; text: string }[] {
  const cleaned = stripScriptsAndStyles(html);
  const regex = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const result: { tag: string; text: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    const text = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) result.push({ tag: match[1].toUpperCase(), text });
  }
  return result;
}

export interface ImgTag {
  src: string;
  alt: string | null;
  loading: string | null;
  width: number | null;
  height: number | null;
  decorative: boolean;
  fromNextImage: boolean;
}

/**
 * Parses <img> tags into a structured array. Recognises decorative images
 * (empty alt or role="presentation"/aria-hidden="true") so the audit doesn't
 * flag them as missing alt text.
 */
export function parseImgTags(html: string): ImgTag[] {
  const cleaned = stripScriptsAndStyles(html);
  const regex = /<img\b([^>]*)\/?>/gi;
  const result: ImgTag[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    const attrs = match[1];
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const altMatch = attrs.match(/\balt\s*=\s*["']([^"']*)["']/i);
    const role = attrs.match(/\brole\s*=\s*["']([^"']+)["']/i)?.[1];
    const ariaHidden = attrs.match(/\baria-hidden\s*=\s*["']?(true|false)["']?/i)?.[1];
    const loading = attrs.match(/\bloading\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const widthStr = attrs.match(/\bwidth\s*=\s*["']?(\d+)["']?/i)?.[1];
    const heightStr = attrs.match(/\bheight\s*=\s*["']?(\d+)["']?/i)?.[1];
    const decorative =
      (altMatch && altMatch[1] === "") ||
      role === "presentation" ||
      role === "none" ||
      ariaHidden === "true";
    const fromNextImage = /\/_next\/image/.test(src);
    result.push({
      src,
      alt: altMatch ? altMatch[1] : null,
      loading,
      width: widthStr ? parseInt(widthStr) : null,
      height: heightStr ? parseInt(heightStr) : null,
      decorative: !!decorative,
      fromNextImage,
    });
  }
  return result;
}

export interface AnchorTag {
  href: string;
  rel: string | null;
  target: string | null;
  text: string;
}

export function parseAnchorTags(html: string): AnchorTag[] {
  const cleaned = stripScriptsAndStyles(html);
  const regex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const result: AnchorTag[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    const attrs = match[1];
    const href = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
    if (!href) continue;
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const target = attrs.match(/\btarget\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    result.push({ href: href.trim(), rel, target, text });
  }
  return result;
}

/**
 * Categorises anchor hrefs into internal/external/anchor/protocol-relative.
 * Uses the page's base URL to resolve relative links correctly.
 */
export function categorizeLinks(
  anchors: AnchorTag[],
  baseUrl: string
): { internal: AnchorTag[]; external: AnchorTag[]; anchor: AnchorTag[]; other: AnchorTag[] } {
  const base = new URL(baseUrl);
  const internal: AnchorTag[] = [];
  const external: AnchorTag[] = [];
  const anchor: AnchorTag[] = [];
  const other: AnchorTag[] = [];
  for (const a of anchors) {
    const href = a.href;
    if (!href) continue;
    if (href.startsWith("#")) {
      anchor.push(a);
      continue;
    }
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      other.push(a);
      continue;
    }
    try {
      const resolved = new URL(href, base);
      if (resolved.hostname === base.hostname) internal.push(a);
      else external.push(a);
    } catch {
      other.push(a);
    }
  }
  return { internal, external, anchor, other };
}

/**
 * Extracts the visible text content for word-counting — strips tags, scripts,
 * styles, then collapses whitespace. Filters out nav/footer boilerplate words
 * by ignoring anchors alone.
 */
export function extractVisibleText(html: string): string {
  return stripScriptsAndStyles(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Unicode-aware word count. For CJK (no whitespace between characters),
// we count Han/Hiragana/Katakana/Hangul codepoints directly — each counts as a
// "word" since that matches how search engines estimate content depth.
export function wordCount(text: string): number {
  if (!text) return 0;
  // CJK: count every meaningful character as a word (no spaces in CJK text)
  const cjkChars =
    (text.match(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/gu) || []).length;
  // Latin / Cyrillic / Greek / Arabic / Hebrew / Devanagari / etc.: split on whitespace
  const latinStyle = text
    .replace(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]+/gu, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return cjkChars + latinStyle;
}
