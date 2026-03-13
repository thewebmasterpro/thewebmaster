import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "audits.db");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    site_url TEXT NOT NULL,
    audit_type TEXT NOT NULL CHECK(audit_type IN ('seo', 'performance', 'security')),
    score INTEGER,
    grade TEXT,
    locale TEXT DEFAULT 'fr',
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    pdf_sent INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_audit_leads_email ON audit_leads(email);
  CREATE INDEX IF NOT EXISTS idx_audit_leads_created_at ON audit_leads(created_at);
`);

export interface AuditLeadInput {
  email: string;
  siteUrl: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  locale: string;
  ipAddress: string;
}

const insertStmt = db.prepare(`
  INSERT INTO audit_leads (email, site_url, audit_type, score, grade, locale, ip_address, pdf_sent)
  VALUES (@email, @siteUrl, @auditType, @score, @grade, @locale, @ipAddress, @pdfSent)
`);

export function insertAuditLead(input: AuditLeadInput & { pdfSent?: number }): number {
  const result = insertStmt.run({
    ...input,
    pdfSent: input.pdfSent ?? 0,
  });
  return result.lastInsertRowid as number;
}

export function getLeadsByEmail(email: string) {
  return db.prepare("SELECT * FROM audit_leads WHERE email = ? ORDER BY created_at DESC").all(email);
}

export function markPdfSent(id: number) {
  db.prepare("UPDATE audit_leads SET pdf_sent = 1 WHERE id = ?").run(id);
}

export default db;
