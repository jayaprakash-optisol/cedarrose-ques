import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Filter,
  Download,
  Plus,
  Copy,
  Eye,
  Pencil,
  Trash2,
  ChevronsUpDown,
  BarChart3,
  ClipboardList,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { User, RoleKey } from "@/types/user";
import { usersService } from "@/services";

const TABS: { key: RoleKey; label: string }[] = [
  { key: "researcher", label: "Researchers" },
  { key: "reviewer", label: "Reviewers" },
  { key: "analyst", label: "Analysts" },
  { key: "admin", label: "Admins" },
];


function truncateId(id: string) {
  // "USR-c48aa9b1-...-...042f" -> "USR-c48...42f"
  const rest = id.startsWith("USR-") ? id.slice(4) : id;
  if (rest.length <= 8) return id;
  return `USR-${rest.slice(0, 3)}...${rest.slice(-3)}`;
}

function truncateEmail(email: string) {
  if (email.length <= 24) return email;
  return email.slice(0, 22) + "...";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-[#276749]";
  return "text-[#9B2C2C]";
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: loadedUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.list(),
  });
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (loadedUsers.length > 0) setUsers(loadedUsers);
  }, [loadedUsers]);

  const updateUsers = (updater: User[] | ((prev: User[]) => User[])) => {
    const next = typeof updater === "function" ? updater(users) : updater;
    setUsers(next);
    usersService.save(next).then((saved) => queryClient.setQueryData(["users"], saved));
  };

  const [activeTab, setActiveTab] = useState<RoleKey>("researcher");
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => users.filter((u) => u.role === activeTab), [users, activeTab]);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("User ID copied");
  };

  const exportCsv = () => {
    const header = ["USER ID", "NAME", "EMAIL", "TOTAL REPORTS", "SCORE", "LAST SUBMISSION", "STATUS"];
    const lines = [header.join(",")].concat(
      rows.map((u) =>
        [u.id, u.name, u.email, u.totalReports ?? "—", u.score == null ? "—" : `${u.score}%`, u.lastSubmission ?? "N/A", u.status]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveUser = (u: User, isEdit: boolean) => {
    if (isEdit) {
      updateUsers((arr) => arr.map((x) => (x.id === u.id ? { ...u, flash: true } : x)));
    } else {
      updateUsers((arr) => [{ ...u, flash: true }, ...arr]);
    }
    setTimeout(() => {
      updateUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, flash: false } : x)));
    }, 1500);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-[28px] font-semibold text-[#1A202C]">User Management</h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-[#2B3178] text-[#2B3178] bg-white text-sm font-medium hover:bg-[#2B3178]/5">
              <Filter className="h-4 w-4" /> Filters
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-[#2B3178] text-[#2B3178] bg-white text-sm font-medium hover:bg-[#2B3178]/5"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#2B3178] hover:bg-[#3B4499] text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#EDF2F7]">
          <div className="flex items-center gap-8">
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`relative pb-3 text-[15px] transition-colors ${
                    active ? "text-[#2B3178] font-medium" : "text-[#718096]"
                  }`}
                >
                  {t.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#2B3178]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white">
          <table className="w-full" style={{ fontFamily: 'inherit' }}>
            <thead>
              <tr className="bg-[#F7F8FC] h-11">
                {[
                  { l: "USER ID", s: true },
                  { l: "NAME", s: true },
                  { l: "EMAIL", s: true },
                  { l: "TOTAL REPORTS", s: false },
                  { l: "SCORE (%)", s: false },
                  { l: "LAST SUBMISSION", s: false },
                  { l: "STATUS", s: false },
                  { l: "ACTION", s: false },
                ].map((c) => (
                  <th
                    key={c.l}
                    className="text-left px-4 text-[12px] font-semibold uppercase text-[#2D3748]"
                    style={{ letterSpacing: "0.05em", fontFamily: 'inherit' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.l}
                      {c.s && <ChevronsUpDown className="h-3 w-3 text-[#4A5568]" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'inherit' }}>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className={`h-14 border-b border-[#EDF2F7] hover:bg-[#F7F8FC] transition-colors ${
                    u.flash ? "bg-[#C6F6D5]/40" : ""
                  }`}
                >
                  <td className="px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] text-[#2D3748]">{truncateId(u.id)}</span>
                      <button
                        onClick={() => copyId(u.id)}
                        className="text-[#4A5568] hover:text-[#2B3178]"
                        title="Copy ID"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 text-[14px] font-medium text-[#2D3748]">{u.name}</td>
                  <td className="px-4 text-[14px] text-[#2D3748]">{truncateEmail(u.email)}</td>
                  <td className="px-4 text-[14px] text-[#2D3748]">
                    {u.totalReports == null ? <span className="text-[#A0AEC0]">—</span> : u.totalReports}
                  </td>
                  <td className="px-4 text-[14px]">
                    {u.score == null ? (
                      <span className="text-[#A0AEC0]">—</span>
                    ) : (
                      <span className={`font-medium ${scoreColor(u.score)}`}>{u.score}%</span>
                    )}
                  </td>
                  <td className="px-4 text-[14px] text-[#2D3748]">
                    {u.lastSubmission ?? "N/A"}
                  </td>
                  <td className="px-4 text-[14px]">
                    <span
                      className="inline-flex items-center gap-2"
                      style={{ color: u.status === "Active" ? "#276749" : "#718096" }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: u.status === "Active" ? "#38A169" : "#A0AEC0" }}
                      />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewUser(u)}
                        className="text-[#A0AEC0] hover:text-[#2B3178]"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditUser(u)}
                        className="text-[#A0AEC0] hover:text-[#2B3178]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <Popover
                        open={deleteId === u.id}
                        onOpenChange={(o) => setDeleteId(o ? u.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            className="text-[#A0AEC0] hover:text-[#E53E3E]"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3" align="end">
                          <p className="text-sm text-[#2D3748] mb-2">Remove this user?</p>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDeleteId(null)}
                              className="text-xs px-2 py-1 rounded text-[#718096] hover:bg-[#F7F8FC]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                updateUsers((arr) => arr.filter((x) => x.id !== u.id));
                                setDeleteId(null);
                                toast.success(`${u.name} removed.`);
                              }}
                              className="text-xs px-2 py-1 rounded bg-[#E53E3E] text-white hover:bg-[#C53030]"
                            >
                              Yes, remove
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <UserModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add new user"
        defaultRole={activeTab}
        onSave={(u) => {
          handleSaveUser(u, false);
          setAddOpen(false);
          toast.success(`${u.name} added`);
        }}
      />

      {/* Edit User Modal */}
      <UserModal
        open={!!editUser}
        onOpenChange={(o) => !o && setEditUser(null)}
        title="Edit user"
        editing={editUser ?? undefined}
        defaultRole={editUser?.role ?? activeTab}
        onSave={(u) => {
          handleSaveUser(u, true);
          setEditUser(null);
          toast.success(`${u.name} updated`);
        }}
      />

      {/* View User Sheet */}
      <Sheet open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <SheetContent className="w-[420px] sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>User details</SheetTitle>
          </SheetHeader>
          {viewUser && (
            <div className="mt-6 space-y-4 text-sm">
              <DetailRow label="User ID" value={viewUser.id} mono />
              <DetailRow label="Name" value={viewUser.name} />
              <DetailRow label="Email" value={viewUser.email} />
              <DetailRow label="Role" value={TABS.find((t) => t.key === viewUser.role)?.label ?? ""} />
              <DetailRow
                label="Total reports"
                value={viewUser.totalReports == null ? "—" : String(viewUser.totalReports)}
              />
              <DetailRow
                label="Score"
                value={viewUser.score == null ? "—" : `${viewUser.score}%`}
              />
              <DetailRow label="Last submission" value={viewUser.lastSubmission ?? "N/A"} />
              <DetailRow label="Status" value={viewUser.status} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase text-[#718096] tracking-wide">{label}</div>
      <div className={`mt-1 text-[#2D3748] ${mono ? "font-mono text-xs break-all" : ""}`}>
        {value}
      </div>
    </div>
  );
}

type AppKey = "automation" | "questionnaire";
const APP_ROLES: Record<AppKey, RoleKey[]> = {
  automation: ["researcher", "reviewer", "admin"],
  questionnaire: ["analyst", "admin"],
};
const ROLE_LABEL: Record<RoleKey, string> = {
  researcher: "Researcher",
  reviewer: "Reviewer",
  analyst: "Analyst",
  admin: "Admin",
};

function UserModal({
  open,
  onOpenChange,
  title,
  defaultRole,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  defaultRole: RoleKey;
  editing?: User;
  onSave: (u: User) => void;
}) {
  const isEdit = !!editing;
  const splitName = (n: string) => {
    const parts = (n || "").trim().split(/\s+/);
    return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
  };
  const initial = splitName(editing?.name ?? "");
  const editingApps = editing?.platforms ?? [];

  const [firstName, setFirstName] = useState(initial.first);
  const [lastName, setLastName] = useState(initial.last);
  const [email, setEmail] = useState(editing?.email ?? "");
  const [userId] = useState(
    editing?.id ?? `USR-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
  );
  const [autoOn, setAutoOn] = useState(editingApps.includes("QA Automation Platform"));
  const [questOn, setQuestOn] = useState(
    editingApps.length === 0 ? true : editingApps.includes("QA Questionnaire Platform"),
  );
  const [autoRole, setAutoRole] = useState<RoleKey | "">(
    editing && editingApps.includes("QA Automation Platform") && APP_ROLES.automation.includes(editing.role)
      ? editing.role
      : "",
  );
  const [questRole, setQuestRole] = useState<RoleKey | "">(
    editing && editingApps.includes("QA Questionnaire Platform") && APP_ROLES.questionnaire.includes(editing.role)
      ? editing.role
      : (!editing ? defaultRole === "analyst" || defaultRole === "admin" ? defaultRole : "" : ""),
  );

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setFirstName(initial.first);
    setLastName(initial.last);
    setEmail(editing?.email ?? "");
    setAutoOn(editingApps.includes("QA Automation Platform"));
    setQuestOn(editingApps.length === 0 ? true : editingApps.includes("QA Questionnaire Platform"));
    setAutoRole("");
    setQuestRole("");
    setSubmitted(false);
    setLoading(false);
    setSuccess(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const atLeastOneApp = (autoOn && autoRole) || (questOn && questRole);
  const errFirst = submitted && !firstName.trim();
  const errLast = submitted && !lastName.trim();
  const errEmail = submitted && !validEmail;
  const errApps = submitted && !atLeastOneApp;

  const handleSubmit = () => {
    setSubmitted(true);
    if (!firstName.trim() || !lastName.trim() || !validEmail || !atLeastOneApp) return;
    setLoading(true);
    setTimeout(() => {
      const platforms: string[] = [];
      if (autoOn && autoRole) platforms.push("QA Automation Platform");
      if (questOn && questRole) platforms.push("QA Questionnaire Platform");
      const primaryRole: RoleKey = (questOn && questRole ? questRole : autoRole) as RoleKey;
      onSave({
        id: userId,
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        totalReports: editing?.totalReports ?? (primaryRole === "admin" ? null : 0),
        score: editing?.score ?? (primaryRole === "admin" ? null : 0),
        lastSubmission: editing?.lastSubmission ?? null,
        status: "Active",
        role: primaryRole,
        platforms,
      });
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  const inputBase =
    "mt-1 h-10 rounded-lg border bg-white px-3 text-[14px] text-[#2D3748] outline-none focus:ring-2 focus:ring-[#2B3178]/20 focus:border-[#2B3178] w-full";
  const labelBase = "text-[13px] text-[#2D3748] font-medium";
  const req = <span className="text-[#E53E3E] mr-0.5">*</span>;

  const showSummary = (autoOn && autoRole) || (questOn && questRole);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] p-0 gap-0 rounded-[12px] overflow-hidden border-0 shadow-2xl"
      >
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#C6F6D5] flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7 text-[#38A169]" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1A202C] mb-2">
              Invitation sent successfully!
            </h2>
            <p className="text-sm text-[#718096] mb-6">
              An invitation email has been sent to {email}. The user will set their password on first login.
            </p>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="px-8"
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 pb-4 border-b border-[#EDF2F7]">
              <DialogHeader>
                <DialogTitle className="text-[20px] font-semibold text-[#1A202C]">
                  {isEdit ? title : "Add User & Send Invitation"}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Names row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>{req}First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className={`${inputBase} ${errFirst ? "border-[#E53E3E]" : "border-[#E2E8F0]"}`}
                  />
                  {errFirst && <p className="text-xs text-[#E53E3E] mt-1">First name is required.</p>}
                </div>
                <div>
                  <label className={labelBase}>{req}Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    className={`${inputBase} ${errLast ? "border-[#E53E3E]" : "border-[#E2E8F0]"}`}
                  />
                  {errLast && <p className="text-xs text-[#E53E3E] mt-1">Last name is required.</p>}
                </div>
              </div>

              {/* Email + UserID row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>{req}Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.smith@email.com"
                    className={`${inputBase} ${errEmail ? "border-[#E53E3E]" : "border-[#E2E8F0]"}`}
                  />
                  <p className={`text-[12px] mt-1 ${errEmail ? "text-[#E53E3E]" : "text-[#718096]"}`}>
                    {errEmail ? "Enter a valid email address." : "Email must be unique in the system"}
                  </p>
                </div>
                <div>
                  <label className={labelBase}>User ID</label>
                  <div className="mt-1 h-10 rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-3 flex items-center justify-between">
                    <span className="text-[13px] text-[#A0AEC0]">Auto-generated</span>
                    <span className="text-[13px] text-[#718096] font-mono">{userId}</span>
                  </div>
                </div>
              </div>

              {/* Application Access section */}
              <div>
                <div
                  className="text-[11px] uppercase text-[#718096] font-medium pb-2 border-b border-[#EDF2F7]"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Application Access & Roles
                </div>
                <p className="text-[12px] text-[#718096] mt-2 mb-3">
                  A user can have different roles in each application.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <AppCard
                    icon={<BarChart3 className="h-5 w-5 text-[#2B3178]" />}
                    iconBg="bg-[#2B3178]/10"
                    name="QA Automation Platform"
                    accent="#2B3178"
                    enabled={autoOn}
                    onToggle={setAutoOn}
                    role={autoRole}
                    setRole={(r) => setAutoRole(r)}
                    roles={APP_ROLES.automation}
                  />
                  <AppCard
                    icon={<ClipboardList className="h-5 w-5 text-[#059669]" />}
                    iconBg="bg-[#059669]/10"
                    name="QA Questionnaire Platform"
                    accent="#059669"
                    enabled={questOn}
                    onToggle={setQuestOn}
                    role={questRole}
                    setRole={(r) => setQuestRole(r)}
                    roles={APP_ROLES.questionnaire}
                  />
                </div>

                {errApps && (
                  <p className="text-[13px] text-[#E53E3E] mt-3">
                    Please grant access to at least one application.
                  </p>
                )}
              </div>

              {/* Summary */}
              {showSummary && (firstName || lastName) && (
                <div className="rounded-lg bg-[#F7FAFC] border border-[#EDF2F7] p-3">
                  <p className="text-[13px] text-[#2D3748] mb-1.5">
                    {firstName} {lastName} will be invited as:
                  </p>
                  <ul className="space-y-1 text-[13px]">
                    {autoOn && autoRole && (
                      <li className="text-[#2B3178]">
                        · {ROLE_LABEL[autoRole as RoleKey]} on QA Automation Platform
                      </li>
                    )}
                    {questOn && questRole && (
                      <li className="text-[#059669]">
                        · {ROLE_LABEL[questRole as RoleKey]} on QA Questionnaire Platform
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#EDF2F7] flex items-center justify-end gap-3">
              <button
                onClick={() => handleOpenChange(false)}
                className="h-11 px-8 rounded-lg border border-[#CBD5E0] bg-white text-[#2D3748] text-[15px] hover:bg-[#F7FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="h-11 px-8 rounded-lg bg-[#2B3178] hover:bg-[#3B4499] text-white text-[15px] font-medium inline-flex items-center gap-2 disabled:opacity-70"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Add User & Send Invitation"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AppCard({
  icon,
  iconBg,
  name,
  accent,
  enabled,
  onToggle,
  role,
  setRole,
  roles,
}: {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  accent: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  role: RoleKey | "";
  setRole: (r: RoleKey) => void;
  roles: RoleKey[];
}) {
  return (
    <div
      className="rounded-[10px] p-4 bg-white transition-colors"
      style={{
        border: `1.5px solid ${enabled ? accent : "#EDF2F7"}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-md flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <span className="text-[14px] font-semibold text-[#1A202C]">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#718096]">Grant access</span>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>
      {enabled && (
        <div className="mt-4">
          <label className="text-[13px] text-[#2D3748] font-medium">
            <span className="text-[#E53E3E] mr-0.5">*</span>Role in this application
          </label>
          <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
            <SelectTrigger className="mt-1 h-10">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

