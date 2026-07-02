import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { CaseRecord, CaseStatus, RecipientType } from "@/types/case";
import { casesService } from "@/services";
import { AppShell } from "@/components/layout/AppShell";
import { CaseTable } from "@/features/cases/components/CaseTable";
import { CaseDetailPanel } from "@/features/cases/components/CaseDetailPanel";
import { ListPagination } from "@/components/common/ListPagination";
import { ListHeader, FilterField, SelectFilterField, DateRangeFilterFields, ExportButton } from "@/components/common/ListFilterBar";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedDateFilter } from "@/hooks/usePaginatedDateFilter";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  "All",
  "SENT",
  "OPENED",
  "IN PROGRESS",
  "COMPLETED",
  "COMPLETED — MISSING DATA",
  "PENDING CONTACT",
  "PENDING LINKAGE & CONTACT",
  "EXPIRED",
  "NOT SENT",
];

const RECIPIENT_OPTIONS = ["All", "Supplier", "Customer", "Partner"];

export default function AllCasesPage() {
  const [searchParams] = useSearchParams();
  const caseIdParam = searchParams.get("caseId");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CaseStatus | "All">("All");
  const [type, setType] = useState<RecipientType | "All">("All");
  const { from, setFrom, to, setTo, page, setPage, limit, setLimit } = usePaginatedDateFilter(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(q);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, type, from, to, setPage]);

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
        <ListHeader title="All cases" count={meta.total} countSuffix=" total" isFetching={isFetching} />

        <div className="rounded-[10px] border border-[#EDF2F7] bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            <FilterField label="Search" htmlFor="cases-search" className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
                <Input
                  id="cases-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search company, order ID, or UID"
                  className="pl-9 h-11 rounded-lg border-[#CBD5E0] bg-white text-[14px] text-[#2D3748] focus-visible:border-[#2B3178] focus-visible:ring-[#2B3178]"
                />
              </div>
            </FilterField>
            <SelectFilterField
              label="Status"
              htmlFor="cases-status"
              width={180}
              value={status}
              onValueChange={(v) => setStatus(v as CaseStatus | "All")}
              options={STATUS_OPTIONS}
            />
            <SelectFilterField
              label="Recipient"
              htmlFor="cases-recipient"
              width={180}
              value={type}
              onValueChange={(v) => setType(v as RecipientType | "All")}
              options={RECIPIENT_OPTIONS}
            />
            <DateRangeFilterFields from={from} onFromChange={setFrom} to={to} onToChange={setTo} />
            <ExportButton onClick={exportCsv} disabled={exporting} label="CSV" />
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
