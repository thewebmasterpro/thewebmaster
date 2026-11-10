import path from "path";
import fs from "fs";

function getDataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function getDbPath() {
  return path.join(getDataDir(), "leads.json");
}

function ensureDataDir() {
  try {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Silently fail if directory creation is not possible
  }
}

interface AuditLead {
  id: number;
  email: string;
  siteUrl: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  locale: string;
  ipAddress: string;
  createdAt: string;
  pdfSent: boolean;
}

export interface AuditLeadInput {
  email: string;
  siteUrl: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  locale: string;
  ipAddress: string;
}

function readLeads(): AuditLead[] {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) return [];
    const raw = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLeads(leads: AuditLead[]): void {
  ensureDataDir();
  fs.writeFileSync(getDbPath(), JSON.stringify(leads, null, 2), "utf-8");
}

export function insertAuditLead(input: AuditLeadInput & { pdfSent?: boolean }): number {
  const leads = readLeads();
  const id = leads.length > 0 ? Math.max(...leads.map((l) => l.id)) + 1 : 1;
  const lead: AuditLead = {
    id,
    email: input.email,
    siteUrl: input.siteUrl,
    auditType: input.auditType,
    score: input.score,
    grade: input.grade,
    locale: input.locale,
    ipAddress: input.ipAddress,
    createdAt: new Date().toISOString(),
    pdfSent: input.pdfSent ?? false,
  };
  leads.push(lead);
  writeLeads(leads);
  return id;
}

