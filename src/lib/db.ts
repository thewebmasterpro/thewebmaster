import path from "path";
import fs from "fs";

function getDataDir() {
  return path.join(process.cwd(), "data");
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
