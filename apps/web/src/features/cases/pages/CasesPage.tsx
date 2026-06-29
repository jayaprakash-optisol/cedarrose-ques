import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import type { CaseRecord, CaseStatus, RecipientType } from "@/types/case";
import { casesService } from "@/services";
import { AppShell } from "@/components/layout/AppShell";
import { CaseTable } from "@/features/cases/components/CaseTable";
import { CaseDetailPanel } from "@/features/cases/components/CaseDetailPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/ui/date-field";
import { caseCompanyName } from "@/lib/case-display";
import { toast } from "sonner";


export default function AllCasesPage() {
  const [searchParams] = useSearchParams();
  const caseIdParam = searchParams.get("caseId");
  const { data: mockCases = [] } = useQuery<CaseRecord[]>({
    queryKey: ["cases"],
    queryFn: () => casesService.list(),
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CaseStatus | "All">("All");
  const [type, setType] = useState<RecipientType | "All">("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<CaseRecord | null>(null);

  useEffect(() => {
    if (!caseIdParam || !mockCases.length) return;
    const found = mockCases.find((c) => c.id === caseIdParam);
    if (found) setSelected(found);
  }, [caseIdParam, mockCases]);

  const filtered = useMemo(() => {
    return mockCases.filter((c) => {
      if (q) {
        const needle = q.toLowerCase();
        if (![caseCompanyName(c), c.orderId, c.uid].some((v) => v.toLowerCase().includes(needle))) return false;
      }
      if (status !== "All" && c.status !== status) return false;
      if (type !== "All" && c.recipientType !== type) return false;
      const t = new Date(c.requestedDate).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 86_400_000) return false;
      return true;
    });
  }, [q, status, type, from, to, mockCases]);

  const exportCsv = () => {
    const header = ["Order ID", "Company name", "Country", "Recipient", "Status", "Mandatory", "Requested", "Last Activity", "Researcher"];
    const rows = filtered.map((c) => [
      c.orderId, caseCompanyName(c), c.country, c.recipientType, c.status,
      `${c.completionMandatory.done}/${c.completionMandatory.total}`,
      c.requestedDate, c.lastActivity, c.researcherStatus,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "cedarrose-cases.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} cases.`);
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">All cases</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} of {mockCases.length} cases shown</p>
        </div>

        <div className="rounded-[10px] border border-[#EDF2F7] bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search company, order ID, or UID"
                  className="pl-9 h-11 rounded-lg border-[#CBD5E0] bg-white text-[14px] text-[#2D3748] focus-visible:border-[#2B3178] focus-visible:ring-[#2B3178]"
                />
              </div>
            </div>
            <div style={{ width: 180 }}>
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as CaseStatus | "All")}>
                <SelectTrigger className="h-11 rounded-lg border-[#CBD5E0] bg-white text-[14px] text-[#2D3748] focus:border-[#2B3178] focus:ring-[#2B3178]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["All", "SENT", "OPENED", "IN PROGRESS", "COMPLETED", "COMPLETED — MISSING DATA", "PENDING CONTACT", "PENDING LINKAGE & CONTACT", "EXPIRED", "NOT SENT"].map((s) =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div style={{ width: 180 }}>
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">Analyst</label>
              <Select value={type} onValueChange={(v) => setType(v as RecipientType | "All")}>
                <SelectTrigger className="h-11 rounded-lg border-[#CBD5E0] bg-white text-[14px] text-[#2D3748] focus:border-[#2B3178] focus:ring-[#2B3178]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["All", "Supplier", "Customer", "Partner"].map((s) =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div style={{ width: 160 }}>
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">From date</label>
              <DateField value={from} onChange={setFrom} />
            </div>
            <div style={{ width: 160 }}>
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">To date</label>
              <DateField value={to} onChange={setTo} minDate={from || undefined} />
            </div>
            <div>
              <Button variant="outline" onClick={exportCsv} className="h-11 rounded-lg"><Download className="h-4 w-4 mr-1" /> CSV</Button>
            </div>
          </div>
        </div>


        <CaseTable cases={filtered} onRowClick={setSelected} showOrderId />
      </div>

      <CaseDetailPanel case={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppShell>
  );
}
