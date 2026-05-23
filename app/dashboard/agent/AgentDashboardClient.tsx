"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const POSITIONS = [
  "GOALKEEPER","LEFT_BACK","RIGHT_BACK","LEFT_WING","RIGHT_WING","CENTRE_BACK","PIVOT","CENTRE_FORWARD"
];
const COUNTRIES = [
  "Bosnia and Herzegovina","Serbia","Croatia","Slovenia","Montenegro","North Macedonia",
  "Germany","France","Spain","Denmark","Sweden","Norway","Hungary","Poland","Romania",
  "Austria","Switzerland","Portugal","Netherlands","Belgium","Czech Republic","Slovakia",
  "Qatar","Bahrain","Saudi Arabia","Kuwait","UAE","Egypt","Tunisia","Algeria","Morocco",
  "Brazil","Argentina","United States","Other"
];
const VERIF_COLORS: Record<string, string> = {
  UNVERIFIED: "badge-muted", PENDING: "badge-accent", VERIFIED: "badge-green", REJECTED: "badge-red",
};
const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "badge-green", INJURED: "badge-red", REHAB: "badge-accent", SUSPENDED: "badge-muted",
};
const COMMISSION_STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-accent", PAID: "badge-green", OVERDUE: "badge-red", CANCELLED: "badge-muted",
};

function posLabel(p: string) {
  return p?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "—";
}

function daysLeft(endDate: string | Date): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

function fmtCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `€${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function contractRowColor(days: number): string {
  if (days < 30) return "rgba(255,59,59,0.06)";
  if (days < 180) return "rgba(232,255,71,0.04)";
  return "transparent";
}

function getAge(dob: string | Date | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  return String(Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

type Tab = "overview" | "players" | "contracts" | "commissions" | "transfers" | "pitch" | "settings";

const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "overview",     icon: "⊞",  label: "Overview" },
  { id: "players",      icon: "👥", label: "Players" },
  { id: "contracts",    icon: "📄", label: "Contracts" },
  { id: "commissions",  icon: "💰", label: "Commissions" },
  { id: "transfers",    icon: "🔄", label: "Transfers" },
  { id: "pitch",        icon: "🚀", label: "Pitch Generator" },
  { id: "settings",     icon: "⚙️", label: "Settings" },
];

const STICKY_HEADER: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 80,
  background: "#090909",
  paddingTop: 10,
  paddingBottom: 10,
  marginBottom: 16,
  borderBottom: "1px solid rgba(245,243,238,0.06)",
};

export default function AgentDashboardClient({ agent }: { agent: any }) {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>(searchParams.get("tab") as Tab ?? "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [players, setPlayers] = useState<any[]>(agent.players ?? []);
  const [contracts, setContracts] = useState<any[]>(agent.contracts ?? []);
  const [commissions, setCommissions] = useState<any[]>(agent.commissions ?? []);
  const [transfers, setTransfers] = useState<any[]>(agent.transfers ?? []);
  const [pitchDecks, setPitchDecks] = useState<any[]>(agent.pitchDecks ?? []);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Sync tab when URL changes (nav-bar links like ?tab=settings)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setTab(t as Tab);
  }, [searchParams]);

  function switchTab(id: Tab) {
    setTab(id);
    setSidebarOpen(false);
  }

  // Add Player modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Verification modal
  const [verifyPlayer, setVerifyPlayer] = useState<{ id: string; name: string; status: string } | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const docInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  // Delete player confirm
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Players filter/search
  const [playerSearch, setPlayerSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterSalaryMin, setFilterSalaryMin] = useState("");
  const [filterSalaryMax, setFilterSalaryMax] = useState("");

  // Share dropdown
  const [shareOpenFor, setShareOpenFor] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Close share dropdown on outside click
  useEffect(() => {
    if (!shareOpenFor) return;
    function close(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-share-dropdown]")) setShareOpenFor(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [shareOpenFor]);

  // Contract modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ playerId: "", clubName: "", startDate: "", endDate: "", salaryCents: "", bonusDetails: "", notes: "" });
  const [contractDocFile, setContractDocFile] = useState<File | null>(null);
  const contractDocRef = useRef<HTMLInputElement>(null);
  const [contractSaving, setContractSaving] = useState(false);
  const [contractError, setContractError] = useState("");

  // Commission modal — multi-installment
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionPlayerId, setCommissionPlayerId] = useState("");
  const [commissionInstallments, setCommissionInstallments] = useState([
    { description: "", amountEur: "", dueDate: "", notes: "" },
  ]);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionError, setCommissionError] = useState("");

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ playerId: "", fromClub: "", toClub: "", transferDate: "", transferFeeEur: "", salaryEur: "", contractYears: "", notes: "" });
  const [transferDocFile, setTransferDocFile] = useState<File | null>(null);
  const transferDocRef = useRef<HTMLInputElement>(null);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState("");

  // Pitch form
  const [pitchForm, setPitchForm] = useState({ title: "", selectedPlayerIds: [] as string[], message: "", expiresAt: "" });
  const [pitchSaving, setPitchSaving] = useState(false);
  const [pitchError, setPitchError] = useState("");
  const [pitchMsg, setPitchMsg] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Settings form
  const [settings, setSettings] = useState({
    firstName: agent.firstName ?? "",
    lastName: agent.lastName ?? "",
    phone: agent.phone ?? "",
    country: agent.country ?? "",
    website: agent.website ?? "",
    licenseNumber: agent.licenseNumber ?? "",
    bio: agent.bio ?? "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ── Computed stats ───────────────────────────────────────────────
  const stats = {
    total: players.length,
    available: players.filter(p => p.isAvailable === true).length,
    pendingCommissions: commissions.filter(c => c.status === "PENDING").length,
    totalPendingCents: commissions
      .filter(c => c.status === "PENDING")
      .reduce((s: number, c: any) => s + (c.amountCents ?? 0), 0),
    paidCommissions: commissions.filter(c => c.status === "PAID").length,
    totalPaidCents: commissions
      .filter(c => c.status === "PAID")
      .reduce((s: number, c: any) => s + (c.amountCents ?? 0), 0),
  };

  // ── Random 5 players for overview (re-randomised on each mount) ─
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const overviewPlayers = useMemo(() => [...players].sort(() => Math.random() - 0.5).slice(0, 5), []);

  // ── Filtered players (Players tab) ──────────────────────────────
  const filteredPlayers = players.filter(p => {
    if (playerSearch) {
      const q = playerSearch.toLowerCase();
      if (!`${p.firstName} ${p.lastName}`.toLowerCase().includes(q)) return false;
    }
    if (filterPosition && p.position !== filterPosition) return false;
    if (filterSalaryMin) {
      const minCents = parseFloat(filterSalaryMin) * 100;
      const sal = p.expectedSalaryMin ?? p.expectedSalaryMax ?? 0;
      if (sal < minCents) return false;
    }
    if (filterSalaryMax) {
      const maxCents = parseFloat(filterSalaryMax) * 100;
      const sal = p.expectedSalaryMin ?? p.expectedSalaryMax ?? 0;
      if (sal > maxCents) return false;
    }
    return true;
  });

  function getShareLinks(p: any) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/players/${p.slug}`;
    const text = `${p.firstName} ${p.lastName} — ${posLabel(p.position)} | HandballHub`;
    return {
      url,
      copy: () => navigator.clipboard.writeText(url).then(() => { setCopiedShare(true); setTimeout(() => setCopiedShare(false), 1800); }),
      whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + "\n" + url)}`,
      viber: `viber://forward?text=${encodeURIComponent(text + "\n" + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
  }

  // ── Add Player ───────────────────────────────────────────────────
  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) { setAddError("Please enter first and last name."); return; }
    setAddSaving(true); setAddError("");
    const res = await fetch("/api/agent/players", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: addForm.firstName.trim(), lastName: addForm.lastName.trim() }),
    });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) { setAddError(data.error ?? "Failed to create player."); return; }
    window.location.href = `/onboarding/agent-player/${data.player.id}`;
  }

  // ── Verify player ────────────────────────────────────────────────
  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyPlayer) return;
    if (!docFile) { setVerifyMsg("Player identity document is required."); return; }
    if (!contractFile) { setVerifyMsg("Signed contract is required."); return; }
    setVerifying(true); setVerifyMsg("");
    const fd = new FormData();
    fd.append("document", docFile);
    fd.append("contract", contractFile);
    const res = await fetch(`/api/agent/players/${verifyPlayer.id}/verify`, { method: "POST", body: fd });
    const data = await res.json();
    setVerifying(false);
    if (res.ok) {
      setPlayers(ps => ps.map(p => p.id === verifyPlayer.id ? { ...p, verificationStatus: "PENDING" } : p));
      setVerifyPlayer(null); setDocFile(null); setContractFile(null);
    } else { setVerifyMsg(data.error ?? "Upload failed. Please try again."); }
  }

  // ── Delete player ────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await fetch(`/api/agent/players/${confirmDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    setPlayers(ps => ps.filter(p => p.id !== confirmDelete.id));
    setConfirmDelete(null);
  }

  // ── Add Contract ─────────────────────────────────────────────────
  async function handleAddContract(e: React.FormEvent) {
    e.preventDefault();
    setContractSaving(true); setContractError("");

    let contractFileUrl: string | null = null;
    if (contractDocFile) {
      const fd = new FormData();
      fd.append("file", contractDocFile);
      const upRes = await fetch("/api/agent/upload", { method: "POST", body: fd });
      if (!upRes.ok) { setContractError("File upload failed. Please try again."); setContractSaving(false); return; }
      const upData = await upRes.json();
      contractFileUrl = upData.url ?? null;
    }

    const res = await fetch("/api/agent/contracts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...contractForm,
        salaryCents: contractForm.salaryCents ? Math.round(parseFloat(contractForm.salaryCents) * 100) : null,
        contractFileUrl,
      }),
    });
    const data = await res.json();
    setContractSaving(false);
    if (!res.ok) { setContractError(data.error ?? "Failed to save."); return; }
    setContracts(cs => [...cs, data.contract].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()));
    setShowContractModal(false);
    setContractForm({ playerId: "", clubName: "", startDate: "", endDate: "", salaryCents: "", bonusDetails: "", notes: "" });
    setContractDocFile(null);
  }

  async function handleDeleteContract(id: string) {
    await fetch(`/api/agent/contracts/${id}`, { method: "DELETE" });
    setContracts(cs => cs.filter(c => c.id !== id));
  }

  // ── Commission helpers ───────────────────────────────────────────
  function addInstallment() {
    setCommissionInstallments(is => [...is, { description: "", amountEur: "", dueDate: "", notes: "" }]);
  }
  function removeInstallment(idx: number) {
    setCommissionInstallments(is => is.filter((_, i) => i !== idx));
  }
  function updateInstallment(idx: number, field: string, value: string) {
    setCommissionInstallments(is => is.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  // ── Add Commission ───────────────────────────────────────────────
  async function handleAddCommission(e: React.FormEvent) {
    e.preventDefault();
    if (!commissionPlayerId) { setCommissionError("Please select a player."); return; }
    const hasEmpty = commissionInstallments.some(i => !i.description.trim() || !i.amountEur || !i.dueDate);
    if (hasEmpty) { setCommissionError("Please fill in all installment fields."); return; }
    setCommissionSaving(true); setCommissionError("");
    const res = await fetch("/api/agent/commissions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: commissionPlayerId,
        installments: commissionInstallments.map(i => ({
          description: i.description,
          amountCents: Math.round(parseFloat(i.amountEur) * 100),
          dueDate: i.dueDate,
          notes: i.notes,
        })),
      }),
    });
    const data = await res.json();
    setCommissionSaving(false);
    if (!res.ok) { setCommissionError(data.error ?? "Failed to save."); return; }
    const newItems: any[] = data.commissions ?? (data.commission ? [data.commission] : []);
    setCommissions(cs => [...cs, ...newItems]);
    setShowCommissionModal(false);
    setCommissionPlayerId("");
    setCommissionInstallments([{ description: "", amountEur: "", dueDate: "", notes: "" }]);
  }

  async function handleMarkPaid(id: string) {
    const res = await fetch(`/api/agent/commissions/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paidAt: new Date().toISOString() }),
    });
    const data = await res.json();
    if (res.ok) setCommissions(cs => cs.map(c => c.id === id ? data.commission : c));
  }

  async function handleDeleteCommission(id: string) {
    await fetch(`/api/agent/commissions/${id}`, { method: "DELETE" });
    setCommissions(cs => cs.filter(c => c.id !== id));
  }

  // ── Add Transfer ─────────────────────────────────────────────────
  async function handleAddTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferSaving(true); setTransferError("");

    let contractFileUrl: string | null = null;
    if (transferDocFile) {
      const fd = new FormData();
      fd.append("file", transferDocFile);
      const upRes = await fetch("/api/agent/upload", { method: "POST", body: fd });
      if (!upRes.ok) { setTransferError("File upload failed. Please try again."); setTransferSaving(false); return; }
      const upData = await upRes.json();
      contractFileUrl = upData.url ?? null;
    }

    const res = await fetch("/api/agent/transfers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: transferForm.playerId,
        fromClub: transferForm.fromClub,
        toClub: transferForm.toClub,
        transferDate: transferForm.transferDate,
        transferFeeCents: transferForm.transferFeeEur ? Math.round(parseFloat(transferForm.transferFeeEur) * 100) : null,
        salaryCents: transferForm.salaryEur ? Math.round(parseFloat(transferForm.salaryEur) * 100) : null,
        contractYears: transferForm.contractYears ? parseInt(transferForm.contractYears) : null,
        notes: transferForm.notes,
        contractFileUrl,
      }),
    });
    const data = await res.json();
    setTransferSaving(false);
    if (!res.ok) { setTransferError(data.error ?? "Failed to save."); return; }
    setTransfers(ts => [data.transfer, ...ts]);
    setShowTransferModal(false);
    setTransferForm({ playerId: "", fromClub: "", toClub: "", transferDate: "", transferFeeEur: "", salaryEur: "", contractYears: "", notes: "" });
    setTransferDocFile(null);
  }

  async function handleDeleteTransfer(id: string) {
    await fetch(`/api/agent/transfers/${id}`, { method: "DELETE" });
    setTransfers(ts => ts.filter(t => t.id !== id));
  }

  // ── Pitch ────────────────────────────────────────────────────────
  function togglePitchPlayer(id: string) {
    setPitchForm(f => ({
      ...f,
      selectedPlayerIds: f.selectedPlayerIds.includes(id)
        ? f.selectedPlayerIds.filter(x => x !== id)
        : [...f.selectedPlayerIds, id],
    }));
  }

  async function handleCreatePitch(e: React.FormEvent) {
    e.preventDefault();
    if (pitchForm.selectedPlayerIds.length === 0) { setPitchError("Select at least one player."); return; }
    setPitchSaving(true); setPitchError(""); setPitchMsg("");
    const res = await fetch("/api/agent/pitch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: pitchForm.title,
        playerIds: pitchForm.selectedPlayerIds,
        message: pitchForm.message,
        expiresAt: pitchForm.expiresAt || null,
      }),
    });
    const data = await res.json();
    setPitchSaving(false);
    if (!res.ok) { setPitchError(data.error ?? "Failed to create pitch."); return; }
    const enriched = {
      ...data.pitchDeck,
      players: players.filter(p => pitchForm.selectedPlayerIds.includes(p.id)),
    };
    setPitchDecks(ds => [enriched, ...ds]);
    setPitchForm({ title: "", selectedPlayerIds: [], message: "", expiresAt: "" });
    setPitchMsg("✓ Pitch deck created!");
    setTimeout(() => setPitchMsg(""), 3000);
  }

  async function handleDeletePitch(token: string) {
    await fetch(`/api/agent/pitch/${token}`, { method: "DELETE" });
    setPitchDecks(ds => ds.filter(d => d.token !== token));
  }

  async function copyPitchLink(token: string) {
    const url = `${window.location.origin}/pitch/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  // ── Settings ─────────────────────────────────────────────────────
  async function handleSettingsSave(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    await fetch("/api/agent/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
    });
    setSettingsSaving(false); setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  }

  return (
    <main className="page">
    <div className="sidebar-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)" }} />}

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Agent Dashboard</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", textTransform: "uppercase" }}>
            {agent.firstName} {agent.lastName}
          </div>
          {agent.country && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>📍 {agent.country}</div>}
        </div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <li key={item.id}>
              <a href="#" className={tab === item.id ? "active" : ""}
                onClick={e => { e.preventDefault(); switchTab(item.id); }}>
                <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                {item.label}
                {item.id === "players" && <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--muted)" }}>{players.length}</span>}
                {item.id === "contracts" && contracts.length > 0 && (
                  <span style={{ marginLeft: "auto", background: "rgba(232,255,71,0.2)", color: "var(--accent)", fontSize: "0.65rem", padding: "1px 6px", borderRadius: 2 }}>{contracts.length}</span>
                )}
                {item.id === "commissions" && stats.pendingCommissions > 0 && (
                  <span style={{ marginLeft: "auto", background: "rgba(232,255,71,0.2)", color: "var(--accent)", fontSize: "0.65rem", padding: "1px 6px", borderRadius: 2 }}>{stats.pendingCommissions}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <div className="main-content">
        {/* Mobile header */}
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? "✕ Close" : `☰ ${NAV_ITEMS.find(n => n.id === tab)?.label ?? "Menu"}`}
        </button>

        {/* ══════════════════ OVERVIEW ══════════════════ */}
        {tab === "overview" && (
          <div className="tab-content">
            {/* Overview header — NOT sticky so stats are always fully visible */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid rgba(245,243,238,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Overview</span>
                <span style={{ fontSize: "0.7rem", color: "rgba(107,107,107,0.5)" }}>·</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
                  {agent.firstName} {agent.lastName}
                </span>
              </div>
              <button
                onClick={() => { setAddForm({ firstName: "", lastName: "" }); setAddError(""); setShowAddModal(true); }}
                style={{ background: "none", border: "1px solid rgba(245,243,238,0.18)", color: "var(--muted)", borderRadius: "var(--radius)", padding: "5px 12px", fontSize: "0.72rem", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--white)"; e.currentTarget.style.borderColor = "rgba(245,243,238,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "rgba(245,243,238,0.18)"; }}
              >
                + Add Player
              </button>
            </div>

            {/* ── Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Players", val: stats.total, sub: "in roster", color: "var(--white)" },
                { label: "Available", val: stats.available, sub: "for transfer", color: stats.available > 0 ? "#00c864" : "var(--muted)" },
                { label: "Pending Commissions", val: stats.pendingCommissions, sub: "awaiting payment", color: stats.pendingCommissions > 0 ? "var(--accent)" : "var(--muted)" },
                { label: "Pending Value", val: fmtCents(stats.totalPendingCents), sub: "total outstanding", color: stats.totalPendingCents > 0 ? "var(--white)" : "var(--muted)" },
                { label: "Completed Payments", val: fmtCents(stats.totalPaidCents), sub: `${stats.paidCommissions} paid`, color: stats.paidCommissions > 0 ? "#00c864" : "var(--muted)" },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: "center", padding: "16px 12px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.6rem", color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(107,107,107,0.6)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Players Roster ── */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h4 style={{ textTransform: "uppercase", fontSize: "0.88rem", margin: 0 }}>
                  Players <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>({players.length})</span>
                </h4>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "5px 10px" }} onClick={() => switchTab("players")}>View All →</button>
                  <button className="btn btn-primary" style={{ fontSize: "0.72rem", padding: "5px 10px" }}
                    onClick={() => { setAddForm({ firstName: "", lastName: "" }); setAddError(""); setShowAddModal(true); }}>+ Add</button>
                </div>
              </div>
              {players.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                  No players yet. Add your first player to get started.
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {overviewPlayers.map((p: any) => {
                      const pc = contracts.filter(c => c.playerId === p.id);
                      const nc = pc[0];
                      const cd = nc?.endDate ? daysLeft(nc.endDate) : null;
                      const salaryText = p.expectedSalaryMin && p.expectedSalaryMax
                        ? `€${Math.round(p.expectedSalaryMin / 100).toLocaleString()} – €${Math.round(p.expectedSalaryMax / 100).toLocaleString()}/yr`
                        : p.expectedSalaryMin ? `from €${Math.round(p.expectedSalaryMin / 100).toLocaleString()}/yr`
                        : p.expectedSalaryMax ? `up to €${Math.round(p.expectedSalaryMax / 100).toLocaleString()}/yr`
                        : null;
                      return (
                        <div key={p.id}
                          style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px", display: "flex", gap: 10, alignItems: "flex-start", cursor: p.slug && p.onboardingCompleted ? "pointer" : "default", transition: "border-color 0.15s" }}
                          onClick={e => { if ((e.target as HTMLElement).closest("button,a")) return; if (p.slug && p.onboardingCompleted) window.open(`/players/${p.slug}`, "_blank"); }}
                          onMouseEnter={e => { if (p.slug && p.onboardingCompleted) e.currentTarget.style.borderColor = "rgba(232,255,71,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = ""; }}
                        >
                          <div style={{ flexShrink: 0, textAlign: "center" }}>
                            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--card)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", border: "1px solid var(--border)" }}>
                              {p.photoUrl ? <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                            </div>
                            {p.currentClub && (
                              <div style={{ fontSize: "0.52rem", color: "var(--muted)", marginTop: 3, maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.currentClub}>
                                {p.currentClub}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.82rem", textTransform: "uppercase", lineHeight: 1.2 }}>
                              {p.firstName} {p.lastName}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>
                              {posLabel(p.position)}{p.nationality && p.nationality !== "Unknown" ? ` · ${p.nationality}` : ""}
                            </div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5, alignItems: "center" }}>
                              <span className={`badge ${HEALTH_COLORS[p.healthStatus ?? "HEALTHY"]}`} style={{ fontSize: "0.55rem" }}>{p.healthStatus ?? "HEALTHY"}</span>
                              <span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`} style={{ fontSize: "0.55rem" }}>{p.isAvailable ? "Available" : "N/A"}</span>
                            </div>
                            {salaryText && (
                              <div style={{ fontSize: "0.6rem", color: "var(--accent)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{salaryText}</div>
                            )}
                            {cd !== null && (
                              <div style={{ fontSize: "0.62rem", marginTop: 3, color: cd < 0 ? "var(--muted)" : cd < 30 ? "var(--red)" : cd < 180 ? "var(--accent)" : "var(--muted)" }}>
                                {cd < 0 ? "Contract expired" : `Contract: ${cd}d left`}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                              {p.onboardingCompleted && p.verificationStatus !== "VERIFIED" && p.verificationStatus !== "PENDING" && (
                                <button className="btn btn-primary" style={{ fontSize: "0.55rem", padding: "3px 7px" }}
                                  onClick={e => { e.stopPropagation(); setVerifyPlayer({ id: p.id, name: `${p.firstName} ${p.lastName}`, status: p.verificationStatus }); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>
                                  🔐 Verify
                                </button>
                              )}
                              <Link href={`/dashboard/agent/player/${p.id}/edit`} style={{ fontSize: "0.6rem", color: "var(--muted)" }} onClick={e => e.stopPropagation()}>✏ Edit</Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {players.length > 5 && (
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", paddingTop: 12 }}>
                      +{players.length - 5} more · <button onClick={() => switchTab("players")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", padding: 0 }}>view all</button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Contracts + Commissions ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

              {/* Contracts */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.88rem", margin: 0 }}>
                    Contracts <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>({contracts.length})</span>
                  </h4>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => switchTab("contracts")}>All →</button>
                    <button className="btn btn-primary" style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                      onClick={() => { setContractForm({ playerId: "", clubName: "", startDate: "", endDate: "", salaryCents: "", bonusDetails: "", notes: "" }); setContractDocFile(null); setContractError(""); setShowContractModal(true); }}>+ Add</button>
                  </div>
                </div>
                {contracts.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem", textAlign: "center", padding: "20px 0" }}>No contracts recorded</div>
                ) : (
                  <div>
                    {contracts.slice(0, 7).map((c: any) => {
                      if (!c.endDate) return null;
                      const d = daysLeft(c.endDate);
                      const expired = d < 0;
                      return (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase" }}>
                              {c.player.firstName} {c.player.lastName}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{c.clubName}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: expired ? "var(--muted)" : d < 30 ? "var(--red)" : d < 180 ? "var(--accent)" : "#00c864" }}>
                              {expired ? "Expired" : `${d}d left`}
                            </div>
                            <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>{fmtDate(c.endDate)}</div>
                          </div>
                        </div>
                      );
                    })}
                    {contracts.length > 7 && (
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", paddingTop: 8 }}>
                        +{contracts.length - 7} more · <button onClick={() => switchTab("contracts")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", padding: 0 }}>view all</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Commissions */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.88rem", margin: 0 }}>
                    Commissions <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>({commissions.length})</span>
                  </h4>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => switchTab("commissions")}>All →</button>
                    <button className="btn btn-primary" style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                      onClick={() => { setCommissionPlayerId(""); setCommissionInstallments([{ description: "", amountEur: "", dueDate: "", notes: "" }]); setCommissionError(""); setShowCommissionModal(true); }}>+ Add</button>
                  </div>
                </div>
                {stats.totalPendingCents > 0 && (
                  <div style={{ padding: "8px 12px", background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.15)", borderRadius: "var(--radius)", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pending</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--accent)", fontSize: "1.1rem" }}>{fmtCents(stats.totalPendingCents)}</span>
                  </div>
                )}
                {commissions.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem", textAlign: "center", padding: "20px 0" }}>No commissions tracked</div>
                ) : (
                  <div>
                    {commissions.slice(0, 7).map((c: any) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase" }}>
                            {c.player.firstName} {c.player.lastName}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{fmtCents(c.amountCents)}</div>
                          <span className={`badge ${COMMISSION_STATUS_COLORS[c.status] ?? "badge-muted"}`} style={{ fontSize: "0.52rem" }}>{c.status}</span>
                        </div>
                      </div>
                    ))}
                    {commissions.length > 7 && (
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", paddingTop: 8 }}>
                        +{commissions.length - 7} more · <button onClick={() => switchTab("commissions")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", padding: 0 }}>view all</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Transfer History ── */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h4 style={{ textTransform: "uppercase", fontSize: "0.88rem", margin: 0 }}>
                  Transfer History <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>({transfers.length})</span>
                </h4>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => switchTab("transfers")}>All →</button>
                  <button className="btn btn-primary" style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                    onClick={() => { setTransferForm({ playerId: "", fromClub: "", toClub: "", transferDate: "", transferFeeEur: "", salaryEur: "", contractYears: "", notes: "" }); setTransferDocFile(null); setTransferError(""); setShowTransferModal(true); }}>+ Add</button>
                </div>
              </div>
              {transfers.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "0.82rem", textAlign: "center", padding: "20px 0" }}>No transfer records yet</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 0 }}>
                  {transfers.slice(0, 8).map((t: any) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase" }}>
                          {t.player.firstName} {t.player.lastName}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
                          {t.fromClub ? `${t.fromClub}` : "Free Agent"} → {t.toClub}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {t.transferFeeCents ? (
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{fmtCents(t.transferFeeCents)}</div>
                        ) : t.salaryCents ? (
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--muted)" }}>{fmtCents(t.salaryCents)}/mo</div>
                        ) : null}
                        <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>{fmtDate(t.transferDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {transfers.length > 8 && (
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", paddingTop: 10 }}>
                  +{transfers.length - 8} more · <button onClick={() => switchTab("transfers")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", padding: 0 }}>view all</button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══════════════════ PLAYERS ══════════════════ */}
        {tab === "players" && (
          <div className="tab-content">
            {/* ── Header row ── */}
            <div style={{ ...STICKY_HEADER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                  Players <span style={{ color: "var(--muted)", fontWeight: 400 }}>({filteredPlayers.length}{filteredPlayers.length !== players.length ? `/${players.length}` : ""})</span>
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ display: "flex", border: "1px solid rgba(245,243,238,0.12)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                    {(["list", "grid"] as const).map(m => (
                      <button key={m} onClick={() => setViewMode(m)} style={{
                        padding: "5px 12px", background: viewMode === m ? "var(--accent)" : "transparent",
                        color: viewMode === m ? "var(--black)" : "var(--muted)", border: "none", cursor: "pointer",
                        fontFamily: "var(--font-display)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
                      }}>{m === "list" ? "☰" : "⊞"}</button>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={() => { setAddForm({ firstName: "", lastName: "" }); setAddError(""); setShowAddModal(true); }}>+ Add Player</button>
                </div>
              </div>
              {/* ── Filter bar ── */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
                  placeholder="Search by name…"
                  style={{ flex: "1 1 160px", minWidth: 130, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.78rem", color: "var(--white)", outline: "none", fontFamily: "var(--font-mono)" }}
                />
                <select
                  value={filterPosition} onChange={e => setFilterPosition(e.target.value)}
                  style={{ flex: "0 0 auto", background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.78rem", color: filterPosition ? "var(--white)" : "var(--muted)", outline: "none", cursor: "pointer" }}
                >
                  <option value="">All Positions</option>
                  {POSITIONS.map(pos => <option key={pos} value={pos}>{posLabel(pos)}</option>)}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", whiteSpace: "nowrap" }}>Salary €/yr</span>
                  <input
                    value={filterSalaryMin} onChange={e => setFilterSalaryMin(e.target.value)}
                    placeholder="Min" type="number" min="0"
                    style={{ width: 72, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: "0.78rem", color: "var(--white)", outline: "none", fontFamily: "var(--font-mono)" }}
                  />
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>—</span>
                  <input
                    value={filterSalaryMax} onChange={e => setFilterSalaryMax(e.target.value)}
                    placeholder="Max" type="number" min="0"
                    style={{ width: 72, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: "0.78rem", color: "var(--white)", outline: "none", fontFamily: "var(--font-mono)" }}
                  />
                </div>
                {(playerSearch || filterPosition || filterSalaryMin || filterSalaryMax) && (
                  <button onClick={() => { setPlayerSearch(""); setFilterPosition(""); setFilterSalaryMin(""); setFilterSalaryMax(""); }}
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: "0.7rem", color: "var(--muted)", cursor: "pointer" }}>
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            {players.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>👥</div>
                <h4 style={{ marginBottom: 8 }}>No Players Yet</h4>
                <p style={{ color: "var(--muted)", marginBottom: 24 }}>Add your first player to start managing their career.</p>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add First Player</button>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--muted)" }}>
                No players match your filters. <button onClick={() => { setPlayerSearch(""); setFilterPosition(""); setFilterSalaryMin(""); setFilterSalaryMax(""); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "inherit" }}>Clear filters</button>
              </div>
            ) : viewMode === "list" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredPlayers.map((p: any) => (
                  <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", cursor: p.slug && p.onboardingCompleted ? "pointer" : "default", transition: "border-color 0.15s" }}
                    onClick={e => { if ((e.target as HTMLElement).closest("button,a,[data-share-dropdown]")) return; if (p.slug && p.onboardingCompleted) window.open(`/players/${p.slug}`, "_blank"); }}
                    onMouseEnter={e => { if (p.slug && p.onboardingCompleted) e.currentTarget.style.borderColor = "rgba(232,255,71,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = ""; }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--card2)", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                      {p.photoUrl ? <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase" }}>
                        {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                        {posLabel(p.position)} · {p.nationality === "Unknown" ? "—" : (p.nationality ?? "—")}
                        {p.currentClub && ` · ${p.currentClub}`}
                        {p.heightCm && ` · ${p.heightCm}cm`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span className={`badge ${HEALTH_COLORS[p.healthStatus ?? "HEALTHY"]}`}>{p.healthStatus ?? "HEALTHY"}</span>
                      <span className={`badge ${VERIF_COLORS[p.verificationStatus]}`}>{p.verificationStatus}</span>
                      <span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`}>{p.isAvailable ? "Available" : "Unavailable"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {!p.onboardingCompleted ? (
                        <Link href={`/onboarding/agent-player/${p.id}`} className="btn btn-primary" style={{ fontSize: "0.72rem", padding: "5px 10px" }}>Continue Setup →</Link>
                      ) : (
                        <>
                          {/* Share button */}
                          {p.slug && (
                            <div style={{ position: "relative" }} data-share-dropdown>
                              <button className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "5px 10px" }}
                                onClick={e => { e.stopPropagation(); setShareOpenFor(shareOpenFor === p.id ? null : p.id); }}>
                                ↗ Share
                              </button>
                              {shareOpenFor === p.id && (() => {
                                const s = getShareLinks(p);
                                return (
                                  <div data-share-dropdown style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 200, overflow: "hidden" }}>
                                    <button onClick={e => { e.stopPropagation(); s.copy(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", borderBottom: "1px solid var(--border)", padding: "10px 14px", fontSize: "0.8rem", color: "var(--white)", cursor: "pointer", textAlign: "left" }}>
                                      {copiedShare ? "✅ Copied!" : "🔗 Copy Link"}
                                    </button>
                                    {[
                                      { icon: "💬", label: "WhatsApp", href: s.whatsapp },
                                      { icon: "📱", label: "Viber", href: s.viber },
                                    ].map(item => (
                                      <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: "0.8rem", color: "var(--white)", borderBottom: "1px solid var(--border)", textDecoration: "none" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "var(--card2)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        {item.icon} {item.label}
                                      </a>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {p.verificationStatus !== "VERIFIED" && p.verificationStatus !== "PENDING" && (
                            <button className="btn btn-primary" style={{ fontSize: "0.72rem", padding: "5px 10px" }}
                              onClick={e => { e.stopPropagation(); setVerifyPlayer({ id: p.id, name: `${p.firstName} ${p.lastName}`, status: p.verificationStatus }); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>
                              🔐 Verify
                            </button>
                          )}
                        </>
                      )}
                      <Link href={`/dashboard/agent/player/${p.id}/edit`} className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "5px 10px" }} onClick={e => e.stopPropagation()}>✏️ Edit</Link>
                      <button className="btn btn-danger" style={{ fontSize: "0.72rem", padding: "5px 8px" }} onClick={e => { e.stopPropagation(); setConfirmDelete({ id: p.id, name: `${p.firstName} ${p.lastName}` }); }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {filteredPlayers.map((p: any) => {
                  const playerContracts = contracts.filter(c => c.playerId === p.id);
                  const nextContract = playerContracts[0];
                  const contractDays = nextContract ? daysLeft(nextContract.endDate) : null;
                  return (
                    <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden", cursor: p.slug && p.onboardingCompleted ? "pointer" : "default", transition: "border-color 0.15s" }}
                      onClick={e => { if ((e.target as HTMLElement).closest("button,a,[data-share-dropdown]")) return; if (p.slug && p.onboardingCompleted) window.open(`/players/${p.slug}`, "_blank"); }}
                      onMouseEnter={e => { if (p.slug && p.onboardingCompleted) e.currentTarget.style.borderColor = "rgba(232,255,71,0.3)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = ""; }}
                    >
                      <div style={{ height: 120, background: "var(--card2)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "3rem" }}>👤</span>
                        )}
                        <div style={{ position: "absolute", top: 8, right: 8 }}>
                          <span className={`badge ${HEALTH_COLORS[p.healthStatus ?? "HEALTHY"]}`} style={{ fontSize: "0.6rem" }}>{p.healthStatus ?? "HEALTHY"}</span>
                        </div>
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase", marginBottom: 4 }}>{p.firstName} {p.lastName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 8 }}>
                          {posLabel(p.position)} · {p.nationality === "Unknown" ? "—" : (p.nationality ?? "—")}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                          <span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`} style={{ fontSize: "0.58rem" }}>{p.isAvailable ? "Available" : "N/A"}</span>
                        </div>
                        {(() => {
                          const sal = p.expectedSalaryMin && p.expectedSalaryMax
                            ? `€${Math.round(p.expectedSalaryMin/100).toLocaleString()} – €${Math.round(p.expectedSalaryMax/100).toLocaleString()}/yr`
                            : p.expectedSalaryMin ? `from €${Math.round(p.expectedSalaryMin/100).toLocaleString()}/yr`
                            : p.expectedSalaryMax ? `up to €${Math.round(p.expectedSalaryMax/100).toLocaleString()}/yr`
                            : null;
                          return sal ? <div style={{ fontSize: "0.68rem", color: "var(--accent)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>{sal}</div> : <div style={{ marginBottom: 8 }} />;
                        })()}
                        {contractDays !== null && (
                          <div style={{ fontSize: "0.72rem", color: contractDays < 30 ? "var(--red)" : contractDays < 180 ? "var(--accent)" : "var(--muted)", marginBottom: 10 }}>
                            📄 Contract: {contractDays}d left
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {p.onboardingCompleted && p.verificationStatus !== "VERIFIED" && p.verificationStatus !== "PENDING" && (
                            <button className="btn btn-primary" style={{ fontSize: "0.62rem", padding: "3px 7px" }}
                              onClick={e => { e.stopPropagation(); setVerifyPlayer({ id: p.id, name: `${p.firstName} ${p.lastName}`, status: p.verificationStatus }); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>
                              🔐 Verify
                            </button>
                          )}
                          <Link href={`/dashboard/agent/player/${p.id}/edit`} className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 8px", flex: 1, justifyContent: "center" }} onClick={e => e.stopPropagation()}>✏️ Edit</Link>
                          {p.slug && (
                            <div style={{ position: "relative" }} data-share-dropdown>
                              <button className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 8px" }}
                                onClick={e => { e.stopPropagation(); setShareOpenFor(shareOpenFor === p.id ? null : p.id); }}>
                                ↗ Share
                              </button>
                              {shareOpenFor === p.id && (() => {
                                const s = getShareLinks(p);
                                return (
                                  <div data-share-dropdown style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 200, overflow: "hidden" }}>
                                    <button onClick={e => { e.stopPropagation(); s.copy(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", borderBottom: "1px solid var(--border)", padding: "10px 14px", fontSize: "0.8rem", color: "var(--white)", cursor: "pointer", textAlign: "left" }}>
                                      {copiedShare ? "✅ Copied!" : "🔗 Copy Link"}
                                    </button>
                                    {[
                                      { icon: "💬", label: "WhatsApp", href: s.whatsapp },
                                      { icon: "📱", label: "Viber", href: s.viber },
                                    ].map(item => (
                                      <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: "0.8rem", color: "var(--white)", borderBottom: "1px solid var(--border)", textDecoration: "none" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "var(--card2)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        {item.icon} {item.label}
                                      </a>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          <button className="btn btn-danger" style={{ fontSize: "0.68rem", padding: "4px 6px" }} onClick={e => { e.stopPropagation(); setConfirmDelete({ id: p.id, name: `${p.firstName} ${p.lastName}` }); }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ CONTRACTS ══════════════════ */}
        {tab === "contracts" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Contracts <span style={{ color: "var(--muted)", fontWeight: 400 }}>({contracts.length})</span>
              </span>
              <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={() => { setContractForm({ playerId: "", clubName: "", startDate: "", endDate: "", salaryCents: "", bonusDetails: "", notes: "" }); setContractDocFile(null); setContractError(""); setShowContractModal(true); }}>+ Add Contract</button>
            </div>

            {contracts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📄</div>
                <p>No contracts yet. Add a contract to track player club agreements.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Club</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Days Left</th>
                      <th>Salary/mo</th>
                      <th>Status</th>
                      <th>File</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c: any) => {
                      const days = daysLeft(c.endDate);
                      const expired = days < 0;
                      return (
                        <tr key={c.id} style={{ background: expired ? "rgba(255,59,59,0.04)" : contractRowColor(days) }}>
                          <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                            {c.player.firstName} {c.player.lastName}
                          </td>
                          <td>{c.clubName}</td>
                          <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{fmtDate(c.startDate)}</td>
                          <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{fmtDate(c.endDate)}</td>
                          <td>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: expired ? "var(--red)" : days < 30 ? "var(--red)" : days < 180 ? "var(--accent)" : "#00c864" }}>
                              {expired ? `Expired ${Math.abs(days)}d ago` : `${days}d`}
                            </span>
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{fmtCents(c.salaryCents)}</td>
                          <td>
                            <span className={`badge ${expired ? "badge-red" : days < 180 ? "badge-accent" : "badge-green"}`} style={{ fontSize: "0.6rem" }}>
                              {expired ? "EXPIRED" : days < 30 ? "CRITICAL" : days < 180 ? "EXPIRING" : "ACTIVE"}
                            </span>
                          </td>
                          <td>
                            {c.contractFileUrl
                              ? <a href={c.contractFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>📄 View</a>
                              : <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>—</span>}
                          </td>
                          <td>
                            <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => handleDeleteContract(c.id)}>🗑</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ COMMISSIONS ══════════════════ */}
        {tab === "commissions" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Commissions <span style={{ color: "var(--muted)", fontWeight: 400 }}>({commissions.length})</span>
              </span>
              <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={() => { setCommissionPlayerId(""); setCommissionInstallments([{ description: "", amountEur: "", dueDate: "", notes: "" }]); setCommissionError(""); setShowCommissionModal(true); }}>+ Add Commission</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Commissions", val: commissions.length, sub: "all time", color: "var(--white)" },
                { label: "Pending Commissions", val: stats.pendingCommissions, sub: "awaiting payment", color: stats.pendingCommissions > 0 ? "var(--accent)" : "var(--muted)" },
                { label: "Pending Payments", val: fmtCents(stats.totalPendingCents), sub: "total outstanding", color: stats.totalPendingCents > 0 ? "var(--accent)" : "var(--muted)" },
                { label: "Completed Payments", val: fmtCents(stats.totalPaidCents), sub: `${stats.paidCommissions} paid`, color: stats.paidCommissions > 0 ? "#00c864" : "var(--muted)" },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: "center", padding: "16px 12px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.6rem", color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(107,107,107,0.6)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {commissions.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>💰</div>
                <p>No commissions tracked yet.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c: any) => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                          {c.player.firstName} {c.player.lastName}
                        </td>
                        <td style={{ fontSize: "0.85rem" }}>{c.description}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{fmtCents(c.amountCents)}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{fmtDate(c.dueDate)}</td>
                        <td>
                          <span className={`badge ${COMMISSION_STATUS_COLORS[c.status] ?? "badge-muted"}`} style={{ fontSize: "0.6rem" }}>{c.status}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            {c.status === "PENDING" && (
                              <button className="btn btn-primary" style={{ fontSize: "0.68rem", padding: "4px 8px" }} onClick={() => handleMarkPaid(c.id)}>✓ Mark Paid</button>
                            )}
                            <button className="btn btn-danger" style={{ fontSize: "0.68rem", padding: "4px 6px" }} onClick={() => handleDeleteCommission(c.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TRANSFERS ══════════════════ */}
        {tab === "transfers" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Transfers <span style={{ color: "var(--muted)", fontWeight: 400 }}>({transfers.length})</span>
              </span>
              <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={() => { setTransferForm({ playerId: "", fromClub: "", toClub: "", transferDate: "", transferFeeEur: "", salaryEur: "", contractYears: "", notes: "" }); setTransferDocFile(null); setTransferError(""); setShowTransferModal(true); }}>+ Add Transfer</button>
            </div>

            {transfers.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔄</div>
                <p>No transfer records yet.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Date</th>
                      <th>Fee</th>
                      <th>Salary/mo</th>
                      <th>Years</th>
                      <th>File</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t: any) => (
                      <tr key={t.id}>
                        <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                          {t.player.firstName} {t.player.lastName}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{t.fromClub ?? "Free Agent"}</td>
                        <td style={{ fontSize: "0.85rem" }}>{t.toClub}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{fmtDate(t.transferDate)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{fmtCents(t.transferFeeCents)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{fmtCents(t.salaryCents)}</td>
                        <td style={{ fontSize: "0.82rem" }}>{t.contractYears ?? "—"}</td>
                        <td>
                          {t.contractFileUrl
                            ? <a href={t.contractFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>📄 View</a>
                            : <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>—</span>}
                        </td>
                        <td>
                          <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => handleDeleteTransfer(t.id)}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ PITCH GENERATOR ══════════════════ */}
        {tab === "pitch" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER, display: "flex", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Pitch Generator</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
              {/* Create form */}
              <div className="card">
                <h4 style={{ textTransform: "uppercase", marginBottom: 20, fontSize: "0.9rem" }}>Create New Pitch</h4>
                <form onSubmit={handleCreatePitch}>
                  <div className="form-group">
                    <label className="label">Pitch Title</label>
                    <input className="input" value={pitchForm.title} onChange={e => setPitchForm(f => ({ ...f, title: e.target.value }))} placeholder="Top Goalkeepers 2026" />
                  </div>

                  <div className="form-group">
                    <label className="label">Select Players <span style={{ color: "var(--accent)" }}>*</span></label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 10 }}>
                      {players.filter(p => p.onboardingCompleted).map((p: any) => (
                        <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}>
                          <input type="checkbox" checked={pitchForm.selectedPlayerIds.includes(p.id)} onChange={() => togglePitchPlayer(p.id)} />
                          <span style={{ fontSize: "0.85rem" }}>{p.firstName} {p.lastName}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>· {posLabel(p.position)}</span>
                        </label>
                      ))}
                      {players.filter(p => p.onboardingCompleted).length === 0 && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", textAlign: "center", padding: "8px 0" }}>No completed player profiles yet</div>
                      )}
                    </div>
                    {pitchForm.selectedPlayerIds.length > 0 && (
                      <div style={{ fontSize: "0.75rem", color: "var(--accent)", marginTop: 4 }}>{pitchForm.selectedPlayerIds.length} player(s) selected</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="label">Message (optional)</label>
                    <textarea className="input" rows={3} value={pitchForm.message} onChange={e => setPitchForm(f => ({ ...f, message: e.target.value }))} placeholder="Introduction message for the receiving club…" style={{ resize: "vertical" }} />
                  </div>

                  <div className="form-group">
                    <label className="label">Expires At (optional)</label>
                    <input className="input" type="date" value={pitchForm.expiresAt} onChange={e => setPitchForm(f => ({ ...f, expiresAt: e.target.value }))} />
                  </div>

                  {pitchError && <div style={{ fontSize: "0.82rem", color: "var(--red)", marginBottom: 12 }}>{pitchError}</div>}
                  {pitchMsg && <div style={{ fontSize: "0.82rem", color: "#00c864", marginBottom: 12 }}>{pitchMsg}</div>}

                  <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }} disabled={pitchSaving}>
                    {pitchSaving ? <><span className="spinner" /> Creating…</> : "🚀 Generate Pitch Link"}
                  </button>
                </form>
              </div>

              {/* Existing pitch decks */}
              <div>
                <h4 style={{ textTransform: "uppercase", fontSize: "0.9rem", marginBottom: 16 }}>Your Pitch Links ({pitchDecks.length})</h4>
                {pitchDecks.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", fontSize: "0.85rem" }}>
                    No pitch links yet. Create your first one.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pitchDecks.map((d: any) => {
                      const pitchUrl = typeof window !== "undefined" ? `${window.location.origin}/pitch/${d.token}` : `/pitch/${d.token}`;
                      const playerCount = d.players?.length ?? JSON.parse(d.playerIds).length;
                      return (
                        <div key={d.id} className="card" style={{ padding: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", textTransform: "uppercase" }}>{d.title}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                                {playerCount} player(s) · {d.views} views · {fmtDate(d.createdAt)}
                              </div>
                            </div>
                            <button className="btn btn-danger" style={{ fontSize: "0.68rem", padding: "4px 8px" }} onClick={() => handleDeletePitch(d.token)}>🗑</button>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <div style={{ flex: 1, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--muted)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                              /pitch/{d.token}
                            </div>
                            <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "5px 10px", flexShrink: 0 }} onClick={() => copyPitchLink(d.token)}>
                              {copiedToken === d.token ? "✓ Copied!" : "Copy Link"}
                            </button>
                            <Link href={`/pitch/${d.token}`} target="_blank" className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "5px 10px", flexShrink: 0 }}>
                              Preview ↗
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ SETTINGS ══════════════════ */}
        {tab === "settings" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER, display: "flex", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Settings</span>
            </div>
            <div className="card" style={{ maxWidth: 560 }}>
              <form onSubmit={handleSettingsSave}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">First Name</label>
                    <input className="input" value={settings.firstName} onChange={e => setSettings(s => ({ ...s, firstName: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Last Name</label>
                    <input className="input" value={settings.lastName} onChange={e => setSettings(s => ({ ...s, lastName: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="label">Country</label>
                  <select className="input" value={settings.country} onChange={e => setSettings(s => ({ ...s, country: e.target.value }))}>
                    <option value="">Select…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input className="input" value={settings.phone} onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Website</label>
                  <input className="input" value={settings.website} onChange={e => setSettings(s => ({ ...s, website: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">License Number</label>
                  <input className="input" value={settings.licenseNumber} onChange={e => setSettings(s => ({ ...s, licenseNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Bio</label>
                  <textarea className="input" rows={3} value={settings.bio} onChange={e => setSettings(s => ({ ...s, bio: e.target.value }))} style={{ resize: "vertical" }} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={settingsSaving} style={{ justifyContent: "center" }}>
                  {settingsSaving ? <><span className="spinner" /> Saving…</> : settingsSaved ? "✓ Saved!" : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════ MODALS ══════════════════ */}

      {/* Add Player */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Add Player</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20 }}>Enter the player&apos;s name. You&apos;ll complete the full profile in the setup wizard.</p>
            <form onSubmit={handleAddPlayer}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">First Name <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Ivan" autoFocus />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Last Name <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Petrović" />
                </div>
              </div>
              {addError && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{addError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={addSaving}>
                  {addSaving ? <><span className="spinner" /> Creating…</> : "Create & Setup Profile →"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Player Confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h4 style={{ textTransform: "uppercase", marginBottom: 8, color: "var(--red)" }}>⚠ Remove Player</h4>
            <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: 20 }}>
              Remove <strong style={{ color: "var(--white)" }}>{confirmDelete.name}</strong> from your roster? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={handleDelete} disabled={deleting}>
                {deleting ? <><span className="spinner" /> Removing…</> : "🗑 Remove"}
              </button>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Player */}
      {verifyPlayer && (
        <div className="modal-overlay" onClick={() => { setVerifyPlayer(null); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>🔐 Verify Player</h3>
              <button onClick={() => { setVerifyPlayer(null); setDocFile(null); setContractFile(null); setVerifyMsg(""); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase", marginBottom: 12 }}>{verifyPlayer.name}</div>
            <form onSubmit={handleVerifySubmit}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>Player Identity Document *</div>
                <div style={{ background: "var(--card2)", border: `2px dashed ${docFile ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "16px", textAlign: "center", cursor: "pointer" }} onClick={() => docInputRef.current?.click()}>
                  <input ref={docInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setDocFile(f); }} />
                  {docFile ? <div style={{ fontSize: "0.85rem" }}>✓ {docFile.name}</div> : <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>🪪 Click to upload passport or ID card</div>}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>Signed Agent-Player Contract *</div>
                <div style={{ background: "var(--card2)", border: `2px dashed ${contractFile ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "16px", textAlign: "center", cursor: "pointer" }} onClick={() => contractInputRef.current?.click()}>
                  <input ref={contractInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setContractFile(f); }} />
                  {contractFile ? <div style={{ fontSize: "0.85rem" }}>✓ {contractFile.name}</div> : <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>📄 Click to upload signed contract</div>}
                </div>
              </div>
              {verifyMsg && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{verifyMsg}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={verifying}>
                  {verifying ? <><span className="spinner" /> Submitting…</> : "Submit for Verification"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setVerifyPlayer(null); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contract Modal */}
      {showContractModal && (
        <div className="modal-overlay" onClick={() => setShowContractModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Add Contract</h3>
              <button onClick={() => setShowContractModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddContract}>
              <div className="form-group">
                <label className="label">Player <span style={{ color: "var(--accent)" }}>*</span></label>
                <select className="input" value={contractForm.playerId} onChange={e => setContractForm(f => ({ ...f, playerId: e.target.value }))}>
                  <option value="">Select player…</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Club Name <span style={{ color: "var(--accent)" }}>*</span></label>
                <input className="input" value={contractForm.clubName} onChange={e => setContractForm(f => ({ ...f, clubName: e.target.value }))} placeholder="RK Zagreb" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Start Date <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" type="date" value={contractForm.startDate} onChange={e => setContractForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">End Date <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" type="date" value={contractForm.endDate} onChange={e => setContractForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Monthly Salary (€)</label>
                <input className="input" type="number" value={contractForm.salaryCents} onChange={e => setContractForm(f => ({ ...f, salaryCents: e.target.value }))} placeholder="3000" />
              </div>
              <div className="form-group">
                <label className="label">Contract File <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional — PDF, Excel, image)</span></label>
                <input ref={contractDocRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv" style={{ display: "none" }} onChange={e => setContractDocFile(e.target.files?.[0] ?? null)} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button type="button" className="btn btn-outline" style={{ fontSize: "0.82rem" }} onClick={() => contractDocRef.current?.click()}>📎 Choose File</button>
                  <span style={{ fontSize: "0.78rem", color: contractDocFile ? "#00c864" : "var(--muted)" }}>
                    {contractDocFile ? `✓ ${contractDocFile.name}` : "No file chosen"}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={contractForm.notes} onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              {contractError && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{contractError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={contractSaving}>
                  {contractSaving ? <><span className="spinner" /> Saving…</> : "Add Contract"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowContractModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Commission Modal — multi-installment */}
      {showCommissionModal && (
        <div className="modal-overlay" onClick={() => setShowCommissionModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Add Commission</h3>
              <button onClick={() => setShowCommissionModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddCommission}>
              <div className="form-group">
                <label className="label">Player <span style={{ color: "var(--accent)" }}>*</span></label>
                <select className="input" value={commissionPlayerId} onChange={e => setCommissionPlayerId(e.target.value)}>
                  <option value="">Select player…</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <label className="label" style={{ margin: 0 }}>
                    Installments <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <button type="button" className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "4px 10px" }} onClick={addInstallment}>
                    + Add Installment
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {commissionInstallments.map((inst, idx) => (
                    <div key={idx} style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--accent)", textTransform: "uppercase" }}>
                          Installment {idx + 1}
                        </span>
                        {commissionInstallments.length > 1 && (
                          <button type="button" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }} onClick={() => removeInstallment(idx)}>✕</button>
                        )}
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="label" style={{ fontSize: "0.72rem" }}>Description <span style={{ color: "var(--accent)" }}>*</span></label>
                        <input className="input" style={{ fontSize: "0.85rem", padding: "8px 12px" }} value={inst.description} onChange={e => updateInstallment(idx, "description", e.target.value)} placeholder="Transfer commission – RK Zagreb" />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="label" style={{ fontSize: "0.72rem" }}>Amount (€) <span style={{ color: "var(--accent)" }}>*</span></label>
                          <input className="input" type="number" style={{ fontSize: "0.85rem", padding: "8px 12px" }} value={inst.amountEur} onChange={e => updateInstallment(idx, "amountEur", e.target.value)} placeholder="5000" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="label" style={{ fontSize: "0.72rem" }}>Due Date <span style={{ color: "var(--accent)" }}>*</span></label>
                          <input className="input" type="date" style={{ fontSize: "0.85rem", padding: "8px 12px" }} value={inst.dueDate} onChange={e => updateInstallment(idx, "dueDate", e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label" style={{ fontSize: "0.72rem" }}>Notes</label>
                        <input className="input" style={{ fontSize: "0.85rem", padding: "8px 12px" }} value={inst.notes} onChange={e => updateInstallment(idx, "notes", e.target.value)} placeholder="Optional note…" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {commissionInstallments.length > 1 && (
                <div style={{ padding: "10px 14px", borderRadius: "var(--radius)", background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.15)", fontSize: "0.8rem", color: "var(--muted)", marginBottom: 16 }}>
                  Total: <strong style={{ color: "var(--accent)" }}>{fmtCents(commissionInstallments.reduce((s, i) => s + (parseFloat(i.amountEur || "0") * 100), 0))}</strong> across {commissionInstallments.length} installments
                </div>
              )}

              {commissionError && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{commissionError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={commissionSaving}>
                  {commissionSaving ? <><span className="spinner" /> Saving…</> : `Add ${commissionInstallments.length > 1 ? `${commissionInstallments.length} Installments` : "Commission"}`}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowCommissionModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Add Transfer Record</h3>
              <button onClick={() => setShowTransferModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAddTransfer}>
              <div className="form-group">
                <label className="label">Player <span style={{ color: "var(--accent)" }}>*</span></label>
                <select className="input" value={transferForm.playerId} onChange={e => setTransferForm(f => ({ ...f, playerId: e.target.value }))}>
                  <option value="">Select player…</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">From Club</label>
                  <input className="input" value={transferForm.fromClub} onChange={e => setTransferForm(f => ({ ...f, fromClub: e.target.value }))} placeholder="Leave empty if free agent" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">To Club <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" value={transferForm.toClub} onChange={e => setTransferForm(f => ({ ...f, toClub: e.target.value }))} placeholder="RK Zagreb" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Transfer Date <span style={{ color: "var(--accent)" }}>*</span></label>
                <input className="input" type="date" value={transferForm.transferDate} onChange={e => setTransferForm(f => ({ ...f, transferDate: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Transfer Fee (€)</label>
                  <input className="input" type="number" value={transferForm.transferFeeEur} onChange={e => setTransferForm(f => ({ ...f, transferFeeEur: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Monthly Salary (€)</label>
                  <input className="input" type="number" value={transferForm.salaryEur} onChange={e => setTransferForm(f => ({ ...f, salaryEur: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Contract Years</label>
                  <input className="input" type="number" value={transferForm.contractYears} onChange={e => setTransferForm(f => ({ ...f, contractYears: e.target.value }))} placeholder="2" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Contract File <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional — PDF, Excel, image)</span></label>
                <input ref={transferDocRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv" style={{ display: "none" }} onChange={e => setTransferDocFile(e.target.files?.[0] ?? null)} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button type="button" className="btn btn-outline" style={{ fontSize: "0.82rem" }} onClick={() => transferDocRef.current?.click()}>📎 Choose File</button>
                  <span style={{ fontSize: "0.78rem", color: transferDocFile ? "#00c864" : "var(--muted)" }}>
                    {transferDocFile ? `✓ ${transferDocFile.name}` : "No file chosen"}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              {transferError && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{transferError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={transferSaving}>
                  {transferSaving ? <><span className="spinner" /> Saving…</> : "Add Transfer"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowTransferModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </main>
  );
}
