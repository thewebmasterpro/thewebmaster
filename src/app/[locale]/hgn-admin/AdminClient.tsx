"use client";

import { useState } from "react";
import {
  Lock,
  Shield,
  Search,
  Gauge,
  Mail,
  Globe,
  Clock,
  Users,
  FileText,
  Download,
  Activity,
  MailCheck,
} from "lucide-react";

interface Lead {
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

interface LeadsStats {
  total: number;
  uniqueEmails: number;
  byType: { seo: number; performance: number; security: number };
  pdfSent: number;
}

interface RequestsStats {
  total: number;
  withEmail: number;
  withoutEmail: number;
  byType: { seo: number; performance: number; security: number };
}

const auditIcons = {
  seo: Search,
  performance: Gauge,
  security: Shield,
};

const auditColors = {
  seo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  performance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  security: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function gradeColor(grade: string) {
  if (grade === "A+" || grade === "A") return "text-emerald-400";
  if (grade === "B") return "text-lime-400";
  if (grade === "C") return "text-amber-400";
  if (grade === "D") return "text-orange-400";
  return "text-red-400";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminClient() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [leadsStats, setLeadsStats] = useState<LeadsStats | null>(null);
  const [requestsStats, setRequestsStats] = useState<RequestsStats | null>(null);
  const [tab, setTab] = useState<"requests" | "leads">("requests");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/leads", {
        headers: { "x-admin-token": token },
      });

      if (!res.ok) {
        setError("Token invalide");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setLeads(data.leads);
      setRequests(data.requests);
      setLeadsStats(data.leadsStats);
      setRequestsStats(data.requestsStats);
      setAuthenticated(true);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (tab === "requests") {
      const headers = ["ID", "Site", "Type", "Score", "Grade", "Email", "IP", "Date"];
      const rows = filteredRequests.map((r) => [
        r.id, r.siteUrl, r.auditType, r.score, r.grade, r.email || "", r.ipAddress, r.createdAt,
      ]);
      downloadCsv([headers, ...rows], `requests-${new Date().toISOString().slice(0, 10)}.csv`);
    } else {
      const headers = ["ID", "Email", "Site", "Type", "Score", "Grade", "Locale", "IP", "Date", "PDF"];
      const rows = filteredLeads.map((l) => [
        l.id, l.email, l.siteUrl, l.auditType, l.score, l.grade, l.locale, l.ipAddress, l.createdAt, l.pdfSent ? "Yes" : "No",
      ]);
      downloadCsv([headers, ...rows], `leads-${new Date().toISOString().slice(0, 10)}.csv`);
    }
  }