export function getLeadsByEmail(email: string): AuditLead[] {
  return readLeads()
    .filter((l) => l.email === email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAllLeads(): AuditLead[] {
  return readLeads().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getLeadsStats() {
  const leads = readLeads();
  const total = leads.length;
  const uniqueEmails = new Set(leads.map((l) => l.email)).size;
  const byType = { seo: 0, performance: 0, security: 0 };
  for (const l of leads) byType[l.auditType]++;
  const pdfSent = leads.filter((l) => l.pdfSent).length;
  return { total, uniqueEmails, byType, pdfSent };
}

// --- Audit Requests (all requests, with or without email) ---

interface AuditRequest {
  id: number;
  siteUrl: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  ipAddress: string;
  createdAt: string;
  email: string | null;
}

function getRequestsPath() {
  return path.join(getDataDir(), "requests.json");
}

function readRequests(): AuditRequest[] {
  try {
    const p = getRequestsPath();
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeRequests(requests: AuditRequest[]): void {
  ensureDataDir();
  fs.writeFileSync(getRequestsPath(), JSON.stringify(requests, null, 2), "utf-8");
}

export function insertAuditRequest(input: {
  siteUrl: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  ipAddress: string;
}): number {
  const requests = readRequests();
  const id = requests.length > 0 ? Math.max(...requests.map((r) => r.id)) + 1 : 1;
  requests.push({
    id,
    siteUrl: input.siteUrl,
    auditType: input.auditType,
    score: input.score,
    grade: input.grade,
    ipAddress: input.ipAddress,
    createdAt: new Date().toISOString(),
    email: null,
  });
  writeRequests(requests);
  return id;
}

export function linkEmailToRequest(requestId: number, email: string): void {
  const requests = readRequests();
  const req = requests.find((r) => r.id === requestId);
  if (req) {
    req.email = email;
    writeRequests(requests);
  }
}

export function getAllRequests(): AuditRequest[] {
  return readRequests().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRequestsStats() {
  const requests = readRequests();
  const total = requests.length;
  const withEmail = requests.filter((r) => r.email).length;
  const withoutEmail = total - withEmail;
  const byType = { seo: 0, performance: 0, security: 0 };
  for (const r of requests) byType[r.auditType]++;
  return { total, withEmail, withoutEmail, byType };
}

export function markPdfSent(id: number): void {
  const leads = readLeads();
  const lead = leads.find((l) => l.id === id);
  if (lead) {
    lead.pdfSent = true;
    writeLeads(leads);
  }
}

// =============================================================================
// AUDIT REPORTS — full snapshot storage for shareable reports + regression detection
// =============================================================================

// Stored reports are keyed by a short slug so they can be shared publicly
// (`/security-audit/r/:id`) without exposing DB internals. Only the payload
// `report` is returned on read — no user data is stored here.
export interface StoredAuditReport {
  id: string;
  siteUrl: string;
  normalisedUrl: string;
  score: number;
  grade: string;
  auditType: "security" | "seo" | "performance";
  report: unknown; // The full AuditResult payload
  createdAt: string;
}

function getReportsPath() {
  return path.join(getDataDir(), "audit-reports.json");
}

function readReports(): StoredAuditReport[] {
  try {
    const p = getReportsPath();
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return [];
  }
}

function writeReports(reports: StoredAuditReport[]): void {
  ensureDataDir();
  fs.writeFileSync(getReportsPath(), JSON.stringify(reports, null, 2), "utf-8");
}

function generateReportId(): string {
  // 10-char slug — URL-safe, ~60 bits of entropy
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function normaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname.replace(/^www\./, "")}`;
  } catch {
    return url;
  }
}

export function insertAuditReport(input: {
  siteUrl: string;
  score: number;
  grade: string;
  auditType: "security" | "seo" | "performance";
  report: unknown;
}): string {
  const reports = readReports();
  // Cap stored reports at 5000 — oldest evicted to keep JSON manageable
  if (reports.length >= 5000) {
    reports.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    reports.splice(0, reports.length - 4999);
  }
  const id = generateReportId();
  reports.push({
    id,
    siteUrl: input.siteUrl,
    normalisedUrl: normaliseUrl(input.siteUrl),
    score: input.score,
    grade: input.grade,
    auditType: input.auditType,
    report: input.report,
    createdAt: new Date().toISOString(),
  });
  writeReports(reports);
  return id;
}

export function getAuditReport(id: string): StoredAuditReport | null {
  return readReports().find((r) => r.id === id) ?? null;
}

/**
 * Returns the most recent audit of the same site (by normalised origin) and
 * same audit type, EXCLUDING one specific report id if given. Used for
 * regression detection: compare current audit to the last one before it.
 */
export function getPreviousAudit(
  siteUrl: string,
  auditType: "security" | "seo" | "performance",
  excludeId?: string
): StoredAuditReport | null {
  const target = normaliseUrl(siteUrl);
  const candidates = readReports()
    .filter((r) => r.auditType === auditType && r.normalisedUrl === target && r.id !== excludeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return candidates[0] ?? null;
}

/**
 * Returns the most recent audit per unique normalised URL+type. Used by the
 * monitoring cron to re-audit each tracked site exactly once per run.
 */
export function getTrackedUrls(auditType: "security" | "seo" | "performance", maxAgeDays = 30): { siteUrl: string; lastAuditAt: string }[] {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const latest = new Map<string, StoredAuditReport>();
  for (const r of readReports()) {
    if (r.auditType !== auditType) continue;
    if (new Date(r.createdAt).getTime() < cutoff) continue;
    const existing = latest.get(r.normalisedUrl);
    if (!existing || existing.createdAt.localeCompare(r.createdAt) < 0) {
      latest.set(r.normalisedUrl, r);
    }
  }
  return [...latest.values()].map((r) => ({ siteUrl: r.siteUrl, lastAuditAt: r.createdAt }));
}

// Monitor subscriptions — lead emails opted in for regression alerts.
// Stored in a dedicated file to decouple from the audit_reports table.
export interface MonitorSubscription {
  id: number;
  email: string;
  siteUrl: string;
  normalisedUrl: string;
  auditType: "security" | "seo" | "performance";
  createdAt: string;
  active: boolean;
  lastCheckedAt: string | null;
  lastRegressionNotifiedAt: string | null;
}

function getMonitorPath() {
  return path.join(getDataDir(), "monitor-subscriptions.json");
}

function readSubscriptions(): MonitorSubscription[] {
  try {
    const p = getMonitorPath();
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return [];
  }
}

function writeSubscriptions(subs: MonitorSubscription[]): void {
  ensureDataDir();
  fs.writeFileSync(getMonitorPath(), JSON.stringify(subs, null, 2), "utf-8");
}

export function upsertMonitorSubscription(input: {
  email: string;
  siteUrl: string;
  auditType: "security" | "seo" | "performance";
}): MonitorSubscription {
  const subs = readSubscriptions();
  const normalised = normaliseUrl(input.siteUrl);
  const existing = subs.find(
    (s) => s.email === input.email && s.normalisedUrl === normalised && s.auditType === input.auditType
  );
  if (existing) {
    existing.active = true;
    writeSubscriptions(subs);
    return existing;
  }
  const id = subs.length > 0 ? Math.max(...subs.map((s) => s.id)) + 1 : 1;
  const sub: MonitorSubscription = {
    id,
    email: input.email,
    siteUrl: input.siteUrl,
    normalisedUrl: normalised,
    auditType: input.auditType,
    createdAt: new Date().toISOString(),
    active: true,
    lastCheckedAt: null,
    lastRegressionNotifiedAt: null,
  };
  subs.push(sub);
  writeSubscriptions(subs);
  return sub;
}

export function getActiveSubscriptions(
  auditType: "security" | "seo" | "performance"
): MonitorSubscription[] {
  return readSubscriptions().filter((s) => s.active && s.auditType === auditType);
}

export function updateSubscription(id: number, patch: Partial<MonitorSubscription>): void {
  const subs = readSubscriptions();
  const sub = subs.find((s) => s.id === id);
  if (sub) {
    Object.assign(sub, patch);
    writeSubscriptions(subs);
  }
}

export function getSubscriptionsForUrl(
  siteUrl: string,
  auditType: "security" | "seo" | "performance"
): MonitorSubscription[] {
  const normalised = normaliseUrl(siteUrl);
  return readSubscriptions().filter(
    (s) => s.active && s.auditType === auditType && s.normalisedUrl === normalised
  );
}
