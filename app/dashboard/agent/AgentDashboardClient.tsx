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
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

// ── DD/MM/YYYY date picker ────────────────────────────────────────
// value is YYYY-MM-DD string (or ""); onChange emits YYYY-MM-DD or ""
// Uses local state so user can fill fields independently before all are complete
function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parse = (v: string) => {
    if (!v) return { d: "", m: "", y: "" };
    const p = v.split("-");
    return { d: p[2] ?? "", m: p[1] ?? "", y: p[0] ?? "" };
  };

  const [fields, setFields] = useState(() => parse(value));

  // Sync when parent changes value externally (e.g. auto-fill)
  useEffect(() => { setFields(parse(value)); }, [value]);

  const update = (d: string, m: string, y: string) => {
    setFields({ d, m, y });
    if (d && m && y && y.length === 4) {
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const inp: React.CSSProperties = { textAlign: "center", padding: "10px 6px", fontSize: "0.9rem" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 4 }}>
      <input className="input" type="number" min={1} max={31}   placeholder="DD"   value={fields.d} style={inp} onChange={e => update(e.target.value, fields.m, fields.y)} />
      <input className="input" type="number" min={1} max={12}   placeholder="MM"   value={fields.m} style={inp} onChange={e => update(fields.d, e.target.value, fields.y)} />
      <input className="input" type="number" min={2020} max={2060} placeholder="YYYY" value={fields.y} style={inp} onChange={e => update(fields.d, fields.m, e.target.value)} />
    </div>
  );
}

function contractRowColor(days: number): string {
  if (days < 0)  return "rgba(255,59,59,0.08)";
  if (days < 30) return "rgba(255,59,59,0.06)";
  if (days < 60) return "rgba(255,140,0,0.05)";
  if (days < 90) return "rgba(232,255,71,0.04)";
  return "transparent";
}

function contractStatusLabel(days: number): string {
  if (days < 0)  return "EXPIRED";
  if (days < 30) return "CRITICAL";
  if (days < 60) return "WARNING";
  if (days < 90) return "EXPIRING";
  return "ACTIVE";
}

function contractStatusColor(days: number): string {
  if (days < 0)  return "var(--red)";
  if (days < 30) return "var(--red)";
  if (days < 60) return "#ff8c00";
  if (days < 90) return "var(--accent)";
  return "#00c864";
}

function overdueLevel(dueDateStr: string | null | undefined): { days: number; label: string; color: string; bg: string } {
  if (!dueDateStr) return { days: -1, label: "", color: "", bg: "" };
  const d = Math.floor((Date.now() - new Date(dueDateStr).getTime()) / 86400000);
  if (d < 0)  return { days: d, label: "", color: "", bg: "" };
  if (d >= 60) return { days: d, label: `OVERDUE ${d}d`, color: "#ff4444", bg: "rgba(255,59,59,0.12)" };
  if (d >= 30) return { days: d, label: `OVERDUE ${d}d`, color: "var(--red)", bg: "rgba(255,59,59,0.08)" };
  if (d >= 7)  return { days: d, label: `OVERDUE ${d}d`, color: "#ff8c00", bg: "rgba(255,140,0,0.07)" };
  return { days: d, label: "OVERDUE", color: "var(--accent)", bg: "rgba(232,255,71,0.06)" };
}

