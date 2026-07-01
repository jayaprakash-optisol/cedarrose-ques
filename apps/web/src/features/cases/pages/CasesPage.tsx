import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import type { CaseRecord, CaseStatus, RecipientType } from "@/types/case";
import { casesService } from "@/services";
import { AppShell } from "@/components/layout/AppShell";
import { CaseTable } from "@/features/cases/components/CaseTable";
import { CaseDetailPanel } from "@/features/cases/components/CaseDetailPanel";
import { ListPagination } from "@/components/common/ListPagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/ui/date-field";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { toast } from "sonner";


export default function AllCasesPage() {
  const [searchParams] = useSearchParams();
  const caseIdParam = searchParams.get("caseId");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CaseStatus | "All">("All");
  const [type, setType] = useState<RecipientType | "All">("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(q);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, type, from, to]);

  const listParams = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      status,
      recipientType: type,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, limit, debouncedSearch, status, type, from, to],
  );

  const { data: result, isFetching } = useQuery({
    queryKey: ["cases", listParams],
    queryFn: () => casesService.list(listParams),
    placeholderData: (prev) => prev,
  });

  const cases = result?.data ?? [];
  const meta = result?.meta ?? { page, limit, total: 0 };

  useEffect(() => {
    if (!caseIdParam || !cases.length) return;
    const found = cases.find((c) => c.id === caseIdParam);
    if (found) setSelected(found);
  }, [caseIdParam, cases]);

  const exportCsv = async () => {
    try {
      setExporting(true);
      await casesService.exportCsv({
        search: debouncedSearch || undefined,
        status,
        recipientType: type,
        from: from || undefined,
        to: to || undefined,
      });
      toast.success("Cases exported.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">All cases</h2>
          <p className="text-sm text-muted-foreground">
            {meta.total} case{meta.total === 1 ? "" : "s"} total
            {isFetching ? " · Loading…" : ""}
          </p>
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
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">Recipient</label>
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
              <Button
                variant="outline"
                onClick={exportCsv}
                disabled={exporting}
                className="h-11 rounded-lg"
              >
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </div>

        <CaseTable cases={cases} onRowClick={setSelected} showOrderId />

        <ListPagination
          meta={meta}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
        />
      </div>

      <CaseDetailPanel case={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppShell>
  );
}