  function downloadCsv(data: (string | number | boolean)[][], filename: string) {
    const csv = data.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredRequests = requests.filter((r) => {
    if (filterType !== "all" && r.auditType !== filterType) return false;
    if (searchText && !r.siteUrl.toLowerCase().includes(searchText.toLowerCase()) && !(r.email || "").toLowerCase().includes(searchText.toLowerCase()))
      return false;
    return true;
  });

  const filteredLeads = leads.filter((l) => {
    if (filterType !== "all" && l.auditType !== filterType) return false;
    if (searchText && !l.email.toLowerCase().includes(searchText.toLowerCase()) && !l.siteUrl.toLowerCase().includes(searchText.toLowerCase()))
      return false;
    return true;
  });

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-zinc-400 mb-2">
            <Lock className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Admin</span>
          </div>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token d'acces"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-white text-black font-medium rounded-lg py-3 hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Acceder"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        {requestsStats && leadsStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard icon={Activity} label="Total audits" value={requestsStats.total} />
            <StatCard icon={MailCheck} label="Avec email" value={requestsStats.withEmail} />
            <StatCard icon={Users} label="Sans email" value={requestsStats.withoutEmail} />
            <StatCard icon={Search} label="SEO" value={requestsStats.byType.seo} />
            <StatCard icon={Gauge} label="Performance" value={requestsStats.byType.performance} />
            <StatCard icon={Shield} label="Securite" value={requestsStats.byType.security} />
            <StatCard icon={Mail} label="Emails collectes" value={leadsStats.total} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("requests")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tab === "requests"
                ? "bg-white text-black border-white"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Toutes les demandes ({requests.length})
            </span>
          </button>
          <button
            onClick={() => setTab("leads")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tab === "leads"
                ? "bg-white text-black border-white"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Leads avec email ({leads.length})
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Rechercher par site ou email..."
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm flex-1 focus:outline-none focus:border-zinc-600"
          />
          <div className="flex gap-2">
            {["all", "seo", "performance", "security"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  filterType === t
                    ? "bg-white text-black border-white"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
                }`}
              >
                {t === "all" ? "Tous" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="text-zinc-500 text-sm">
          {(tab === "requests" ? filteredRequests.length : filteredLeads.length)} resultat
          {(tab === "requests" ? filteredRequests.length : filteredLeads.length) !== 1 ? "s" : ""}
        </p>

        {/* Tables */}
        <div className="overflow-x-auto">
          {tab === "requests" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="py-3 px-3 font-medium">#</th>
                  <th className="py-3 px-3 font-medium">Type</th>
                  <th className="py-3 px-3 font-medium">Site</th>
                  <th className="py-3 px-3 font-medium">Score</th>
                  <th className="py-3 px-3 font-medium">Grade</th>
                  <th className="py-3 px-3 font-medium">Email</th>
                  <th className="py-3 px-3 font-medium">IP</th>
                  <th className="py-3 px-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const Icon = auditIcons[req.auditType];
                  return (
                    <tr key={req.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 px-3 text-zinc-500">{req.id}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${auditColors[req.auditType]}`}>
                          <Icon className="w-3 h-3" />
                          {req.auditType}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Globe className="w-3 h-3 text-zinc-500" />
                          {req.siteUrl}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">{req.score}%</td>
                      <td className={`py-3 px-3 font-bold ${gradeColor(req.grade)}`}>{req.grade}</td>
                      <td className="py-3 px-3">
                        {req.email ? (
                          <span className="text-zinc-200">{req.email}</span>
                        ) : (
                          <span className="text-zinc-600 text-xs">--</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-zinc-500 font-mono text-xs">{req.ipAddress}</td>
                      <td className="py-3 px-3 text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          {formatDate(req.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-600">Aucune demande</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="py-3 px-3 font-medium">#</th>
                  <th className="py-3 px-3 font-medium">Type</th>
                  <th className="py-3 px-3 font-medium">Email</th>
                  <th className="py-3 px-3 font-medium">Site</th>
                  <th className="py-3 px-3 font-medium">Score</th>
                  <th className="py-3 px-3 font-medium">Grade</th>
                  <th className="py-3 px-3 font-medium">Locale</th>
                  <th className="py-3 px-3 font-medium">IP</th>
                  <th className="py-3 px-3 font-medium">Date</th>
                  <th className="py-3 px-3 font-medium">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const Icon = auditIcons[lead.auditType];
                  return (
                    <tr key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 px-3 text-zinc-500">{lead.id}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${auditColors[lead.auditType]}`}>
                          <Icon className="w-3 h-3" />
                          {lead.auditType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-200">{lead.email}</td>
                      <td className="py-3 px-3">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Globe className="w-3 h-3 text-zinc-500" />
                          {lead.siteUrl}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">{lead.score}%</td>
                      <td className={`py-3 px-3 font-bold ${gradeColor(lead.grade)}`}>{lead.grade}</td>
                      <td className="py-3 px-3 text-zinc-500 uppercase text-xs">{lead.locale}</td>
                      <td className="py-3 px-3 text-zinc-500 font-mono text-xs">{lead.ipAddress}</td>
                      <td className="py-3 px-3 text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          {formatDate(lead.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {lead.pdfSent ? (
                          <span className="text-emerald-400 text-xs">Oui</span>
                        ) : (
                          <span className="text-zinc-600 text-xs">Non</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-zinc-600">Aucun lead</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-zinc-500 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