function getAge(dob: string | Date | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  return String(Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

type Tab = "overview" | "players" | "contracts" | "commissions" | "transfers" | "pitch" | "calendar" | "cloud" | "statistics" | "messages" | "settings";

const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "overview",     icon: "⊞",  label: "Overview" },
  { id: "players",      icon: "👥", label: "Players" },
  { id: "transfers",    icon: "🔄", label: "Transfers" },
  { id: "contracts",    icon: "📄", label: "Contracts" },
  { id: "commissions",  icon: "💰", label: "Commissions" },
  { id: "pitch",        icon: "🚀", label: "Pitch Generator" },
  { id: "calendar",     icon: "📅", label: "Calendar" },
  { id: "cloud",        icon: "☁️", label: "Cloud" },
  { id: "statistics",   icon: "📊", label: "Statistics" },
  { id: "messages",     icon: "💬", label: "Messages" },
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

// ── Toast notification system ────────────────────────────────────
type Toast = { id: number; msg: string; type: "success" | "error" };
let _toastId = 0;

export default function AgentDashboardClient({ agent, adminView = false }: { agent: any; adminView?: boolean }) {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>(searchParams.get("tab") as Tab ?? "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [players, setPlayers] = useState<any[]>(agent.players ?? []);
  const [contracts, setContracts] = useState<any[]>(agent.contracts ?? []);
  const [commissions, setCommissions] = useState<any[]>(agent.commissions ?? []);
  const [transfers, setTransfers] = useState<any[]>(agent.transfers ?? []);
  const [pitchDecks, setPitchDecks] = useState<any[]>(agent.pitchDecks ?? []);
  const [cloudFiles, setCloudFiles] = useState<any[]>(agent.cloudFiles ?? []);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  function showToast(msg: string, type: "success" | "error" = "success") {
    const id = ++_toastId;
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500);
  }

  // Search filters for list tabs
  const [contractSearch, setContractSearch] = useState("");
  const [commissionSearch, setCommissionSearch] = useState("");
  const [transferSearch, setTransferSearch] = useState("");

  // Cloud storage state
  const [cloudSearch, setCloudSearch] = useState("");
  const [cloudCategory, setCloudCategory] = useState<"all" | "image" | "document" | "other">("all");
  const [cloudViewMode, setCloudViewMode] = useState<"grid" | "list">("grid");
  const [cloudUploading, setCloudUploading] = useState(false);
  const [cloudUploadError, setCloudUploadError] = useState("");
  const [cloudDragOver, setCloudDragOver] = useState(false);
  const cloudInputRef = useRef<HTMLInputElement>(null);
  const rosterScrollRef = useRef<HTMLDivElement>(null);
  const [cloudRenameId, setCloudRenameId] = useState<string | null>(null);
  const [cloudRenameName, setCloudRenameName] = useState("");
  const [calendarEvents, setCalendarEvents] = useState<any[]>(agent.calendarEvents ?? []);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Detail modal (for transfer/commission/contract rows)
  const [detailModal, setDetailModal] = useState<{ type: "transfer" | "commission" | "contract"; item: any } | null>(null);

  // Calendar planner state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", hour: "09", minute: "00", description: "" });
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState("");

  // Sync tab when URL changes (nav-bar links like ?tab=settings)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setTab(t as Tab);
  }, [searchParams]);

  function switchTab(id: Tab) {
    setTab(id);
    setSidebarOpen(false);
  }

  // Listen for sidebar toggle fired by the Nav button on mobile
  useEffect(() => {
    const handler = () => setSidebarOpen(o => !o);
    window.addEventListener("agent-sidebar-toggle", handler);
    return () => window.removeEventListener("agent-sidebar-toggle", handler);
  }, []);

  // Unread messages count
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    if (adminView) return;
    fetch("/api/messages/unread-count").then(r => r.json()).then(d => { if (typeof d.count === "number") setUnreadMessages(d.count); }).catch(() => {});
    const id = setInterval(() => {
      fetch("/api/messages/unread-count").then(r => r.json()).then(d => { if (typeof d.count === "number") setUnreadMessages(d.count); }).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── In-app notifications ─────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (adminView) return; // admin viewing — skip agent-role API calls
    try {
      const stored = localStorage.getItem("hh_dismissed_notifs");
      if (stored) setDismissedIds(new Set(JSON.parse(stored)));
    } catch {}
    const load = () => fetch("/api/agent/notifications").then(r => r.json()).then(d => { if (d.notifications) setNotifications(d.notifications); }).catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  function dismissNotification(id: string) {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem("hh_dismissed_notifs", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function dismissAll() {
    const ids = notifications.map(n => n.id);
    setDismissedIds(prev => {
      const next = new Set([...prev, ...ids]);
      try { localStorage.setItem("hh_dismissed_notifs", JSON.stringify([...next])); } catch {}
      return next;
    });
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

  // Delete confirm (player / contract / commission / transfer)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; type: "player" | "contract" | "commission" | "transfer" } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mark Paid modal
  const [markPaidModal, setMarkPaidModal] = useState<{ id: string; playerName: string } | null>(null);
  const [markPaidDate, setMarkPaidDate] = useState("");

  // Escape key — close topmost open modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (cloudRenameId) { setCloudRenameId(null); setCloudRenameName(""); return; }
      if (markPaidModal) { setMarkPaidModal(null); return; }
      if (confirmDelete) { setConfirmDelete(null); return; }
      if (detailModal) { setDetailModal(null); return; }
      if (showEventModal) { setShowEventModal(false); return; }
      if (notifOpen) { setNotifOpen(false); return; }
      if (showTransferModal) { setShowTransferModal(false); return; }
      if (showContractModal) { setShowContractModal(false); return; }
      if (showCommissionModal) { setShowCommissionModal(false); return; }
      if (showAddModal) { setShowAddModal(false); return; }
      if (editContract) { setEditContract(null); return; }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // Players sub-tab: "roster" | "free" | "requests"
  const [playersSubTab, setPlayersSubTab] = useState<"roster" | "free" | "requests">("roster");

  // Free agents scouting
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [freeAgentsLoading, setFreeAgentsLoading] = useState(false);
  const [freeAgentsLoaded, setFreeAgentsLoaded] = useState(false);
  const [faSearch, setFaSearch] = useState("");
  const [faFilterPos, setFaFilterPos] = useState("");
  const [faRequestMsg, setFaRequestMsg] = useState<Record<string, string>>({});
  const [faRequestInput, setFaRequestInput] = useState<Record<string, string>>({});
  const [faRequestingId, setFaRequestingId] = useState<string | null>(null);
  const [faShowMsgFor, setFaShowMsgFor] = useState<string | null>(null);

  // Sent representation requests
  const [repRequests, setRepRequests] = useState<any[]>([]);
  const [repRequestsLoading, setRepRequestsLoading] = useState(false);
  const [repRequestsLoaded, setRepRequestsLoaded] = useState(false);

  useEffect(() => {
    if (playersSubTab === "free" && !freeAgentsLoaded) {
      setFreeAgentsLoading(true);
      fetch("/api/agent/free-agents")
        .then(r => r.json())
        .then(d => { if (d.players) setFreeAgents(d.players); setFreeAgentsLoaded(true); })
        .catch(() => {})
        .finally(() => setFreeAgentsLoading(false));
    }
    if (playersSubTab === "requests" && !repRequestsLoaded) {
      setRepRequestsLoading(true);
      fetch("/api/agent/representation-requests")
        .then(r => r.json())
        .then(d => { if (d.requests) setRepRequests(d.requests); setRepRequestsLoaded(true); })
        .catch(() => {})
        .finally(() => setRepRequestsLoading(false));
    }
  }, [playersSubTab, freeAgentsLoaded, repRequestsLoaded]);

  async function sendRepRequest(playerId: string) {
    setFaRequestingId(playerId);
    const msg = faRequestInput[playerId] ?? "";
    const res = await fetch(`/api/agent/free-agents/${playerId}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();
    setFaRequestingId(null);
    setFaShowMsgFor(null);
    if (res.ok) {
      setFaRequestMsg(prev => ({ ...prev, [playerId]: "✓ Request sent!" }));
      setFreeAgents(prev => prev.map(p => p.id === playerId ? { ...p, requestStatus: "PENDING", requestId: data.request?.id } : p));
    } else {
      setFaRequestMsg(prev => ({ ...prev, [playerId]: "✕ " + (data.error ?? "Failed") }));
    }
  }

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

  // Edit contract modal
  const [editContract, setEditContract] = useState<any | null>(null);
  const [editContractForm, setEditContractForm] = useState({ clubName: "", startDate: "", endDate: "", salaryCents: "", bonusDetails: "", notes: "" });
  const [editContractSaving, setEditContractSaving] = useState(false);
  const [editContractError, setEditContractError] = useState("");

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
  const [transferForm, setTransferForm] = useState({ playerId: "", fromClub: "", toClub: "", transferDate: "", salaryEur: "", salaryMonths: "", contractStartDate: "", contractEndDate: "", commissionEur: "", commissionDueDate: "", commissionDescription: "", notes: "" });
  const [transferDocFile, setTransferDocFile] = useState<File | null>(null);
  const transferDocRef = useRef<HTMLInputElement>(null);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState("");

  // Health modal
  const [healthModal, setHealthModal] = useState<any | null>(null);
  const [healthForm, setHealthForm] = useState({ healthStatus: "HEALTHY", rehabNote: "", rehabReturnDate: "" });
  const [healthSaving, setHealthSaving] = useState(false);
  const [healthError, setHealthError] = useState("");

  // Notes modal
  const [notesModal, setNotesModal] = useState<any | null>(null);
  const [notesList, setNotesList] = useState<any[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);

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

  // Avatar upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(agent.photoUrl ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Contract view toggle ─────────────────────────────────────────
  const [contractView, setContractView] = useState<"table" | "gantt">("table");

  // ── Table sort state ─────────────────────────────────────────────
  const [contractSort, setContractSort] = useState({ key: "createdAt", dir: "desc" as "asc" | "desc" });
  const [commissionSort, setCommissionSort] = useState({ key: "createdAt", dir: "desc" as "asc" | "desc" });
  const [transferSort, setTransferSort] = useState({ key: "createdAt", dir: "desc" as "asc" | "desc" });

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
  const overviewPlayers = players;

  // ── Filtered players (Players tab) ──────────────────────────────
  const filteredPlayers = players.filter(p => {
    if (playerSearch) {
      const q = playerSearch.toLowerCase();
      if (!`${p.firstName} ${p.lastName}`.toLowerCase().includes(q)) return false;
    }
    if (filterPosition && p.position !== filterPosition) return false;
    if (filterSalaryMin) {
      const minCents = parseFloat(filterSalaryMin) * 100;
      const salHigh = p.expectedSalaryMax ?? p.expectedSalaryMin ?? 0;
      if (salHigh < minCents) return false;
    }
    if (filterSalaryMax) {
      const maxCents = parseFloat(filterSalaryMax) * 100;
      const salLow = p.expectedSalaryMin ?? p.expectedSalaryMax ?? 0;
      if (salLow > maxCents) return false;
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

  // ── Delete (player / contract / commission / transfer / cloud) ───
  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const { id, type } = confirmDelete;
    if (type === "player") {
      await fetch(`/api/agent/players/${id}`, { method: "DELETE" });
      setPlayers(ps => ps.filter(p => p.id !== id));
    } else if (type === "contract") {
      await fetch(`/api/agent/contracts/${id}`, { method: "DELETE" });
      setContracts(cs => cs.filter(c => c.id !== id));
    } else if (type === "commission") {
      await fetch(`/api/agent/commissions/${id}`, { method: "DELETE" });
      setCommissions(cs => cs.filter(c => c.id !== id));
    } else if (type === "transfer") {
      await fetch(`/api/agent/transfers/${id}`, { method: "DELETE" });
      setTransfers(ts => ts.filter(t => t.id !== id));
    } else if ((type as string) === "cloud") {
      await fetch(`/api/agent/cloud/${id}`, { method: "DELETE" });
      setCloudFiles(cf => cf.filter(f => f.id !== id));
    }
    setDeleting(false);
    setConfirmDelete(null);
    showToast("Deleted successfully");
  }

  // ── Add Contract ─────────────────────────────────────────────────
  async function handleAddContract(e: React.FormEvent) {
    e.preventDefault();
    setContractError("");
    if (contractForm.startDate && contractForm.endDate && contractForm.startDate >= contractForm.endDate) {
      setContractError("End date must be after start date."); return;
    }
    setContractSaving(true);

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
    showToast("Contract added successfully");
  }

  function handleDeleteContract(id: string, name: string) {
    setConfirmDelete({ id, name, type: "contract" });
  }

  async function handleEditContractSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editContract) return;
    setEditContractError("");
    if (editContractForm.startDate && editContractForm.endDate && editContractForm.startDate >= editContractForm.endDate) {
      setEditContractError("End date must be after start date."); return;
    }
    setEditContractSaving(true);
    const res = await fetch(`/api/agent/contracts/${editContract.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clubName: editContractForm.clubName,
        startDate: editContractForm.startDate,
        endDate: editContractForm.endDate,
        salaryCents: editContractForm.salaryCents ? Math.round(parseFloat(editContractForm.salaryCents) * 100) : null,
        bonusDetails: editContractForm.bonusDetails,
        notes: editContractForm.notes,
        contractFileUrl: editContract.contractFileUrl ?? null,
      }),
    });
    const data = await res.json();
    setEditContractSaving(false);
    if (!res.ok) { setEditContractError(data.error ?? "Failed to save."); return; }
    setContracts(cs => cs.map(c => c.id === editContract.id ? data.contract : c));
    setEditContract(null);
    showToast("Contract updated");
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
    showToast(`${newItems.length > 1 ? `${newItems.length} commissions` : "Commission"} added`);
  }

  async function handleMarkPaidConfirm() {
    if (!markPaidModal) return;
    const paidAt = markPaidDate ? new Date(markPaidDate).toISOString() : new Date().toISOString();
    const res = await fetch(`/api/agent/commissions/${markPaidModal.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paidAt }),
    });
    const data = await res.json();
    if (res.ok) { setCommissions(cs => cs.map(c => c.id === markPaidModal.id ? data.commission : c)); showToast("Commission marked as paid ✓"); }
    setMarkPaidModal(null);
    setMarkPaidDate("");
  }

  function handleDeleteCommission(id: string, description: string) {
    setConfirmDelete({ id, name: description, type: "commission" });
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
        salaryCents: transferForm.salaryEur ? Math.round(parseFloat(transferForm.salaryEur) * 100) : null,
        contractStartDate: transferForm.contractStartDate || null,
        contractEndDate: transferForm.contractEndDate || null,
        commissionAmountCents: transferForm.commissionEur ? Math.round(parseFloat(transferForm.commissionEur) * 100) : null,
        commissionDueDate: transferForm.commissionDueDate || null,
        commissionDescription: transferForm.commissionDescription || null,
        notes: transferForm.notes,
        contractFileUrl,
      }),
    });
    const data = await res.json();
    setTransferSaving(false);
    if (!res.ok) { setTransferError(data.error ?? "Failed to save."); return; }
    setTransfers(ts => [data.transfer, ...ts]);
    // Auto-append linked commission to commissions list
    if (data.commission) setCommissions(cs => [data.commission, ...cs]);
    // Auto-append linked contract to contracts list
    if (data.contract) setContracts(cs => [...cs, data.contract].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()));
    setShowTransferModal(false);
    setTransferForm({ playerId: "", fromClub: "", toClub: "", transferDate: "", salaryEur: "", salaryMonths: "", contractStartDate: "", contractEndDate: "", commissionEur: "", commissionDueDate: "", commissionDescription: "", notes: "" });
    setTransferDocFile(null);
    showToast("Transfer recorded" + (data.commission ? " · Commission created" : "") + (data.contract ? " · Contract created" : ""));
  }

  function handleDeleteTransfer(id: string, name: string) {
    setConfirmDelete({ id, name, type: "transfer" });
  }

  // ── Calendar events ─────────────────────────────────────────────
  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDay || !eventForm.title.trim()) return;
    setEventSaving(true); setEventError("");
    const eventAt = new Date(selectedDay);
    eventAt.setHours(parseInt(eventForm.hour), parseInt(eventForm.minute), 0, 0);
    const res = await fetch("/api/agent/calendar-events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: eventForm.title, description: eventForm.description, eventAt: eventAt.toISOString() }),
    });
    const data = await res.json();
    setEventSaving(false);
    if (!res.ok) { setEventError(data.error ?? "Failed to save."); return; }
    setCalendarEvents(evs => [...evs, data.event].sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime()));
    setShowEventModal(false);
    setEventForm({ title: "", hour: "09", minute: "00", description: "" });
  }

  async function handleDeleteEvent(id: string) {
    await fetch(`/api/agent/calendar-events/${id}`, { method: "DELETE" });
    setCalendarEvents(evs => evs.filter(e => e.id !== id));
  }

  async function handleHealthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!healthModal) return;
    setHealthSaving(true); setHealthError("");
    const res = await fetch(`/api/agent/health/${healthModal.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthStatus: healthForm.healthStatus, rehabNote: healthForm.rehabNote || null, rehabReturnDate: healthForm.rehabReturnDate || null }),
    });
    const data = await res.json();
    setHealthSaving(false);
    if (!res.ok) { setHealthError(data.error ?? "Failed to update."); return; }
    setPlayers(ps => ps.map(p => p.id === healthModal.id ? { ...p, healthStatus: data.player.healthStatus, rehabNote: data.player.rehabNote, rehabReturnDate: data.player.rehabReturnDate } : p));
    setHealthModal(null);
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

  // ── Cloud Storage ────────────────────────────────────────────────
  async function handleCloudUpload(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setCloudUploading(true);
    setCloudUploadError("");
    let failed = 0;
    for (const file of arr) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/agent/cloud", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setCloudFiles(cf => [data.file, ...cf]);
      } else {
        failed++;
        setCloudUploadError(data.error ?? "Upload failed");
      }
    }
    setCloudUploading(false);
    if (failed === 0) showToast(`${arr.length > 1 ? `${arr.length} files` : "File"} uploaded`);
  }

  async function handleCloudDelete(id: string) {
    const res = await fetch(`/api/agent/cloud/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCloudFiles(cf => cf.filter(f => f.id !== id));
      showToast("File deleted");
    }
  }

  async function handleCloudRename(id: string) {
    if (!cloudRenameName.trim()) return;
    const res = await fetch(`/api/agent/cloud/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cloudRenameName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setCloudFiles(cf => cf.map(f => f.id === id ? data.file : f));
      showToast("Renamed");
    }
    setCloudRenameId(null);
    setCloudRenameName("");
  }

  function fmtBytes(bytes: number | null | undefined): string {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function cloudFileIcon(mimeType: string | null): string {
    if (!mimeType) return "📁";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.includes("word") || mimeType === "application/msword") return "📝";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📋";
    if (mimeType === "text/plain") return "📃";
    if (mimeType === "text/csv") return "📊";
    if (mimeType.includes("zip") || mimeType.includes("rar")) return "🗜️";
    return "📁";
  }

  const [editPitch, setEditPitch] = useState<any | null>(null);
  const [editPitchPlayerIds, setEditPitchPlayerIds] = useState<string[]>([]);
  const [editPitchSaving, setEditPitchSaving] = useState(false);
  const [editPitchError, setEditPitchError] = useState("");

  async function handleEditPitchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPitch || editPitchPlayerIds.length === 0) { setEditPitchError("Select at least one player."); return; }
    setEditPitchSaving(true); setEditPitchError("");
    const res = await fetch(`/api/agent/pitch/${editPitch.token}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerIds: editPitchPlayerIds }),
    });
    const data = await res.json();
    setEditPitchSaving(false);
    if (!res.ok) { setEditPitchError(data.error ?? "Failed to update."); return; }
    setPitchDecks(ds => ds.map(d => d.token === editPitch.token
      ? { ...d, playerIds: JSON.stringify(editPitchPlayerIds), players: players.filter(p => editPitchPlayerIds.includes(p.id)) }
      : d));
    setEditPitch(null);
  }

  async function copyPitchLink(token: string) {
    const url = `${window.location.origin}/pitch/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  // ── Settings ─────────────────────────────────────────────────────
  async function openNotesModal(p: any) {
    setNotesModal(p); setNoteContent(""); setNoteCategory("general"); setNotesList([]);
    setNotesLoading(true);
    const res = await fetch(`/api/agent/notes?playerId=${p.id}`).catch(() => null);
    setNotesLoading(false);
    if (res?.ok) { const d = await res.json(); setNotesList(d.notes ?? []); }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!notesModal || !noteContent.trim()) return;
    setNotesSaving(true);
    const res = await fetch("/api/agent/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: notesModal.id, content: noteContent.trim(), category: noteCategory }),
    });
    const data = await res.json();
    setNotesSaving(false);
    if (res.ok) { setNotesList(ns => [data.note, ...ns]); setNoteContent(""); }
  }

  async function handleDeleteNote(id: string) {
    await fetch(`/api/agent/notes/${id}`, { method: "DELETE" });
    setNotesList(ns => ns.filter(n => n.id !== id));
  }

  async function handleAvatarUpload(file: File) {
    setAvatarUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const upRes = await fetch("/api/agent/upload", { method: "POST", body: fd });
    if (!upRes.ok) { setAvatarUploading(false); return; }
    const { url } = await upRes.json();
    await fetch("/api/agent/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photoUrl: url }) });
    setAvatarUrl(url);
    setAvatarUploading(false);
  }

  function exportPlayersCSV() {
    const headers = ["Name", "Position", "Nationality", "Age", "Height (cm)", "Weight (kg)", "Club", "Available", "Health", "Verified", "Salary Min €/yr", "Salary Max €/yr"];
    const rows = players.map(p => [
      `${p.firstName} ${p.lastName}`,
      posLabel(p.position),
      p.nationality ?? "",
      getAge(p.dateOfBirth),
      p.heightCm ?? "",
      p.weightKg ?? "",
      p.currentClub ?? "Free Agent",
      p.isAvailable ? "Yes" : "No",
      p.healthStatus ?? "HEALTHY",
      p.verificationStatus ?? "UNVERIFIED",
      p.expectedSalaryMin ? Math.round(p.expectedSalaryMin / 100) : "",
      p.expectedSalaryMax ? Math.round(p.expectedSalaryMax / 100) : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "roster.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function sortItems<T>(arr: T[], key: string, dir: "asc" | "desc"): T[] {
    return [...arr].sort((a: any, b: any) => {
      let av = a[key], bv = b[key];
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === "string" && !isNaN(Date.parse(av))) { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  function SortIcon({ current, k }: { current: { key: string; dir: "asc" | "desc" }; k: string }) {
    if (current.key !== k) return <span style={{ color: "rgba(107,107,107,0.4)", fontSize: "0.6rem", marginLeft: 3 }}>⇅</span>;
    return <span style={{ color: "var(--accent)", fontSize: "0.6rem", marginLeft: 3 }}>{current.dir === "asc" ? "↑" : "↓"}</span>;
  }


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
      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 199, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Agent Dashboard</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", textTransform: "uppercase" }}>
                {agent.firstName} {agent.lastName}
              </div>
              {agent.country && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>📍 {agent.country}</div>}
            </div>
            {/* Notification bell */}
            {(() => {
              const unread = notifications.filter(n => !dismissedIds.has(n.id));
              return (
                <button onClick={() => setNotifOpen(o => !o)} style={{ position: "relative", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 8px", cursor: "pointer", color: unread.length > 0 ? "var(--accent)" : "var(--muted)", fontSize: "1rem", flexShrink: 0 }}>
                  🔔
                  {unread.length > 0 && (
                    <span style={{ position: "absolute", top: -5, right: -5, background: "var(--red)", color: "#fff", fontSize: "0.55rem", fontWeight: 700, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>
                      {unread.length > 9 ? "9+" : unread.length}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
        </div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <>
              <li key={item.id}>
                <a href="#" className={tab === item.id ? "active" : ""}
                  onClick={e => { e.preventDefault(); switchTab(item.id); setSidebarOpen(false); }}>
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                  {item.label}
                  {item.id === "players" && <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--muted)" }}>{players.length}</span>}
                  {item.id === "contracts" && contracts.length > 0 && (
                    <span style={{ marginLeft: "auto", background: "rgba(232,255,71,0.2)", color: "var(--accent)", fontSize: "0.65rem", padding: "1px 6px", borderRadius: 2 }}>{contracts.length}</span>
                  )}
                  {item.id === "commissions" && stats.pendingCommissions > 0 && (
                    <span style={{ marginLeft: "auto", background: "rgba(232,255,71,0.2)", color: "var(--accent)", fontSize: "0.65rem", padding: "1px 6px", borderRadius: 2 }}>{stats.pendingCommissions}</span>
                  )}
                  {item.id === "messages" && unreadMessages > 0 && (
                    <span style={{ marginLeft: "auto", background: "rgba(255,59,59,0.25)", color: "var(--red)", fontSize: "0.65rem", padding: "1px 6px", borderRadius: 2 }}>{unreadMessages > 99 ? "99+" : unreadMessages}</span>
                  )}
                </a>
              </li>
              {/* Free Players sub-link right below Players */}
              {item.id === "players" && (
                <li key="free-players-link">
                  <button
                    onClick={() => { switchTab("players"); setPlayersSubTab("free"); setSidebarOpen(false); }}
                    style={{ paddingLeft: 36, fontSize: "0.8rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}>
                    <span style={{ fontSize: "0.85rem" }}>🆓</span>
                    Free Players
                  </button>
                </li>
              )}
            </>
          ))}
        </ul>
      </aside>

      <div className="main-content">

        {/* ══════════════════ OVERVIEW ══════════════════ */}
        {tab === "overview" && (
          <div className="tab-content">
            {/* Overview header — NOT sticky so stats are always fully visible */}
            <div className="agent-overview-header">
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
            <div className="agent-stats-grid">
              {[
                { label: "Total Players", val: stats.total, sub: "in roster", color: "var(--white)", goto: "players" as Tab },
                { label: "Total Transfers", val: transfers.length, sub: "all time", color: transfers.length > 0 ? "var(--accent)" : "var(--muted)", goto: "transfers" as Tab },
                { label: "Pending Value", val: fmtCents(stats.totalPendingCents), sub: "total outstanding", color: stats.totalPendingCents > 0 ? "var(--white)" : "var(--muted)", goto: "commissions" as Tab },
                { label: "Completed Payments", val: fmtCents(stats.totalPaidCents), sub: `${stats.paidCommissions} paid`, color: stats.paidCommissions > 0 ? "#00c864" : "var(--muted)", goto: "commissions" as Tab },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: "center", padding: "16px 12px", cursor: "pointer", transition: "border-color 0.15s" }}
                  onClick={() => switchTab(s.goto)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,255,71,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ""; }}
                >
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.6rem", color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(107,107,107,0.6)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Alerts are shown only in the notification bell panel — not on Overview */}

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
                  {/* Slider wrapper */}
                  <div className="roster-slider-wrap">
                    {/* Left arrow */}
                    {players.length > 1 && (
                      <button className="slider-arrow"
                        onClick={() => rosterScrollRef.current?.scrollBy({ left: -234, behavior: "smooth" })}
                        style={{ position: "absolute", left: -14, top: "50%", transform: "translateY(-50%)", zIndex: 2, width: 32, height: 32, borderRadius: "50%", background: "var(--card2)", border: "1px solid var(--border)", color: "var(--fg)", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", padding: 0, lineHeight: 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ""; (e.currentTarget as HTMLElement).style.color = ""; }}
                      >‹</button>
                    )}
                    {/* Scroll container */}
                    <div ref={rosterScrollRef} style={{ display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory", scrollBehavior: "smooth", paddingBottom: 4, msOverflowStyle: "none" }}
                      className="roster-slider">
                    {overviewPlayers.map((p: any) => {
                      const pc = contracts.filter(c => c.playerId === p.id);
                      const nc = pc[0];
                      const cd = nc?.endDate ? daysLeft(nc.endDate) : null;
                      const salaryText = p.expectedSalaryMin && p.expectedSalaryMax
                        ? `€${Math.round(p.expectedSalaryMin / 100).toLocaleString()} – €${Math.round(p.expectedSalaryMax / 100).toLocaleString()}/yr`
                        : p.expectedSalaryMin ? `from €${Math.round(p.expectedSalaryMin / 100).toLocaleString()}/yr`
                        : p.expectedSalaryMax ? `up to €${Math.round(p.expectedSalaryMax / 100).toLocaleString()}/yr`
                        : null;
                      const age = getAge(p.dateOfBirth);
                      const healthColor = ({ HEALTHY: "#00c864", INJURED: "var(--red)", REHAB: "#ff8c00", SUSPENDED: "var(--muted)" } as Record<string, string>)[p.healthStatus ?? "HEALTHY"] ?? "#00c864";
                      return (
                        <div key={p.id}
                          style={{ minWidth: 220, flex: "0 0 220px", scrollSnapAlign: "start", background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", display: "flex", flexDirection: "column", cursor: p.slug && p.onboardingCompleted ? "pointer" : "default", transition: "border-color 0.18s, transform 0.18s", position: "relative" }}
                          onClick={e => { if ((e.target as HTMLElement).closest("button,a")) return; if (p.slug && p.onboardingCompleted) window.open(`/players/${p.slug}`, "_blank"); }}
                          onMouseEnter={e => { if (p.slug && p.onboardingCompleted) { e.currentTarget.style.borderColor = "rgba(232,255,71,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.transform = ""; }}
                        >
                          {/* Photo area */}
                          <div style={{ position: "relative", height: 160, background: "var(--card)", overflow: "hidden", flexShrink: 0 }}>
                            {p.photoUrl
                              ? <img src={p.photoUrl} alt={p.firstName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
                              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", opacity: 0.3 }}>👤</div>
                            }
                            {/* Gradient overlay at bottom */}
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(9,9,9,0.85) 0%, rgba(9,9,9,0.1) 55%, transparent 100%)" }} />
                            {/* Position pill — top left */}
                            <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(232,255,71,0.92)", color: "#000", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 3 }}>
                              {posLabel(p.position)}
                            </div>
                            {/* Health dot — top right */}
                            <div style={{ position: "absolute", top: 9, right: 9, width: 9, height: 9, borderRadius: "50%", background: healthColor, boxShadow: `0 0 6px ${healthColor}` }} title={p.healthStatus ?? "HEALTHY"} />
                            {/* Name overlay — bottom */}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 12px 8px" }}>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "0.95rem", textTransform: "uppercase", lineHeight: 1.15, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                                {p.firstName}
                              </div>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "0.95rem", textTransform: "uppercase", lineHeight: 1.1, color: "var(--accent)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                                {p.lastName}
                              </div>
                            </div>
                          </div>

                          {/* Info body */}
                          <div style={{ padding: "12px 12px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                            {/* Nationality + age */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                                {p.nationality && p.nationality !== "Unknown" ? p.nationality : "—"}
                              </span>
                              {age !== "—" && <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--muted)" }}>{age} yrs</span>}
                            </div>

                            {/* Current club */}
                            {p.currentClub && (
                              <div style={{ fontSize: "0.72rem", color: "rgba(245,243,238,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.currentClub}>
                                🏟 {p.currentClub}
                              </div>
                            )}

                            {/* Salary */}
                            {salaryText && (
                              <div style={{ fontSize: "0.68rem", color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{salaryText}</div>
                            )}

                            {/* Status badges */}
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              <span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`} style={{ fontSize: "0.58rem" }}>{p.isAvailable ? "● Available" : "N/A"}</span>
                              {(p.healthStatus && p.healthStatus !== "HEALTHY") && (
                                <span className={`badge ${HEALTH_COLORS[p.healthStatus]}`} style={{ fontSize: "0.58rem" }}>{p.healthStatus}</span>
                              )}
                              {p.verificationStatus === "VERIFIED" && <span className="badge badge-green" style={{ fontSize: "0.58rem" }}>✓ Verified</span>}
                            </div>

                            {/* Contract days left */}
                            {cd !== null && (
                              <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: cd < 0 ? "rgba(107,107,107,0.6)" : cd < 30 ? "var(--red)" : cd < 180 ? "var(--accent)" : "#00c864", display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ opacity: 0.6 }}>📄</span>
                                {cd < 0 ? "Contract expired" : `${cd}d contract left`}
                              </div>
                            )}
                          </div>

                          {/* Footer actions */}
                          <div style={{ padding: "8px 12px 10px", borderTop: "1px solid var(--border)", display: "flex", gap: 6, alignItems: "center" }}>
                            {p.onboardingCompleted && p.verificationStatus !== "VERIFIED" && p.verificationStatus !== "PENDING" && (
                              <button className="btn btn-primary" style={{ fontSize: "0.62rem", padding: "4px 8px", flex: 1, justifyContent: "center" }}
                                onClick={e => { e.stopPropagation(); setVerifyPlayer({ id: p.id, name: `${p.firstName} ${p.lastName}`, status: p.verificationStatus }); setDocFile(null); setContractFile(null); setVerifyMsg(""); }}>
                                🔐 Verify
                              </button>
                            )}
                            <Link href={`/dashboard/agent/player/${p.id}/edit`}
                              className="btn btn-outline"
                              style={{ fontSize: "0.62rem", padding: "4px 8px", flex: 1, justifyContent: "center", textDecoration: "none" }}
                              onClick={e => e.stopPropagation()}>
                              ✏ Edit
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    {/* Right arrow */}
                    {players.length > 1 && (
                      <button className="slider-arrow"
                        onClick={() => rosterScrollRef.current?.scrollBy({ left: 234, behavior: "smooth" })}
                        style={{ position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)", zIndex: 2, width: 32, height: 32, borderRadius: "50%", background: "var(--card2)", border: "1px solid var(--border)", color: "var(--fg)", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", padding: 0, lineHeight: 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ""; (e.currentTarget as HTMLElement).style.color = ""; }}
                      >›</button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Transfer History ── */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h4 style={{ textTransform: "uppercase", fontSize: "0.88rem", margin: 0 }}>
                  Transfer History <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>({transfers.length})</span>
                </h4>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => switchTab("transfers")}>All →</button>
                  <button className="btn btn-primary" style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                    onClick={() => { setTransferForm({ playerId: "", fromClub: "", toClub: "", transferDate: "", salaryEur: "", salaryMonths: "", contractStartDate: "", contractEndDate: "", commissionEur: "", commissionDueDate: "", commissionDescription: "", notes: "" }); setTransferDocFile(null); setTransferError(""); setShowTransferModal(true); }}>+ Add</button>
                </div>
              </div>
              {transfers.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "0.82rem", textAlign: "center", padding: "20px 0" }}>No transfer records yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {[...transfers].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8).map((t: any, i, arr) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(232,255,71,0.08)", border: "1px solid rgba(232,255,71,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>🔄</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.player.firstName} {t.player.lastName}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                          <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.fromClub || "Free Agent"}</span>
                          <span style={{ color: "var(--accent)", fontSize: "0.65rem" }}>→</span>
                          <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.toClub}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {t.salaryCents ? (
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)" }}>{fmtCents(t.salaryCents)}<span style={{ color: "var(--muted)", fontSize: "0.65rem" }}>/mo</span></div>
                        ) : null}
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 2 }}>{fmtDate(t.transferDate)}</div>
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

            {/* ── Contracts + Commissions ── */}
            <div className="agent-2col">

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
                    {[...contracts].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 7).map((c: any) => {
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
                    {[...commissions].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 7).map((c: any) => {
                      const od = c.status === "PENDING" ? overdueLevel(c.dueDate) : { days: -1, label: "", color: "", bg: "" };
                      const isOverdue = od.days >= 0;
                      return (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)", background: isOverdue ? od.bg : "transparent" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase" }}>
                              {c.player.firstName} {c.player.lastName}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{fmtCents(c.amountCents)}</div>
                            {isOverdue ? (
                              <span style={{ fontSize: "0.52rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: od.color, textTransform: "uppercase" }}>{od.label}</span>
                            ) : (
                              <span className={`badge ${COMMISSION_STATUS_COLORS[c.status] ?? "badge-muted"}`} style={{ fontSize: "0.52rem" }}>{c.status}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {commissions.length > 7 && (
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", paddingTop: 8 }}>
                        +{commissions.length - 7} more · <button onClick={() => switchTab("commissions")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", padding: 0 }}>view all</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Income Chart ── */}
            {commissions.filter((c: any) => c.status === "PAID").length > 0 && (() => {
              const months: { label: string; cents: number }[] = [];
              for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
                const y = d.getFullYear(); const m = d.getMonth();
                const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
                const cents = commissions
                  .filter((c: any) => c.status === "PAID" && c.paidAt)
                  .filter((c: any) => { const pd = new Date(c.paidAt); return pd.getFullYear() === y && pd.getMonth() === m; })
                  .reduce((s: number, c: any) => s + (c.amountCents ?? 0), 0);
                months.push({ label, cents });
              }
              const maxCents = Math.max(...months.map(m => m.cents), 1);
              return (
                <div className="card" style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ textTransform: "uppercase", fontSize: "0.88rem", margin: 0 }}>Commission Income <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>(last 6 months)</span></h4>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#00c864" }}>{fmtCents(stats.totalPaidCents)} total</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                    {months.map((m, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {m.cents > 0 && <div style={{ fontSize: "0.58rem", color: "var(--accent)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{fmtCents(m.cents)}</div>}
                        <div style={{ width: "100%", background: m.cents > 0 ? "var(--accent)" : "var(--card2)", borderRadius: "3px 3px 0 0", height: `${Math.max((m.cents / maxCents) * 60, m.cents > 0 ? 4 : 2)}px`, opacity: m.cents > 0 ? 1 : 0.3 }} />
                        <div style={{ fontSize: "0.6rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Quick Statistics card ── */}
            {players.length > 0 && (() => {
              const posMap: Record<string, number> = {};
              players.forEach((p: any) => { if (p.position) posMap[p.position] = (posMap[p.position] ?? 0) + 1; });
              const topPos = Object.entries(posMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
              const maxPos = Math.max(...topPos.map(([, n]) => n), 1);
              const healthMap = { HEALTHY: 0, INJURED: 0, REHAB: 0, SUSPENDED: 0 } as Record<string, number>;
              players.forEach((p: any) => { const h = p.healthStatus ?? "HEALTHY"; healthMap[h] = (healthMap[h] ?? 0) + 1; });
              const HCOLOR: Record<string, string> = { HEALTHY: "#00c864", INJURED: "var(--red)", REHAB: "#ff8c00", SUSPENDED: "var(--muted)" };
              return (
                <div className="card" style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ textTransform: "uppercase", fontSize: "0.88rem", margin: 0 }}>📊 Quick Statistics</h4>
                    <button onClick={() => switchTab("statistics")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>View Full →</button>
                  </div>
                  <div className="agent-2col" style={{ marginBottom: 0, gap: 16 }}>
                    {/* Positions */}
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--font-mono)", marginBottom: 10 }}>By Position</div>
                      {topPos.map(([pos, n]) => (
                        <div key={pos} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 80, fontSize: "0.68rem", color: "var(--muted)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{posLabel(pos)}</div>
                          <div style={{ flex: 1, background: "var(--card2)", borderRadius: 3, height: 10, overflow: "hidden" }}>
                            <div style={{ width: `${(n / maxPos) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 3 }} />
                          </div>
                          <div style={{ width: 18, textAlign: "right", fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--white)", flexShrink: 0 }}>{n}</div>
                        </div>
                      ))}
                    </div>
                    {/* Health */}
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--font-mono)", marginBottom: 10 }}>Health Status</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {Object.entries(healthMap).filter(([, n]) => n > 0).map(([status, n]) => (
                          <div key={status} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--card2)", border: `1px solid ${HCOLOR[status]}33`, borderRadius: "var(--radius)", padding: "6px 12px" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: HCOLOR[status], flexShrink: 0 }} />
                            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>{n}</span>
                            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{status}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--font-mono)", marginBottom: 8 }}>Availability</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1, background: "rgba(0,200,100,0.08)", border: "1px solid rgba(0,200,100,0.25)", borderRadius: "var(--radius)", padding: "8px", textAlign: "center" }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: "#00c864", lineHeight: 1 }}>{players.filter((p: any) => p.isAvailable).length}</div>
                            <div style={{ fontSize: "0.58rem", color: "var(--muted)", marginTop: 4, textTransform: "uppercase" }}>Available</div>
                          </div>
                          <div style={{ flex: 1, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "8px", textAlign: "center" }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: "var(--muted)", lineHeight: 1 }}>{players.filter((p: any) => !p.isAvailable).length}</div>
                            <div style={{ fontSize: "0.58rem", color: "var(--muted)", marginTop: 4, textTransform: "uppercase" }}>Unavailable</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* ══════════════════ PLAYERS ══════════════════ */}
        {tab === "players" && (
          <div className="tab-content">
            {/* ── Sub-tab toggle ── */}
            <div style={{ ...STICKY_HEADER }}>
              <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 16, maxWidth: 480 }}>
                {([
                  { id: "roster", label: `👥 My Roster${players.length ? ` (${players.length})` : ""}` },
                  { id: "free",   label: "🆓 Free Players" },
                  { id: "requests", label: `📨 My Requests${repRequests.filter(r => r.status === "ACCEPTED").length ? ` ✓${repRequests.filter(r => r.status === "ACCEPTED").length}` : ""}` },
                ] as const).map(st => (
                  <button key={st.id} onClick={() => setPlayersSubTab(st.id)} style={{
                    flex: 1, padding: "8px 12px", background: playersSubTab === st.id ? "var(--accent)" : "transparent",
                    color: playersSubTab === st.id ? "var(--black)" : "var(--muted)", border: "none", cursor: "pointer",
                    fontFamily: "var(--font-display)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em", transition: "background 0.15s",
                  }}>{st.label}</button>
                ))}
              </div>

            {/* ── My Roster header ── */}
            {playersSubTab === "roster" && (<>
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
                  {players.length > 0 && (
                    <button className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={exportPlayersCSV} title="Export roster to CSV">⬇ CSV</button>
                  )}
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
            </>)}
            </div>

            {playersSubTab === "roster" && (players.length === 0 ? (
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
                      <button className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "5px 10px" }} onClick={e => { e.stopPropagation(); setHealthModal(p); setHealthForm({ healthStatus: p.healthStatus ?? "HEALTHY", rehabNote: p.rehabNote ?? "", rehabReturnDate: p.rehabReturnDate ? new Date(p.rehabReturnDate).toISOString().split("T")[0] : "" }); setHealthError(""); }}>🏥 Health</button>
                      <button className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "5px 10px" }} onClick={e => { e.stopPropagation(); openNotesModal(p); }}>📝 Notes</button>
                      <Link href={`/dashboard/agent/player/${p.id}/edit`} className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "5px 10px" }} onClick={e => e.stopPropagation()}>✏️ Edit</Link>
                      {p.agentId && (
                        <button className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "5px 10px", color: "var(--red)", borderColor: "var(--red)" }} onClick={async e => { e.stopPropagation(); if (!confirm(`End representation with ${p.firstName} ${p.lastName}? This cannot be undone.`)) return; const res = await fetch(`/api/agent/players/${p.id}/representation`, { method: "DELETE" }); if (res.ok) { alert("Representation ended."); window.location.reload(); } else { const d = await res.json(); alert(d.error ?? "Error ending representation."); } }}>🚫 End Rep</button>
                      )}
                      <button className="btn btn-danger" style={{ fontSize: "0.72rem", padding: "5px 8px" }} onClick={e => { e.stopPropagation(); setConfirmDelete({ id: p.id, name: `${p.firstName} ${p.lastName}`, type: "player" }); }}>🗑</button>
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
                          {p.agentId && (
                            <button className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 6px", color: "var(--red)", borderColor: "var(--red)" }} onClick={async e => { e.stopPropagation(); if (!confirm(`End representation with ${p.firstName} ${p.lastName}? This cannot be undone.`)) return; const res = await fetch(`/api/agent/players/${p.id}/representation`, { method: "DELETE" }); if (res.ok) { alert("Representation ended."); window.location.reload(); } else { const d = await res.json(); alert(d.error ?? "Error ending representation."); } }}>🚫</button>
                          )}
                          <button className="btn btn-danger" style={{ fontSize: "0.68rem", padding: "4px 6px" }} onClick={e => { e.stopPropagation(); setConfirmDelete({ id: p.id, name: `${p.firstName} ${p.lastName}`, type: "player" }); }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* ══ Free Players sub-tab ══ */}
            {playersSubTab === "free" && (() => {
              const filtered = freeAgents.filter(p => {
                if (faSearch && !`${p.firstName} ${p.lastName}`.toLowerCase().includes(faSearch.toLowerCase())) return false;
                if (faFilterPos && p.position !== faFilterPos) return false;
                return true;
              });
              return (
                <div>
                  {/* Filter bar */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
                    <input value={faSearch} onChange={e => setFaSearch(e.target.value)} placeholder="Search by name…"
                      style={{ flex: "1 1 160px", minWidth: 130, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.78rem", color: "var(--white)", outline: "none", fontFamily: "var(--font-mono)" }} />
                    <select value={faFilterPos} onChange={e => setFaFilterPos(e.target.value)}
                      style={{ flex: "0 0 auto", background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.78rem", color: faFilterPos ? "var(--white)" : "var(--muted)", outline: "none", cursor: "pointer" }}>
                      <option value="">All Positions</option>
                      {POSITIONS.map(pos => <option key={pos} value={pos}>{posLabel(pos)}</option>)}
                    </select>
                    {(faSearch || faFilterPos) && (
                      <button onClick={() => { setFaSearch(""); setFaFilterPos(""); }}
                        style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: "0.7rem", color: "var(--muted)", cursor: "pointer" }}>✕ Clear</button>
                    )}
                    <button onClick={() => { setFreeAgentsLoaded(false); }} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: "0.7rem", color: "var(--muted)", cursor: "pointer" }}>↺ Refresh</button>
                    <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{filtered.length} player{filtered.length !== 1 ? "s" : ""}</span>
                  </div>

                  {freeAgentsLoading ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: "0.88rem" }}>Loading free agents…</div>
                  ) : filtered.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
                      <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔍</div>
                      <h4 style={{ marginBottom: 8 }}>No Free Players Found</h4>
                      <p style={{ color: "var(--muted)" }}>All available players are currently represented or no players match your filters.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {filtered.map((p: any) => (
                        <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", cursor: "pointer", transition: "border-color 0.15s" }}
                          onClick={e => { if ((e.target as HTMLElement).closest("button,input,textarea")) return; if (p.slug) window.open(`/players/${p.slug}`, "_blank"); }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,255,71,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = ""; }}
                        >
                          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--card2)", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                            {p.photoUrl ? <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                          </div>
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase" }}>{p.firstName} {p.lastName}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                              {posLabel(p.position)} · {p.nationality ?? "—"}
                              {p.heightCm && ` · ${p.heightCm}cm`}
                              {p.currentClub && ` · ${p.currentClub}`}
                            </div>
                            {(p.expectedSalaryMin || p.expectedSalaryMax) && (
                              <div style={{ fontSize: "0.72rem", color: "var(--accent)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                                {p.expectedSalaryMin && p.expectedSalaryMax
                                  ? `€${Math.round(p.expectedSalaryMin/100).toLocaleString()} – €${Math.round(p.expectedSalaryMax/100).toLocaleString()}/yr`
                                  : p.expectedSalaryMin ? `from €${Math.round(p.expectedSalaryMin/100).toLocaleString()}/yr`
                                  : `up to €${Math.round(p.expectedSalaryMax/100).toLocaleString()}/yr`}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <span className={`badge ${p.isAvailable ? "badge-green" : "badge-muted"}`}>{p.isAvailable ? "Available" : "N/A"}</span>
                            {p.verificationStatus === "VERIFIED" && <span className="badge badge-green">✅ Verified</span>}
                          </div>

                          {/* Request area */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }} onClick={e => e.stopPropagation()}>
                            {p.requestStatus === "ACCEPTED" ? (
                              <span className="badge badge-green">✓ Accepted</span>
                            ) : p.requestStatus === "PENDING" ? (
                              <span className="badge badge-accent">⏳ Pending</span>
                            ) : p.requestStatus === "REJECTED" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                                <span className="badge badge-muted">✕ Declined</span>
                                <button className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 10px" }}
                                  onClick={() => setFaShowMsgFor(faShowMsgFor === p.id ? null : p.id)}>↺ Re-send</button>
                              </div>
                            ) : (
                              faShowMsgFor === p.id ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
                                  <textarea
                                    value={faRequestInput[p.id] ?? ""}
                                    onChange={e => setFaRequestInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    placeholder="Optional message to player…"
                                    rows={2}
                                    style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "8px 10px", fontSize: "0.78rem", color: "var(--white)", resize: "vertical", fontFamily: "var(--font-mono)", outline: "none" }}
                                  />
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: "0.72rem", padding: "5px 10px" }}
                                      disabled={faRequestingId === p.id}
                                      onClick={() => sendRepRequest(p.id)}>
                                      {faRequestingId === p.id ? <><span className="spinner" /> Sending…</> : "📨 Send Request"}
                                    </button>
                                    <button className="btn btn-outline" style={{ fontSize: "0.72rem", padding: "5px 8px" }} onClick={() => setFaShowMsgFor(null)}>✕</button>
                                  </div>
                                </div>
                              ) : (
                                <button className="btn btn-primary" style={{ fontSize: "0.72rem", padding: "5px 12px" }}
                                  onClick={() => setFaShowMsgFor(p.id)}>
                                  🤝 Request Representation
                                </button>
                              )
                            )}
                            {faRequestMsg[p.id] && (
                              <div style={{ fontSize: "0.72rem", color: faRequestMsg[p.id].startsWith("✓") ? "#00c864" : "var(--red)" }}>{faRequestMsg[p.id]}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ══ My Requests sub-tab ══ */}
            {playersSubTab === "requests" && (() => {
              const pending = repRequests.filter((r: any) => r.status === "PENDING");
              const accepted = repRequests.filter((r: any) => r.status === "ACCEPTED");
              const rejected = repRequests.filter((r: any) => r.status === "REJECTED");
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {repRequestsLoading ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: "0.88rem" }}>Loading…</div>
                  ) : repRequests.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
                      <div style={{ fontSize: "3rem", marginBottom: 16 }}>📨</div>
                      <h4 style={{ marginBottom: 8 }}>No Requests Sent</h4>
                      <p style={{ color: "var(--muted)", marginBottom: 20 }}>Browse the player database to discover players and send representation requests.</p>
                      <button onClick={() => { switchTab("players"); setPlayersSubTab("free"); }} className="btn btn-primary" style={{ justifyContent: "center" }}>🔍 Browse Free Players</button>
                    </div>
                  ) : (<>
                    {accepted.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.62rem", color: "#00c864", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "var(--font-mono)", marginBottom: 10 }}>Accepted ({accepted.length})</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {accepted.map((r: any) => (
                            <div key={r.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, borderColor: "rgba(0,200,100,0.3)" }}>
                              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--card2)", border: "2px solid #00c864", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                                {r.player?.photoUrl ? <img src={r.player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase" }}>{r.player?.firstName} {r.player?.lastName}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{posLabel(r.player?.position)} · {r.player?.nationality ?? "—"}</div>
                              </div>
                              <span className="badge badge-green">✓ Accepted</span>
                              {r.player?.slug && <a href={`/players/${r.player.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 10px" }}>View ↗</a>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {pending.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "var(--font-mono)", marginBottom: 10 }}>Awaiting Response ({pending.length})</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {pending.map((r: any) => (
                            <div key={r.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, borderColor: "rgba(232,255,71,0.2)" }}>
                              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--card2)", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                                {r.player?.photoUrl ? <img src={r.player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase" }}>{r.player?.firstName} {r.player?.lastName}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{posLabel(r.player?.position)} · {r.player?.nationality ?? "—"}</div>
                                {r.message && <div style={{ fontSize: "0.72rem", color: "rgba(245,243,238,0.5)", marginTop: 4, fontStyle: "italic" }}>"{r.message}"</div>}
                              </div>
                              <span className="badge badge-accent">⏳ Pending</span>
                              <div style={{ fontSize: "0.68rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {rejected.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "var(--font-mono)", marginBottom: 10 }}>Declined ({rejected.length})</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.6 }}>
                          {rejected.map((r: any) => (
                            <div key={r.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
                              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--card2)", border: "1px solid var(--border)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                                {r.player?.photoUrl ? <img src={r.player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "0.88rem", textTransform: "uppercase" }}>{r.player?.firstName} {r.player?.lastName}</div>
                              </div>
                              <span className="badge badge-muted">✕ Declined</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>)}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════ CONTRACTS ══════════════════ */}
        {tab === "contracts" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: contracts.length > 0 ? 10 : 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                  Contracts <span style={{ color: "var(--muted)", fontWeight: 400 }}>({contracts.length})</span>
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {contracts.length > 0 && (
                    <div style={{ display: "flex", border: "1px solid rgba(245,243,238,0.12)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                      {(["table", "gantt"] as const).map(m => (
                        <button key={m} onClick={() => setContractView(m)} style={{ padding: "4px 10px", background: contractView === m ? "var(--accent)" : "transparent", color: contractView === m ? "var(--black)" : "var(--muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" }}>
                          {m === "table" ? "☰" : "▦"}
                        </button>
                      ))}
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={() => { setContractForm({ playerId: "", clubName: "", startDate: "", endDate: "", salaryCents: "", bonusDetails: "", notes: "" }); setContractDocFile(null); setContractError(""); setShowContractModal(true); }}>+ Add Contract</button>
                </div>
              </div>
              {contracts.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={contractSearch} onChange={e => setContractSearch(e.target.value)}
                    placeholder="Search by player or club…"
                    style={{ flex: 1, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.78rem", color: "var(--white)", outline: "none", fontFamily: "var(--font-mono)" }}
                  />
                  {contractSearch && (
                    <button onClick={() => setContractSearch("")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: "0.7rem", color: "var(--muted)", cursor: "pointer" }}>✕</button>
                  )}
                </div>
              )}
            </div>

            {contracts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>📄</div>
                <h4 style={{ marginBottom: 8 }}>No Contracts Yet</h4>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 24 }}>Track your players&apos; club contracts, salaries, and expiry dates.</p>
                <button className="btn btn-primary" onClick={() => { setContractForm({ playerId: "", clubName: "", startDate: "", endDate: "", salaryCents: "", bonusDetails: "", notes: "" }); setContractDocFile(null); setContractError(""); setShowContractModal(true); }}>+ Add First Contract</button>
              </div>
            ) : (() => {
              const filteredContracts = contractSearch.trim() === ""
                ? contracts
                : contracts.filter((c: any) => (`${c.player.firstName} ${c.player.lastName} ${c.clubName}`).toLowerCase().includes(contractSearch.toLowerCase()));
              return contractView === "gantt" ? (() => {
              const allDates = contracts.flatMap((c: any) => [c.startDate, c.endDate].filter(Boolean).map((d: string) => new Date(d).getTime()));
              const minTs = Math.min(...allDates);
              const maxTs = Math.max(...allDates);
              const span = maxTs - minTs || 1;
              const now = Date.now();
              const nowPct = Math.min(100, Math.max(0, ((now - minTs) / span) * 100));
              return (
                <div className="card gantt-scroll">
                  <div className="gantt-inner">
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                    <span>{fmtDate(new Date(minTs))}</span>
                    <span>Timeline</span>
                    <span>{fmtDate(new Date(maxTs))}</span>
                  </div>
                  <div style={{ position: "relative", marginBottom: 16 }}>
                    <div style={{ position: "absolute", left: `${nowPct}%`, top: 0, bottom: 0, width: 1, background: "rgba(232,255,71,0.5)", zIndex: 1 }} />
                    <div style={{ position: "absolute", left: `${nowPct}%`, top: -16, transform: "translateX(-50%)", fontSize: "0.55rem", color: "var(--accent)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>Today</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
                    {sortItems(filteredContracts, contractSort.key, contractSort.dir).map((c: any) => {
                      const start = c.startDate ? new Date(c.startDate).getTime() : minTs;
                      const end = c.endDate ? new Date(c.endDate).getTime() : maxTs;
                      const left = ((start - minTs) / span) * 100;
                      const width = Math.max(((end - start) / span) * 100, 2);
                      const days = daysLeft(c.endDate);
                      const expired = days < 0;
                      const barColor = expired ? "rgba(255,59,59,0.6)" : days < 30 ? "var(--red)" : days < 180 ? "var(--accent)" : "#00c864";
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 140, flexShrink: 0, fontSize: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${c.player.firstName} ${c.player.lastName}`}>
                            {c.player.firstName} {c.player.lastName}
                          </div>
                          <div style={{ flex: 1, position: "relative", height: 24, background: "var(--card2)", borderRadius: 4 }}>
                            <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, height: "100%", background: barColor, borderRadius: 4, opacity: expired ? 0.5 : 1, minWidth: 4, display: "flex", alignItems: "center", paddingLeft: 6, overflow: "hidden" }}>
                              <span style={{ fontSize: "0.6rem", color: "var(--black)", fontFamily: "var(--font-display)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.clubName}
                              </span>
                            </div>
                            <div style={{ position: "absolute", left: `${nowPct}%`, top: 0, bottom: 0, width: 1, background: "rgba(232,255,71,0.4)", zIndex: 1 }} />
                          </div>
                          <div style={{ width: 52, textAlign: "right", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: expired ? "var(--red)" : days < 30 ? "var(--red)" : "var(--muted)" }}>
                            {expired ? "Exp." : `${days}d`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>{/* /gantt-inner */}
                </div>
              );
            })() : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ cursor: "pointer" }} onClick={() => setContractSort(s => ({ key: "endDate", dir: s.key === "endDate" && s.dir === "asc" ? "desc" : "asc" }))}>Player</th>
                      <th style={{ cursor: "pointer" }} onClick={() => setContractSort(s => ({ key: "clubName", dir: s.key === "clubName" && s.dir === "asc" ? "desc" : "asc" }))}>Club <SortIcon current={contractSort} k="clubName" /></th>
                      <th>Start</th>
                      <th style={{ cursor: "pointer" }} onClick={() => setContractSort(s => ({ key: "endDate", dir: s.key === "endDate" && s.dir === "asc" ? "desc" : "asc" }))}>End <SortIcon current={contractSort} k="endDate" /></th>
                      <th>Days Left</th>
                      <th style={{ cursor: "pointer" }} onClick={() => setContractSort(s => ({ key: "salaryCents", dir: s.key === "salaryCents" && s.dir === "asc" ? "desc" : "asc" }))}>Salary/mo <SortIcon current={contractSort} k="salaryCents" /></th>
                      <th>Status</th>
                      <th>File</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortItems(filteredContracts, contractSort.key, contractSort.dir).map((c: any) => {
                      const days = daysLeft(c.endDate);
                      const expired = days < 0;
                      return (
                        <tr key={c.id} style={{ background: expired ? "rgba(255,59,59,0.04)" : contractRowColor(days), cursor: "pointer" }} onClick={() => setDetailModal({ type: "contract", item: c })}>
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
                            <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", color: contractStatusColor(days), background: `${contractStatusColor(days)}22`, padding: "2px 6px", borderRadius: 3 }}>
                              {contractStatusLabel(days)}
                            </span>
                          </td>
                          <td>
                            {c.contractFileUrl
                              ? <a href={c.contractFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>📄 View</a>
                              : <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>—</span>}
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => {
                              setEditContract(c);
                              const toDate = (d: any) => d ? new Date(d).toISOString().split("T")[0] : "";
                              setEditContractForm({ clubName: c.clubName ?? "", startDate: toDate(c.startDate), endDate: toDate(c.endDate), salaryCents: c.salaryCents ? String(c.salaryCents / 100) : "", bonusDetails: c.bonusDetails ?? "", notes: c.notes ?? "" });
                              setEditContractError("");
                            }}>✏️ Edit</button>
                            <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => handleDeleteContract(c.id, `${c.player?.firstName} ${c.player?.lastName} @ ${c.clubName}`)}>🗑</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )})()}
          </div>
        )}

        {/* ══════════════════ COMMISSIONS ══════════════════ */}
        {tab === "commissions" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: commissions.length > 0 ? 10 : 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                  Commissions <span style={{ color: "var(--muted)", fontWeight: 400 }}>({commissions.length})</span>
                </span>
                <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={() => { setCommissionPlayerId(""); setCommissionInstallments([{ description: "", amountEur: "", dueDate: "", notes: "" }]); setCommissionError(""); setShowCommissionModal(true); }}>+ Add Commission</button>
              </div>
              {commissions.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={commissionSearch} onChange={e => setCommissionSearch(e.target.value)}
                    placeholder="Search by player or description…"
                    style={{ flex: 1, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.78rem", color: "var(--white)", outline: "none", fontFamily: "var(--font-mono)" }}
                  />
                  {commissionSearch && (
                    <button onClick={() => setCommissionSearch("")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: "0.7rem", color: "var(--muted)", cursor: "pointer" }}>✕</button>
                  )}
                </div>
              )}
            </div>

            <div className="commission-stats-grid">
              {[
                { label: "Total Commissions", val: commissions.length, sub: "all time", color: "var(--white)" },
                { label: "Pending Commissions", val: stats.pendingCommissions, sub: "awaiting payment", color: stats.pendingCommissions > 0 ? "var(--accent)" : "var(--muted)" },
                { label: "Pending Payments", val: fmtCents(stats.totalPendingCents), sub: "total outstanding", color: stats.totalPendingCents > 0 ? "var(--accent)" : "var(--muted)" },
                { label: "Completed Payments", val: fmtCents(stats.totalPaidCents), sub: `${stats.paidCommissions} paid`, color: stats.paidCommissions > 0 ? "#00c864" : "var(--muted)" },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: "center", padding: "14px 10px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.6rem", color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(107,107,107,0.6)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {commissions.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>💰</div>
                <h4 style={{ marginBottom: 8 }}>No Commissions Yet</h4>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 24 }}>Track pending and paid commissions. Set due dates to get overdue alerts.</p>
                <button className="btn btn-primary" onClick={() => { setCommissionPlayerId(""); setCommissionInstallments([{ description: "", amountEur: "", dueDate: "", notes: "" }]); setCommissionError(""); setShowCommissionModal(true); }}>+ Add First Commission</button>
              </div>
            ) : (() => {
              const filteredCommissions = commissionSearch.trim() === ""
                ? commissions
                : commissions.filter((c: any) => (`${c.player.firstName} ${c.player.lastName} ${c.description ?? ""}`).toLowerCase().includes(commissionSearch.toLowerCase()));
              return (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Description</th>
                      <th style={{ cursor: "pointer" }} onClick={() => setCommissionSort(s => ({ key: "amountCents", dir: s.key === "amountCents" && s.dir === "asc" ? "desc" : "asc" }))}>Amount <SortIcon current={commissionSort} k="amountCents" /></th>
                      <th style={{ cursor: "pointer" }} onClick={() => setCommissionSort(s => ({ key: "dueDate", dir: s.key === "dueDate" && s.dir === "asc" ? "desc" : "asc" }))}>Due Date <SortIcon current={commissionSort} k="dueDate" /></th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortItems(filteredCommissions, commissionSort.key, commissionSort.dir).map((c: any) => {
                      const od = c.status === "PENDING" ? overdueLevel(c.dueDate) : { days: -1, label: "", color: "", bg: "" };
                      const isOverdue = od.days >= 0;
                      return (
                      <tr key={c.id} style={{ background: isOverdue ? od.bg : "transparent", cursor: "pointer" }} onClick={() => setDetailModal({ type: "commission", item: c })}>
                        <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                          {c.player.firstName} {c.player.lastName}
                        </td>
                        <td style={{ fontSize: "0.85rem" }}>{c.description}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{fmtCents(c.amountCents)}</td>
                        <td style={{ fontSize: "0.82rem", color: isOverdue ? od.color : "var(--muted)", fontWeight: isOverdue ? 700 : 400 }}>
                          {fmtDate(c.dueDate)}{isOverdue ? ` ⚠ ${od.days}d` : ""}
                        </td>
                        <td>
                          {isOverdue ? (
                            <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", color: od.color, background: od.bg, padding: "2px 6px", borderRadius: 3, border: `1px solid ${od.color}44` }}>{od.label}</span>
                          ) : (
                            <span className={`badge ${COMMISSION_STATUS_COLORS[c.status] ?? "badge-muted"}`} style={{ fontSize: "0.6rem" }}>{c.status}</span>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {c.status === "PENDING" && (
                              <button className="btn btn-primary" style={{ fontSize: "0.68rem", padding: "4px 8px" }} onClick={() => { setMarkPaidModal({ id: c.id, playerName: `${c.player?.firstName} ${c.player?.lastName}` }); setMarkPaidDate(""); }}>✓ Mark Paid</button>
                            )}
                            <button className="btn btn-danger" style={{ fontSize: "0.68rem", padding: "4px 6px" }} onClick={() => handleDeleteCommission(c.id, c.description ?? "commission")}>🗑</button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
            })()}
          </div>
        )}

        {/* ══════════════════ TRANSFERS ══════════════════ */}
        {tab === "transfers" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: transfers.length > 0 ? 10 : 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                  Transfers <span style={{ color: "var(--muted)", fontWeight: 400 }}>({transfers.length})</span>
                </span>
                <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={() => { setTransferForm({ playerId: "", fromClub: "", toClub: "", transferDate: "", salaryEur: "", salaryMonths: "", contractStartDate: "", contractEndDate: "", commissionEur: "", commissionDueDate: "", commissionDescription: "", notes: "" }); setTransferDocFile(null); setTransferError(""); setShowTransferModal(true); }}>+ Add Transfer</button>
              </div>
              {transfers.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={transferSearch} onChange={e => setTransferSearch(e.target.value)}
                    placeholder="Search by player, from or to club…"
                    style={{ flex: 1, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.78rem", color: "var(--white)", outline: "none", fontFamily: "var(--font-mono)" }}
                  />
                  {transferSearch && (
                    <button onClick={() => setTransferSearch("")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: "0.7rem", color: "var(--muted)", cursor: "pointer" }}>✕</button>
                  )}
                </div>
              )}
            </div>

            {transfers.length > 0 && (() => {
              const salaries = transfers.filter((t: any) => t.salaryCents);
              const avgSalary = salaries.length > 0 ? Math.round(salaries.reduce((s: number, t: any) => s + t.salaryCents, 0) / salaries.length) : 0;
              const sortedTransfers = [...transfers].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              const lastDate = sortedTransfers[0]?.transferDate;
              const totalCommissions = commissions.reduce((s: number, c: any) => s + (c.amountCents ?? 0), 0);
              const paidCount = commissions.filter((c: any) => c.status === "PAID").length;
              const pendingCount = commissions.filter((c: any) => c.status === "PENDING").length;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Total Transfers", val: transfers.length, sub: "all time", color: "var(--white)" },
                    { label: "Total Commissions", val: totalCommissions > 0 ? fmtCents(totalCommissions) : "—", sub: `${paidCount} paid · ${pendingCount} pending`, color: totalCommissions > 0 ? "#00c864" : "var(--muted)" },
                    { label: "Avg Monthly Salary", val: avgSalary > 0 ? fmtCents(avgSalary) : "—", sub: `${salaries.length} with salary`, color: avgSalary > 0 ? "var(--white)" : "var(--muted)" },
                    { label: "Last Transfer", val: lastDate ? fmtDate(lastDate) : "—", sub: "most recent", color: "var(--muted)" },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ textAlign: "center", padding: "16px 12px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{s.label}</div>
                      <div style={{ fontSize: "0.6rem", color: "rgba(107,107,107,0.6)", marginTop: 2 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {transfers.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔄</div>
                <h4 style={{ marginBottom: 8 }}>No Transfers Yet</h4>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 24 }}>Record every move — fees, salaries, and contract length all in one place.</p>
                <button className="btn btn-primary" onClick={() => { setTransferForm({ playerId: "", fromClub: "", toClub: "", transferDate: "", salaryEur: "", salaryMonths: "", contractStartDate: "", contractEndDate: "", commissionEur: "", commissionDueDate: "", commissionDescription: "", notes: "" }); setTransferDocFile(null); setTransferError(""); setShowTransferModal(true); }}>+ Add First Transfer</button>
              </div>
            ) : (() => {
              const filteredTransfers = transferSearch.trim() === ""
                ? transfers
                : transfers.filter((t: any) => (`${t.player.firstName} ${t.player.lastName} ${t.fromClub ?? ""} ${t.toClub}`).toLowerCase().includes(transferSearch.toLowerCase()));
              return (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>From</th>
                      <th style={{ cursor: "pointer" }} onClick={() => setTransferSort(s => ({ key: "toClub", dir: s.key === "toClub" && s.dir === "asc" ? "desc" : "asc" }))}>To <SortIcon current={transferSort} k="toClub" /></th>
                      <th style={{ cursor: "pointer" }} onClick={() => setTransferSort(s => ({ key: "transferDate", dir: s.key === "transferDate" && s.dir === "asc" ? "desc" : "asc" }))}>Date <SortIcon current={transferSort} k="transferDate" /></th>
                      <th>Salary/mo</th>
                      <th>Contract</th>
                      <th>File</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortItems(filteredTransfers, transferSort.key, transferSort.dir).map((t: any) => (
                      <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailModal({ type: "transfer", item: t })}>
                        <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>
                          {t.player.firstName} {t.player.lastName}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{t.fromClub ?? "Free Agent"}</td>
                        <td style={{ fontSize: "0.85rem" }}>{t.toClub}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{fmtDate(t.transferDate)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{fmtCents(t.salaryCents)}</td>
                        <td style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                          {t.contractStartDate && t.contractEndDate
                            ? <>{fmtDate(t.contractStartDate)}<br/>→ {fmtDate(t.contractEndDate)}</>
                            : t.contractMonths != null ? `${t.contractMonths}mo` : "—"}
                        </td>
                        <td>
                          {t.contractFileUrl
                            ? <a href={t.contractFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>📄 View</a>
                            : <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>—</span>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => handleDeleteTransfer(t.id, `${t.player?.firstName} ${t.player?.lastName} → ${t.toClub}`)}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}
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
                  <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🚀</div>
                    <h4 style={{ marginBottom: 6, fontSize: "0.95rem" }}>No Pitches Yet</h4>
                    <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Generate a shareable link showcasing your players to clubs. Track views and set expiry dates.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pitchDecks.map((d: any) => {
                      const pitchUrl = typeof window !== "undefined" ? `${window.location.origin}/pitch/${d.token}` : `/pitch/${d.token}`;
                      const playerCount = d.players?.length ?? JSON.parse(d.playerIds).length;
                      const isExpired = d.expiresAt && new Date(d.expiresAt) < new Date();
                      const expiresSoon = d.expiresAt && !isExpired && daysLeft(d.expiresAt) < 7;
                      return (
                        <div key={d.id} className="card" style={{ padding: 16, opacity: isExpired ? 0.6 : 1, borderColor: isExpired ? "rgba(255,59,59,0.3)" : "" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", textTransform: "uppercase" }}>{d.title}</div>
                                {isExpired && <span className="badge badge-red" style={{ fontSize: "0.58rem" }}>EXPIRED</span>}
                                {expiresSoon && <span className="badge badge-accent" style={{ fontSize: "0.58rem" }}>Expires in {daysLeft(d.expiresAt)}d</span>}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                                {playerCount} player(s) · {d.views} views · {fmtDate(d.createdAt)}
                                {d.expiresAt && <span style={{ marginLeft: 6, color: isExpired ? "var(--red)" : "var(--muted)" }}>· expires {fmtDate(d.expiresAt)}</span>}
                              </div>
                            </div>
                            <button className="btn btn-outline" style={{ fontSize: "0.68rem", padding: "4px 8px" }} onClick={() => {
                              setEditPitch(d);
                              const ids = d.players?.map((p: any) => p.id) ?? JSON.parse(d.playerIds ?? "[]");
                              setEditPitchPlayerIds(ids);
                              setEditPitchError("");
                            }}>✏️ Edit</button>
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

        {/* ══════════════════ CALENDAR ══════════════════ */}
        {tab === "calendar" && (() => {
          const now = new Date();
          const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() + 1);
          type CalItem = { date: Date; label: string; sub: string; type: "contract" | "commission" | "transfer"; urgent: boolean };
          const items: CalItem[] = [];

          contracts.forEach((c: any) => {
            if (!c.endDate) return;
            const d = new Date(c.endDate);
            const days = daysLeft(c.endDate);
            items.push({
              date: d,
              label: `${c.player.firstName} ${c.player.lastName} — contract ends`,
              sub: `@ ${c.clubName}`,
              type: "contract",
              urgent: days >= 0 && days < 30,
            });
          });

          commissions.forEach((c: any) => {
            if (c.status !== "PENDING" || !c.dueDate) return;
            const d = new Date(c.dueDate);
            const days = daysLeft(c.dueDate);
            items.push({
              date: d,
              label: `${c.player.firstName} ${c.player.lastName} — commission due`,
              sub: `${c.description} · ${fmtCents(c.amountCents)}`,
              type: "commission",
              urgent: days < 0 || days < 7,
            });
          });

          transfers.forEach((t: any) => {
            if (!t.transferDate) return;
            const d = new Date(t.transferDate);
            if (d > cutoff) return;
            items.push({
              date: d,
              label: `${t.player.firstName} ${t.player.lastName} — transfer`,
              sub: `${t.fromClub ?? "Free Agent"} → ${t.toClub}`,
              type: "transfer",
              urgent: false,
            });
          });

          items.sort((a, b) => a.date.getTime() - b.date.getTime());

          const upcoming = items.filter(i => i.date >= now);
          const past = items.filter(i => i.date < now);

          const TYPE_COLORS = { contract: "var(--accent)", commission: "#00c864", transfer: "var(--muted)" };
          const TYPE_ICONS = { contract: "📄", commission: "💰", transfer: "🔄" };

          // ── Monthly planner grid ─────────────────────────────────
          const firstOfMonth = new Date(calYear, calMonth, 1);
          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
          const startDow = (firstOfMonth.getDay() + 6) % 7; // Mon=0 … Sun=6
          const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
          const calDays: (Date | null)[] = [];
          for (let i = 0; i < totalCells; i++) {
            const dn = i - startDow + 1;
            calDays.push(dn < 1 || dn > daysInMonth ? null : new Date(calYear, calMonth, dn));
          }
          const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
          const DOW_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
          const monthLabel = firstOfMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

          // events keyed by day-of-month for this month
          const eventsByDay: Record<number, any[]> = {};
          calendarEvents.forEach(ev => {
            const d = new Date(ev.eventAt);
            if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
              const dn = d.getDate();
              if (!eventsByDay[dn]) eventsByDay[dn] = [];
              eventsByDay[dn].push(ev);
            }
          });

          // selected day events
          const selDayEvents = selectedDay
            ? calendarEvents.filter(ev => {
                const d = new Date(ev.eventAt);
                return d.getFullYear() === selectedDay.getFullYear()
                  && d.getMonth() === selectedDay.getMonth()
                  && d.getDate() === selectedDay.getDate();
              })
            : [];

          const goPrev = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else { setCalMonth(m => m - 1); } };
          const goNext = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else { setCalMonth(m => m + 1); } };

          return (
            <div className="tab-content">
              <div style={{ ...STICKY_HEADER, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Calendar Planner</span>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{upcoming.length} upcoming · {past.length} past</span>
              </div>

              {/* ── Month grid ── */}
              <div className="card" style={{ marginBottom: 24, padding: "16px 16px 20px" }}>
                {/* Month navigation */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <button onClick={goPrev} style={{ background: "none", border: "1px solid var(--border)", color: "var(--white)", borderRadius: "var(--radius)", width: 32, height: 32, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{monthLabel}</span>
                  <button onClick={goNext} style={{ background: "none", border: "1px solid var(--border)", color: "var(--white)", borderRadius: "var(--radius)", width: 32, height: 32, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                </div>

                {/* Day-of-week headers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
                  {DOW_LABELS.map(d => (
                    <div key={d} className="cal-dow-label" style={{ textAlign: "center", fontSize: "0.62rem", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", paddingBottom: 6 }}>{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                  {calDays.map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const dn = day.getDate();
                    const isToday = day.getTime() === todayMid.getTime();
                    const isSelected = selectedDay && day.getTime() === new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()).getTime();
                    const dayEvs = eventsByDay[dn] ?? [];
                    const hasEvents = dayEvs.length > 0;
                    return (
                      <div
                        key={idx}
                        className="cal-day-cell"
                        onClick={() => { setSelectedDay(day); }}
                        style={{
                          minHeight: 44,
                          borderRadius: "var(--radius)",
                          border: isSelected ? "1px solid var(--accent)" : isToday ? "1px solid rgba(232,255,71,0.35)" : "1px solid transparent",
                          background: isSelected ? "rgba(232,255,71,0.08)" : isToday ? "rgba(232,255,71,0.04)" : "var(--card2)",
                          cursor: "pointer",
                          padding: "6px 4px 4px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 3,
                          transition: "border-color 0.12s, background 0.12s",
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: isToday ? "var(--accent)" : isSelected ? "var(--accent)" : "var(--white)", fontWeight: isToday || isSelected ? 700 : 400 }}>{dn}</span>
                        {/* event dots */}
                        {hasEvents && (
                          <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                            {dayEvs.slice(0, 3).map((_, i) => (
                              <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
                            ))}
                            {dayEvs.length > 3 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--muted)" }} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Selected day panel ── */}
              {selectedDay && (
                <div className="card" style={{ marginBottom: 24, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.92rem", textTransform: "uppercase" }}>
                        {selectedDay.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>{selDayEvents.length} event{selDayEvents.length !== 1 ? "s" : ""}</div>
                    </div>
                    <button
                      onClick={() => { setEventForm({ title: "", hour: "09", minute: "00", description: "" }); setEventError(""); setShowEventModal(true); }}
                      className="btn btn-primary"
                      style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                    >+ Add Event</button>
                  </div>
                  {selDayEvents.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "0.82rem" }}>No events — click <strong>+ Add Event</strong> to create one.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selDayEvents.map(ev => {
                        const t = new Date(ev.eventAt);
                        const hhmm = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                        return (
                          <div key={ev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--card2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--accent)", minWidth: 38 }}>{hhmm}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{ev.title}</div>
                                {ev.description && <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{ev.description}</div>}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteEvent(ev.id)} title="Delete event" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem", padding: "4px 6px", borderRadius: "var(--radius)" }}>🗑</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Upcoming / Past timeline ── */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 12 }}>Deadlines &amp; Events</div>

              {items.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>📅</div>
                  <h4 style={{ marginBottom: 8 }}>No Deadlines Yet</h4>
                  <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Add contracts, commissions, and transfers to see your schedule here.</p>
                </div>
              ) : (
                <div style={{ maxWidth: 640 }}>
                  {upcoming.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Upcoming</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {upcoming.map((item, i) => {
                          const days = daysLeft(item.date);
                          return (
                            <div key={i} style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
                              <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.urgent ? "var(--red)" : TYPE_COLORS[item.type], flexShrink: 0 }} />
                                {i < upcoming.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 4 }} />}
                              </div>
                              <div style={{ flex: 1, padding: "10px 0 16px", borderBottom: i < upcoming.length - 1 ? "none" : "1px solid var(--border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                      <span style={{ fontSize: "0.75rem" }}>{TYPE_ICONS[item.type]}</span>
                                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", textTransform: "uppercase" }}>{item.label}</span>
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{item.sub}</div>
                                  </div>
                                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: item.urgent ? "var(--red)" : "var(--muted)" }}>
                                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                                    </div>
                                    <div style={{ fontSize: "0.65rem", color: "rgba(107,107,107,0.6)" }}>{fmtDate(item.date)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {past.length > 0 && (
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Past</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.55 }}>
                        {[...past].reverse().map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.7rem" }}>{TYPE_ICONS[item.type]}</span>
                              <div>
                                <div style={{ fontSize: "0.82rem", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{item.sub}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{fmtDate(item.date)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══════════════════ CLOUD STORAGE ══════════════════ */}
        {tab === "cloud" && (
          <div className="tab-content">
            {/* Header */}
            <div style={{ ...STICKY_HEADER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                    Cloud <span style={{ color: "var(--muted)", fontWeight: 400 }}>({cloudFiles.length} files · {fmtBytes(cloudFiles.reduce((s, f) => s + (f.size ?? 0), 0))})</span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* View toggle */}
                  <div style={{ display: "flex", border: "1px solid rgba(245,243,238,0.12)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                    {(["grid", "list"] as const).map(m => (
                      <button key={m} onClick={() => setCloudViewMode(m)} style={{ padding: "4px 10px", background: cloudViewMode === m ? "var(--accent)" : "transparent", color: cloudViewMode === m ? "var(--black)" : "var(--muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" }}>
                        {m === "grid" ? "⊞" : "☰"}
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "6px 14px" }} onClick={() => cloudInputRef.current?.click()}>
                    ⬆ Upload
                  </button>
                  <input ref={cloudInputRef} type="file" multiple style={{ display: "none" }}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                    onChange={e => { if (e.target.files) handleCloudUpload(e.target.files); e.target.value = ""; }}
                  />
                </div>
              </div>
              {/* Search + category filter */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={cloudSearch} onChange={e => setCloudSearch(e.target.value)}
                  placeholder="Search files…"
                  style={{ flex: "1 1 180px", minWidth: 140, background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: "0.78rem", color: "var(--white)", outline: "none", fontFamily: "var(--font-mono)" }}
                />
                <div className="cloud-cat-filter">
                  {(["all", "image", "document", "other"] as const).map(cat => (
                    <button key={cat} onClick={() => setCloudCategory(cat)} style={{ padding: "5px 10px", background: cloudCategory === cat ? "rgba(232,255,71,0.15)" : "transparent", color: cloudCategory === cat ? "var(--accent)" : "var(--muted)", border: "none", cursor: "pointer", fontSize: "0.68rem", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", borderRight: cat !== "other" ? "1px solid var(--border)" : "none", whiteSpace: "nowrap" }}>
                      {cat === "all" ? "All" : cat === "image" ? "🖼 Imgs" : cat === "document" ? "📄 Docs" : "📁 Other"}
                    </button>
                  ))}
                </div>
                {cloudSearch && <button onClick={() => setCloudSearch("")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: "0.7rem", color: "var(--muted)", cursor: "pointer" }}>✕</button>}
              </div>
            </div>

            {/* Upload error */}
            {cloudUploadError && (
              <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.82rem", color: "var(--red)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {cloudUploadError}
                <button onClick={() => setCloudUploadError("")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
              </div>
            )}

            {/* Drag & Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setCloudDragOver(true); }}
              onDragLeave={() => setCloudDragOver(false)}
              onDrop={e => { e.preventDefault(); setCloudDragOver(false); if (e.dataTransfer.files) handleCloudUpload(e.dataTransfer.files); }}
              onClick={() => cloudInputRef.current?.click()}
              style={{
                border: `2px dashed ${cloudDragOver ? "var(--accent)" : "rgba(245,243,238,0.12)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 20,
                background: cloudDragOver ? "rgba(232,255,71,0.04)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {cloudUploading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--accent)" }}>
                  <span className="spinner" />
                  <span style={{ fontSize: "0.85rem" }}>Uploading…</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>☁️</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {cloudDragOver ? <span style={{ color: "var(--accent)", fontWeight: 700 }}>Drop to upload</span> : <>Drag & drop files here, or <span style={{ color: "var(--accent)", fontWeight: 700 }}>click to browse</span></>}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(107,107,107,0.6)", marginTop: 4 }}>Images, PDFs, Word, Excel, PowerPoint, CSV, ZIP · Max 50 MB each</div>
                </>
              )}
            </div>

            {/* File list/grid */}
            {(() => {
              const filtered = cloudFiles.filter(f => {
                const q = cloudSearch.toLowerCase();
                if (q && !f.name.toLowerCase().includes(q) && !f.originalName?.toLowerCase().includes(q)) return false;
                if (cloudCategory !== "all" && f.category !== cloudCategory) return false;
                return true;
              });

              if (cloudFiles.length === 0) return (
                <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>☁️</div>
                  <h4 style={{ marginBottom: 8 }}>Your Cloud is Empty</h4>
                  <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 24 }}>Upload documents, images, contracts, and any files you want to keep safe and accessible.</p>
                  <button className="btn btn-primary" onClick={() => cloudInputRef.current?.click()}>⬆ Upload First File</button>
                </div>
              );

              if (filtered.length === 0) return (
                <div className="card" style={{ textAlign: "center", padding: "36px 24px", color: "var(--muted)" }}>
                  No files match your search.
                  <button onClick={() => { setCloudSearch(""); setCloudCategory("all"); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "inherit", marginLeft: 6 }}>Clear filters</button>
                </div>
              );

              if (cloudViewMode === "grid") return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  {filtered.map((f: any) => {
                    const isImage = f.category === "image";
                    const isRenaming = cloudRenameId === f.id;
                    return (
                      <div key={f.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(232,255,71,0.25)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = ""}
                      >
                        {/* Preview / icon */}
                        <div style={{ height: 110, background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                          {isImage
                            ? <img src={f.url} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: "2.8rem" }}>{cloudFileIcon(f.mimeType)}</span>
                          }
                        </div>
                        {/* Info */}
                        <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                          {isRenaming ? (
                            <form onSubmit={e => { e.preventDefault(); handleCloudRename(f.id); }} style={{ display: "flex", gap: 4 }}>
                              <input autoFocus className="input" value={cloudRenameName} onChange={e => setCloudRenameName(e.target.value)} style={{ fontSize: "0.78rem", padding: "4px 8px", flex: 1 }} />
                              <button type="submit" className="btn btn-primary" style={{ padding: "3px 7px", fontSize: "0.7rem" }}>✓</button>
                            </form>
                          ) : (
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                              title={f.name}
                              onDoubleClick={() => { setCloudRenameId(f.id); setCloudRenameName(f.name); }}
                            >
                              {f.name}
                            </div>
                          )}
                          <div style={{ fontSize: "0.62rem", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
                            <span>{fmtBytes(f.size)}</span>
                            <span>{fmtDate(f.createdAt)}</span>
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{ padding: "6px 10px 10px", display: "flex", gap: 6, borderTop: "1px solid var(--border)" }}>
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ flex: 1, fontSize: "0.65rem", padding: "4px 6px", justifyContent: "center", textDecoration: "none" }}>
                            👁 View
                          </a>
                          <button className="btn btn-outline" style={{ fontSize: "0.65rem", padding: "4px 6px" }} title="Rename" onClick={() => { setCloudRenameId(f.id); setCloudRenameName(f.name); }}>✏️</button>
                          <button className="btn btn-danger" style={{ fontSize: "0.65rem", padding: "4px 6px" }} onClick={() => setConfirmDelete({ id: f.id, name: f.name, type: "cloud" as any })}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );

              // List view
              return (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>File</th>
                        <th>Category</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((f: any) => {
                        const isRenaming = cloudRenameId === f.id;
                        return (
                          <tr key={f.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {f.category === "image"
                                  ? <div style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)" }}><img src={f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                                  : <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{cloudFileIcon(f.mimeType)}</span>
                                }
                                <div>
                                  {isRenaming ? (
                                    <form onSubmit={e => { e.preventDefault(); handleCloudRename(f.id); }} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      <input autoFocus className="input" value={cloudRenameName} onChange={e => setCloudRenameName(e.target.value)} style={{ fontSize: "0.82rem", padding: "4px 8px", width: 200 }} />
                                      <button type="submit" className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.72rem" }}>✓ Save</button>
                                      <button type="button" className="btn btn-outline" style={{ padding: "4px 10px", fontSize: "0.72rem" }} onClick={() => setCloudRenameId(null)}>Cancel</button>
                                    </form>
                                  ) : (
                                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", cursor: "pointer" }}
                                      onDoubleClick={() => { setCloudRenameId(f.id); setCloudRenameName(f.name); }}
                                      title="Double-click to rename"
                                    >{f.name}</div>
                                  )}
                                  {f.originalName !== f.name && <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{f.originalName}</div>}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: f.category === "image" ? "#00c864" : f.category === "document" ? "var(--accent)" : "var(--muted)" }}>
                                {f.category}
                              </span>
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--muted)" }}>{fmtBytes(f.size)}</td>
                            <td style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{fmtDate(f.createdAt)}</td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 8px", textDecoration: "none" }}>👁 View</a>
                                <button className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => { setCloudRenameId(f.id); setCloudRenameName(f.name); }}>✏️</button>
                                <button className="btn btn-danger" style={{ fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => setConfirmDelete({ id: f.id, name: f.name, type: "cloud" as any })}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════ STATISTICS ══════════════════ */}
        {tab === "statistics" && (() => {
          const paidCommissions = commissions.filter((c: any) => c.status === "PAID");
          const pendingCommissions = commissions.filter((c: any) => c.status === "PENDING");
          const overdueCommissions = commissions.filter((c: any) => c.status === "PENDING" && c.dueDate && new Date(c.dueDate) < new Date());
          const cancelledCommissions = commissions.filter((c: any) => c.status === "CANCELLED");
          const totalEarned = paidCommissions.reduce((s: number, c: any) => s + (c.amountCents ?? 0), 0);
          const totalPending = pendingCommissions.reduce((s: number, c: any) => s + (c.amountCents ?? 0), 0);

          // 12-month income chart
          const months12: { label: string; cents: number }[] = [];
          for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
            const y = d.getFullYear(); const m = d.getMonth();
            const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
            const cents = paidCommissions
              .filter((c: any) => c.paidAt && new Date(c.paidAt).getFullYear() === y && new Date(c.paidAt).getMonth() === m)
              .reduce((s: number, c: any) => s + (c.amountCents ?? 0), 0);
            months12.push({ label, cents });
          }
          const maxIncome = Math.max(...months12.map(m => m.cents), 1);

          // Player breakdowns
          const positionMap: Record<string, number> = {};
          const healthMap: Record<string, number> = {};
          const nationalityMap: Record<string, number> = {};
          players.forEach((p: any) => {
            if (p.position) positionMap[p.position] = (positionMap[p.position] ?? 0) + 1;
            const h = p.healthStatus ?? "HEALTHY";
            healthMap[h] = (healthMap[h] ?? 0) + 1;
            if (p.nationality && p.nationality !== "Unknown") nationalityMap[p.nationality] = (nationalityMap[p.nationality] ?? 0) + 1;
          });
          const topNationalities = Object.entries(nationalityMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
          const topPositions = Object.entries(positionMap).sort((a, b) => b[1] - a[1]);

          // Contract breakdown
          const contractBreakdown = { ACTIVE: 0, EXPIRING: 0, WARNING: 0, CRITICAL: 0, EXPIRED: 0 };
          contracts.forEach((c: any) => {
            if (!c.endDate) return;
            const d = daysLeft(c.endDate);
            contractBreakdown[contractStatusLabel(d) as keyof typeof contractBreakdown]++;
          });

          // Transfer fees by year
          const feeByYear: Record<string, number> = {};
          transfers.forEach((t: any) => {
            if (!t.transferDate || !t.transferFeeCents) return;
            const y = new Date(t.transferDate).getFullYear().toString();
            feeByYear[y] = (feeByYear[y] ?? 0) + t.transferFeeCents;
          });
          const feeYears = Object.entries(feeByYear).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 5);

          function BarRow({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
            const pct = max > 0 ? (val / max) * 100 : 0;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 110, flexShrink: 0, fontSize: "0.75rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
                <div style={{ flex: 1, background: "var(--card2)", borderRadius: 3, height: 14, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, minWidth: val > 0 ? 6 : 0 }} />
                </div>
                <div style={{ width: 28, textAlign: "right", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--white)" }}>{val}</div>
              </div>
            );
          }

          function StatCard({ label, val, sub, color }: { label: string; val: string | number; sub: string; color: string }) {
            return (
              <div className="card" style={{ textAlign: "center", padding: "16px 12px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: "0.63rem", color: "var(--muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                <div style={{ fontSize: "0.58rem", color: "rgba(107,107,107,0.6)", marginTop: 2 }}>{sub}</div>
              </div>
            );
          }

          return (
            <div className="tab-content">
              <div style={{ ...STICKY_HEADER, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Statistics</span>
              </div>

              {/* ── Top KPI row ── */}
              <div className="commission-stats-grid" style={{ marginBottom: 20 }}>
                <StatCard label="Total Earned" val={fmtCents(totalEarned)} sub={`${paidCommissions.length} payments`} color="#00c864" />
                <StatCard label="Pending Income" val={fmtCents(totalPending)} sub={`${pendingCommissions.length} unpaid`} color={totalPending > 0 ? "var(--accent)" : "var(--muted)"} />
                <StatCard label="Total Transfers" val={transfers.length} sub={`${transfers.filter((t: any) => t.transferFeeCents).length} with fee`} color="var(--white)" />
                <StatCard label="Roster Size" val={players.length} sub={`${players.filter((p: any) => p.isAvailable).length} available`} color="var(--white)" />
              </div>

              {/* ── 12-month income chart ── */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.88rem", margin: 0 }}>Commission Income <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>(last 12 months)</span></h4>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#00c864" }}>{fmtCents(totalEarned)} total</span>
                </div>
                {paidCommissions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "0.82rem" }}>No paid commissions yet</div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
                    {months12.map((m, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {m.cents > 0 && <div style={{ fontSize: "0.52rem", color: "var(--accent)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{fmtCents(m.cents)}</div>}
                        <div style={{ width: "100%", background: m.cents > 0 ? "var(--accent)" : "var(--card2)", borderRadius: "3px 3px 0 0", height: `${Math.max((m.cents / maxIncome) * 70, m.cents > 0 ? 4 : 2)}px`, opacity: m.cents > 0 ? 1 : 0.25 }} />
                        <div style={{ fontSize: "0.52rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {/* ── Commission breakdown ── */}
                <div className="card">
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.85rem", marginBottom: 16, marginTop: 0 }}>Commission Breakdown</h4>
                  {commissions.length === 0 ? <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No commissions</div> : (
                    <>
                      {[
                        { label: "Paid", val: paidCommissions.length, color: "#00c864" },
                        { label: "Pending", val: pendingCommissions.length - overdueCommissions.length, color: "var(--accent)" },
                        { label: "Overdue", val: overdueCommissions.length, color: "var(--red)" },
                        { label: "Cancelled", val: cancelledCommissions.length, color: "rgba(107,107,107,0.5)" },
                      ].map(row => <BarRow key={row.label} label={row.label} val={row.val} max={commissions.length} color={row.color} />)}
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Total value</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{fmtCents(totalEarned + totalPending)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Contract status ── */}
                <div className="card">
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.85rem", marginBottom: 16, marginTop: 0 }}>Contract Status</h4>
                  {contracts.length === 0 ? <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No contracts</div> : (
                    <>
                      {[
                        { label: "Active", val: contractBreakdown.ACTIVE, color: "#00c864" },
                        { label: "Expiring (<90d)", val: contractBreakdown.EXPIRING, color: "var(--accent)" },
                        { label: "Warning (<60d)", val: contractBreakdown.WARNING, color: "#ff8c00" },
                        { label: "Critical (<30d)", val: contractBreakdown.CRITICAL, color: "var(--red)" },
                        { label: "Expired", val: contractBreakdown.EXPIRED, color: "rgba(255,59,59,0.4)" },
                      ].map(row => <BarRow key={row.label} label={row.label} val={row.val} max={contracts.length} color={row.color} />)}
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {/* ── Player positions ── */}
                <div className="card">
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.85rem", marginBottom: 16, marginTop: 0 }}>Players by Position</h4>
                  {players.length === 0 ? <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No players</div> : (
                    topPositions.map(([pos, cnt]) => <BarRow key={pos} label={posLabel(pos)} val={cnt} max={players.length} color="var(--accent)" />)
                  )}
                </div>

                {/* ── Player health ── */}
                <div className="card">
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.85rem", marginBottom: 16, marginTop: 0 }}>Player Health</h4>
                  {players.length === 0 ? <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No players</div> : (
                    [
                      { label: "Healthy", key: "HEALTHY", color: "#00c864" },
                      { label: "Rehab", key: "REHAB", color: "var(--accent)" },
                      { label: "Injured", key: "INJURED", color: "var(--red)" },
                      { label: "Suspended", key: "SUSPENDED", color: "rgba(107,107,107,0.6)" },
                    ].map(({ label, key, color }) => <BarRow key={key} label={label} val={healthMap[key] ?? 0} max={players.length} color={color} />)
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {/* ── Top nationalities ── */}
                <div className="card">
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.85rem", marginBottom: 16, marginTop: 0 }}>Top Nationalities</h4>
                  {topNationalities.length === 0 ? <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No data</div> : (
                    topNationalities.map(([nat, cnt]) => <BarRow key={nat} label={nat} val={cnt} max={players.length} color="rgba(232,255,71,0.6)" />)
                  )}
                </div>

                {/* ── Transfer fees by year ── */}
                <div className="card">
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.85rem", marginBottom: 16, marginTop: 0 }}>Transfer Fees by Year</h4>
                  {feeYears.length === 0 ? <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No transfer fee data</div> : (() => {
                    const maxFee = Math.max(...feeYears.map(([, v]) => v));
                    return feeYears.map(([year, cents]) => (
                      <div key={year} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 40, flexShrink: 0, fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{year}</div>
                        <div style={{ flex: 1, background: "var(--card2)", borderRadius: 3, height: 14, overflow: "hidden" }}>
                          <div style={{ width: `${(cents / maxFee) * 100}%`, height: "100%", background: "#00c864", borderRadius: 3 }} />
                        </div>
                        <div style={{ width: 72, textAlign: "right", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#00c864" }}>{fmtCents(cents)}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* ── Availability + verification ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="card">
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.85rem", marginBottom: 16, marginTop: 0 }}>Player Availability</h4>
                  {players.length === 0 ? <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No players</div> : (
                    [
                      { label: "Available", val: players.filter((p: any) => p.isAvailable).length, color: "#00c864" },
                      { label: "Not available", val: players.filter((p: any) => !p.isAvailable).length, color: "rgba(107,107,107,0.5)" },
                    ].map(row => <BarRow key={row.label} label={row.label} val={row.val} max={players.length} color={row.color} />)
                  )}
                </div>

                <div className="card">
                  <h4 style={{ textTransform: "uppercase", fontSize: "0.85rem", marginBottom: 16, marginTop: 0 }}>Verification Status</h4>
                  {players.length === 0 ? <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No players</div> : (
                    [
                      { label: "Verified", val: players.filter((p: any) => p.verificationStatus === "VERIFIED").length, color: "#00c864" },
                      { label: "Pending", val: players.filter((p: any) => p.verificationStatus === "PENDING").length, color: "var(--accent)" },
                      { label: "Unverified", val: players.filter((p: any) => p.verificationStatus === "UNVERIFIED").length, color: "rgba(107,107,107,0.5)" },
                      { label: "Rejected", val: players.filter((p: any) => p.verificationStatus === "REJECTED").length, color: "var(--red)" },
                    ].map(row => <BarRow key={row.label} label={row.label} val={row.val} max={players.length} color={row.color} />)
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════ MESSAGES ══════════════════ */}
        {tab === "messages" && (
          <div className="tab-content">
            <div style={{ ...STICKY_HEADER, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Messages</span>
              {unreadMessages > 0 && <span className="badge badge-red" style={{ fontSize: "0.7rem" }}>{unreadMessages} unread</span>}
            </div>
            <div className="card" style={{ maxWidth: 560, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>💬</div>
              <h4 style={{ marginBottom: 8 }}>Your Messages</h4>
              {unreadMessages > 0 ? (
                <p style={{ color: "var(--accent)", marginBottom: 24, fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                  You have <strong>{unreadMessages}</strong> unread message{unreadMessages !== 1 ? "s" : ""}.
                </p>
              ) : (
                <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: "0.9rem" }}>
                  Conversations with clubs appear here. Open full inbox to read and reply.
                </p>
              )}
              <Link href="/messages" className="btn btn-primary" style={{ justifyContent: "center", fontSize: "0.9rem", padding: "10px 24px" }}>
                Open Messages ↗
              </Link>
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
              {/* Avatar upload */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--card2)", border: "2px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                    {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                  </div>
                  {avatarUploading && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="spinner" /></div>}
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>Profile Photo</div>
                  <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                  <button type="button" className="btn btn-outline" style={{ fontSize: "0.78rem", padding: "5px 12px" }} onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}>
                    {avatarUploading ? "Uploading…" : "Upload Photo"}
                  </button>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>JPG, PNG or WebP</div>
                </div>
              </div>
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

      {/* Delete Confirm (player / contract / commission / transfer) */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h4 style={{ textTransform: "uppercase", marginBottom: 8, color: "var(--red)" }}>
              ⚠ {confirmDelete.type === "player" ? "Remove Player" : confirmDelete.type === "contract" ? "Delete Contract" : confirmDelete.type === "commission" ? "Delete Commission" : (confirmDelete.type as string) === "cloud" ? "Delete File" : "Delete Transfer"}
            </h4>
            <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: 20 }}>
              {confirmDelete.type === "player"
                ? <>Remove <strong style={{ color: "var(--white)" }}>{confirmDelete.name}</strong> from your roster?</>
                : <>Delete <strong style={{ color: "var(--white)" }}>{confirmDelete.name}</strong>?</>
              }
              {" "}This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={handleDelete} disabled={deleting}>
                {deleting ? <><span className="spinner" /> Deleting…</> : "🗑 Delete"}
              </button>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {markPaidModal && (
        <div className="modal-overlay" onClick={() => setMarkPaidModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>✓ Mark as Paid</h3>
              <button onClick={() => setMarkPaidModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 20 }}>
              Commission for <strong style={{ color: "var(--white)" }}>{markPaidModal.playerName}</strong>. Enter the actual payment date.
            </p>
            <div className="form-group">
              <label className="label">Payment Date</label>
              <input
                className="input"
                type="date"
                value={markPaidDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={e => setMarkPaidDate(e.target.value)}
              />
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>Leave empty to use today's date.</div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleMarkPaidConfirm}>✓ Confirm Paid</button>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setMarkPaidModal(null)}>Cancel</button>
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

      {/* Edit Contract Modal */}
      {editContract && (
        <div className="modal-overlay" onClick={() => setEditContract(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Edit Contract</h3>
              <button onClick={() => setEditContract(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
              {editContract.player?.firstName} {editContract.player?.lastName}
            </div>
            <form onSubmit={handleEditContractSubmit}>
              <div className="form-group">
                <label className="label">Club Name <span style={{ color: "var(--accent)" }}>*</span></label>
                <input className="input" value={editContractForm.clubName} onChange={e => setEditContractForm(f => ({ ...f, clubName: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Start Date</label>
                  <input className="input" type="date" value={editContractForm.startDate} onChange={e => setEditContractForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">End Date <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input className="input" type="date" value={editContractForm.endDate} onChange={e => setEditContractForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Monthly Salary (€)</label>
                <input className="input" type="number" min="0" value={editContractForm.salaryCents} onChange={e => setEditContractForm(f => ({ ...f, salaryCents: e.target.value }))} placeholder="3000" />
              </div>
              <div className="form-group">
                <label className="label">Bonus Details</label>
                <input className="input" value={editContractForm.bonusDetails} onChange={e => setEditContractForm(f => ({ ...f, bonusDetails: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={editContractForm.notes} onChange={e => setEditContractForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              {editContractError && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{editContractError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={editContractSaving}>
                  {editContractSaving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setEditContract(null)}>Cancel</button>
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
                <input className="input" type="number" min="0" value={contractForm.salaryCents} onChange={e => setContractForm(f => ({ ...f, salaryCents: e.target.value }))} placeholder="3000" />
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
                          <input className="input" type="number" min="0" style={{ fontSize: "0.85rem", padding: "8px 12px" }} value={inst.amountEur} onChange={e => updateInstallment(idx, "amountEur", e.target.value)} placeholder="5000" />
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
              {/* Player */}
              <div className="form-group">
                <label className="label">Player <span style={{ color: "var(--accent)" }}>*</span></label>
                <select className="input" value={transferForm.playerId} onChange={e => {
                  const pid = e.target.value;
                  const p = players.find((pp: any) => pp.id === pid);
                  setTransferForm(f => ({ ...f, playerId: pid, fromClub: p?.currentClub ?? f.fromClub }));
                }}>
                  <option value="">Select player…</option>
                  {players.map((p: any) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              {/* From / To */}
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
              {/* Transfer Date */}
              <div className="form-group">
                <label className="label" style={{ marginBottom: 6 }}>Transfer Date <span style={{ color: "var(--accent)" }}>*</span> <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 400 }}>DD / MM / YYYY</span></label>
                <DatePicker value={transferForm.transferDate} onChange={d => setTransferForm(f => ({ ...f, transferDate: d, contractStartDate: f.contractStartDate || d }))} />
              </div>
              {/* Salary */}
              <div className="form-group">
                <label className="label">Monthly Salary</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.72rem", marginBottom: 4 }}>Amount (€/mo)</label>
                    <input className="input" type="number" value={transferForm.salaryEur} onChange={e => setTransferForm(f => ({ ...f, salaryEur: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.72rem", marginBottom: 4 }}>Months paid / year</label>
                    <input className="input" type="number" min={1} max={12} value={transferForm.salaryMonths} onChange={e => setTransferForm(f => ({ ...f, salaryMonths: e.target.value }))} placeholder="12" />
                  </div>
                </div>
                {transferForm.salaryEur && transferForm.salaryMonths && (() => {
                  const total = parseFloat(transferForm.salaryEur) * parseInt(transferForm.salaryMonths);
                  return total > 0 ? (
                    <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(0,200,100,0.06)", border: "1px solid rgba(0,200,100,0.2)", borderRadius: "var(--radius)", fontSize: "0.82rem", color: "#00c864" }}>
                      Total annual salary: <strong>€{total.toLocaleString("de-DE")}</strong>
                      <span style={{ color: "var(--muted)", marginLeft: 8 }}>({transferForm.salaryMonths} × €{parseFloat(transferForm.salaryEur).toLocaleString("de-DE")})</span>
                    </div>
                  ) : null;
                })()}
              </div>
              {/* Contract period */}
              <div style={{ background: "rgba(0,150,255,0.05)", border: "1px solid rgba(0,150,255,0.15)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", color: "#5bc4ff", marginBottom: 10 }}>
                  📋 Contract Period <span style={{ fontSize: "0.65rem", fontWeight: 400, color: "var(--muted)", textTransform: "none" }}>DD / MM / YYYY</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Start Date</label>
                    <DatePicker value={transferForm.contractStartDate} onChange={d => setTransferForm(f => ({ ...f, contractStartDate: d }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">End Date</label>
                    <DatePicker value={transferForm.contractEndDate} onChange={d => setTransferForm(f => ({ ...f, contractEndDate: d }))} />
                  </div>
                </div>
                {transferForm.contractStartDate && transferForm.contractEndDate && (() => {
                  const ms = new Date(transferForm.contractEndDate).getTime() - new Date(transferForm.contractStartDate).getTime();
                  const months = Math.round(ms / (1000 * 60 * 60 * 24 * 30.44));
                  return months > 0 ? (
                    <div style={{ fontSize: "0.75rem", color: "#5bc4ff", marginTop: 8 }}>
                      ≈ {months} {months === 1 ? "month" : "months"} ({(months / 12).toFixed(1)} yrs)
                    </div>
                  ) : null;
                })()}
              </div>
              {/* Commission auto-create section */}
              <div style={{ background: "rgba(255,200,0,0.05)", border: "1px solid rgba(255,200,0,0.15)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
                  💰 Commission (auto-creates in Commissions section)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Commission Amount (€)</label>
                    <input className="input" type="number" value={transferForm.commissionEur} onChange={e => setTransferForm(f => ({ ...f, commissionEur: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label">Due Date <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 400 }}>DD/MM/YYYY</span></label>
                    <DatePicker value={transferForm.commissionDueDate} onChange={d => setTransferForm(f => ({ ...f, commissionDueDate: d }))} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Description</label>
                  <input className="input" value={transferForm.commissionDescription} onChange={e => setTransferForm(f => ({ ...f, commissionDescription: e.target.value }))} placeholder="e.g. 5% of transfer fee" />
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
      {/* Edit Pitch Modal */}
      {editPitch && (
        <div className="modal-overlay" onClick={() => setEditPitch(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Edit Pitch Deck</h3>
              <button onClick={() => setEditPitch(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>{editPitch.title}</div>
            <form onSubmit={handleEditPitchSubmit}>
              <div className="form-group">
                <label className="label">Players <span style={{ color: "var(--accent)" }}>*</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 10 }}>
                  {players.filter(p => p.onboardingCompleted).map((p: any) => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 0" }}>
                      <input type="checkbox" checked={editPitchPlayerIds.includes(p.id)} onChange={() => setEditPitchPlayerIds(ids => ids.includes(p.id) ? ids.filter(x => x !== p.id) : [...ids, p.id])} />
                      <span style={{ fontSize: "0.85rem" }}>{p.firstName} {p.lastName}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>· {posLabel(p.position)}</span>
                    </label>
                  ))}
                </div>
                {editPitchPlayerIds.length > 0 && <div style={{ fontSize: "0.75rem", color: "var(--accent)", marginTop: 4 }}>{editPitchPlayerIds.length} selected</div>}
              </div>
              {editPitchError && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{editPitchError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={editPitchSaving}>
                  {editPitchSaving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setEditPitch(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="modal-overlay" onClick={() => setNotesModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>📝 Notes</h3>
              <button onClick={() => setNotesModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
              {notesModal.firstName} {notesModal.lastName}
            </div>
            <form onSubmit={handleAddNote} style={{ marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                <textarea className="input" rows={2} value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Add a private note…" style={{ resize: "none", fontSize: "0.85rem" }} />
                <button type="submit" className="btn btn-primary" style={{ alignSelf: "stretch", padding: "0 14px", fontSize: "0.8rem" }} disabled={notesSaving || !noteContent.trim()}>
                  {notesSaving ? <span className="spinner" /> : "Add"}
                </button>
              </div>
              <select className="input" value={noteCategory} onChange={e => setNoteCategory(e.target.value)} style={{ fontSize: "0.8rem", padding: "5px 10px" }}>
                <option value="general">General</option>
                <option value="performance">Performance</option>
                <option value="medical">Medical</option>
                <option value="contract">Contract</option>
                <option value="personal">Personal</option>
              </select>
            </form>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {notesLoading ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "0.85rem" }}>Loading…</div>
              ) : notesList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "0.85rem" }}>No notes yet.</div>
              ) : notesList.map((n: any) => (
                <div key={n.id} style={{ background: "var(--card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--white)", flex: 1 }}>{n.content}</div>
                    <button onClick={() => handleDeleteNote(n.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.9rem", padding: 0, flexShrink: 0 }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                    <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "var(--accent)", textTransform: "uppercase" }}>{n.category}</span>
                    <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{fmtDate(n.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Health Status Modal */}
      {healthModal && (
        <div className="modal-overlay" onClick={() => setHealthModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>🏥 Update Health Status</h3>
              <button onClick={() => setHealthModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
              {healthModal.firstName} {healthModal.lastName}
            </div>
            <form onSubmit={handleHealthSubmit}>
              <div className="form-group">
                <label className="label">Health Status <span style={{ color: "var(--accent)" }}>*</span></label>
                <select className="input" value={healthForm.healthStatus} onChange={e => setHealthForm(f => ({ ...f, healthStatus: e.target.value }))}>
                  {["HEALTHY", "INJURED", "REHAB", "SUSPENDED"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {(healthForm.healthStatus === "INJURED" || healthForm.healthStatus === "REHAB") && (
                <>
                  <div className="form-group">
                    <label className="label">Note</label>
                    <input className="input" value={healthForm.rehabNote} onChange={e => setHealthForm(f => ({ ...f, rehabNote: e.target.value }))} placeholder="e.g. Knee ligament, physio 3x/week" />
                  </div>
                  <div className="form-group">
                    <label className="label">Expected Return Date</label>
                    <input className="input" type="date" value={healthForm.rehabReturnDate} onChange={e => setHealthForm(f => ({ ...f, rehabReturnDate: e.target.value }))} />
                  </div>
                </>
              )}
              {healthError && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{healthError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={healthSaving}>
                  {healthSaving ? <><span className="spinner" /> Saving…</> : "Update Status"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setHealthModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══════════════════ NOTIFICATION PANEL ══════════════════ */}
      {notifOpen && (
        <>
          <div onClick={() => setNotifOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)" }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 360, maxWidth: "100vw", zIndex: 201, background: "var(--card)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.5)" }}>
            {/* Header */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", textTransform: "uppercase" }}>Notifications</div>
                {(() => { const u = notifications.filter(n => !dismissedIds.has(n.id)).length; return u > 0 ? <div style={{ fontSize: "0.72rem", color: "var(--accent)", marginTop: 2 }}>{u} unread</div> : null; })()}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {notifications.some(n => !dismissedIds.has(n.id)) && (
                  <button onClick={dismissAll} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "4px 10px", fontSize: "0.7rem", color: "var(--muted)", cursor: "pointer" }}>Clear all</button>
                )}
                <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔔</div>
                  <div style={{ fontSize: "0.88rem" }}>No notifications yet</div>
                </div>
              ) : (() => {
                const active = notifications.filter(n => !dismissedIds.has(n.id));
                const dismissed = notifications.filter(n => dismissedIds.has(n.id));
                const NOTIF_ICONS: Record<string, string> = { club_unlock: "🔓", new_free_agent: "⚽" };
                const renderItem = (n: any, dimmed = false) => (
                  <div key={n.id} style={{ display: "flex", gap: 10, padding: "12px 20px", opacity: dimmed ? 0.4 : 1, borderBottom: "1px solid rgba(245,243,238,0.06)" }}>
                    <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>{NOTIF_ICONS[n.type] ?? "🔔"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--white)", lineHeight: 1.3 }}>{n.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(107,107,107,0.6)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{fmtDate(n.createdAt)}</div>
                      {n.link && !dimmed && (
                        <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--accent)", marginTop: 4, display: "inline-block" }}>View →</a>
                      )}
                    </div>
                    {!dimmed && (
                      <button onClick={() => dismissNotification(n.id)} style={{ flexShrink: 0, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem", padding: "0 4px", alignSelf: "flex-start", lineHeight: 1 }} title="Dismiss">✕</button>
                    )}
                  </div>
                );
                return (
                  <>
                    {active.length === 0 && <div style={{ textAlign: "center", padding: "32px 24px 16px", color: "var(--muted)", fontSize: "0.82rem" }}>All caught up!</div>}
                    {active.map(n => renderItem(n, false))}
                    {dismissed.length > 0 && active.length > 0 && (
                      <div style={{ padding: "10px 20px 4px", fontSize: "0.65rem", color: "rgba(107,107,107,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>Dismissed</div>
                    )}
                    {dismissed.map(n => renderItem(n, true))}
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ══ DETAIL MODAL (Transfer / Commission / Contract) ══ */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>
                {detailModal.type === "transfer" ? "🔄 Transfer Details"
                  : detailModal.type === "commission" ? "💰 Commission Details"
                  : "📄 Contract Details"}
              </h3>
              <button onClick={() => setDetailModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            {(() => {
              const item = detailModal.item;
              const row = (label: string, val: React.ReactNode) => val ? (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontSize: "0.88rem", fontFamily: "var(--font-mono)", textAlign: "right", maxWidth: "60%" }}>{val}</span>
                </div>
              ) : null;
              if (detailModal.type === "transfer") return (
                <div>
                  {row("Player", `${item.player.firstName} ${item.player.lastName}`)}
                  {row("From", item.fromClub ?? "Free Agent")}
                  {row("To", item.toClub)}
                  {row("Transfer Date", fmtDate(item.transferDate))}
                  {row("Salary/mo", item.salaryCents ? fmtCents(item.salaryCents) : null)}
                  {row("Contract Start", item.contractStartDate ? fmtDate(item.contractStartDate) : null)}
                  {row("Contract End", item.contractEndDate ? fmtDate(item.contractEndDate) : null)}
                  {item.contractMonths ? row("Duration", `${item.contractMonths} months`) : null}
                  {row("Notes", item.notes)}
                  {row("Created", fmtDate(item.createdAt))}
                </div>
              );
              if (detailModal.type === "commission") return (
                <div>
                  {row("Player", `${item.player.firstName} ${item.player.lastName}`)}
                  {row("Description", item.description)}
                  {row("Amount", fmtCents(item.amountCents))}
                  {row("Due Date", fmtDate(item.dueDate))}
                  {row("Status", item.status)}
                  {item.paidAt ? row("Paid At", fmtDate(item.paidAt)) : null}
                  {row("Notes", item.notes)}
                  {row("Created", fmtDate(item.createdAt))}
                </div>
              );
              // contract
              return (
                <div>
                  {row("Player", `${item.player.firstName} ${item.player.lastName}`)}
                  {row("Club", item.clubName)}
                  {row("Start Date", fmtDate(item.startDate))}
                  {row("End Date", fmtDate(item.endDate))}
                  {row("Days Left", item.endDate ? `${daysLeft(item.endDate)}d` : null)}
                  {row("Salary/mo", item.salaryCents ? fmtCents(item.salaryCents) : null)}
                  {item.bonusDetails ? row("Bonus", item.bonusDetails) : null}
                  {row("Notes", item.notes)}
                  {item.contractFileUrl ? row("File", <a href={item.contractFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>📄 View file</a>) : null}
                  {row("Created", fmtDate(item.createdAt))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══ ADD CALENDAR EVENT MODAL ══ */}
      {showEventModal && selectedDay && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>📅 Add Event</h3>
              <button onClick={() => setShowEventModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--accent)", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
              {selectedDay.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
            <form onSubmit={handleAddEvent}>
              <div className="form-group">
                <label className="label">Title <span style={{ color: "var(--accent)" }}>*</span></label>
                <input className="input" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Meeting with player, Contract negotiation…" autoFocus />
              </div>
              <div className="form-group">
                <label className="label">Time</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                  <select className="input" value={eventForm.hour} onChange={e => setEventForm(f => ({ ...f, hour: e.target.value }))}>
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                  <span style={{ color: "var(--muted)", fontSize: "1.2rem" }}>:</span>
                  <select className="input" value={eventForm.minute} onChange={e => setEventForm(f => ({ ...f, minute: e.target.value }))}>
                    {["00", "15", "30", "45"].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Description <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                <textarea className="input" rows={2} value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details…" style={{ resize: "vertical" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 14, padding: "8px 12px", background: "rgba(232,255,71,0.04)", border: "1px solid rgba(232,255,71,0.12)", borderRadius: "var(--radius)" }}>
                ⏰ You will receive a reminder notification <strong>5 hours before</strong> this event.
              </div>
              {eventError && <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--red)", marginBottom: 16 }}>{eventError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={eventSaving}>
                  {eventSaving ? <><span className="spinner" /> Saving…</> : "Save Event"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowEventModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>

    {/* ── Toast notifications ── */}
    {toasts.length > 0 && (
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === "success" ? "rgba(0,200,100,0.96)" : "rgba(220,50,50,0.96)",
            color: t.type === "success" ? "#000" : "#fff",
            padding: "10px 16px",
            borderRadius: "var(--radius)",
            fontSize: "0.82rem",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
            maxWidth: 340,
            lineHeight: 1.4,
          }}>
            {t.type === "success" ? "✓ " : "✕ "}{t.msg}
          </div>
        ))}
      </div>
    )}
    </main>
  );
}
