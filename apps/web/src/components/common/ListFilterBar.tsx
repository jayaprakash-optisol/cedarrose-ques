import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/ui/date-field";

interface ListHeaderProps {
  readonly title: string;
  readonly count: number;
  readonly countSuffix?: string;
  readonly isFetching?: boolean;
}

export function ListHeader({ title, count, countSuffix, isFetching }: ListHeaderProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">
        {count} case{count === 1 ? "" : "s"}
        {countSuffix ?? ""}
        {isFetching ? " · Loading…" : ""}
      </p>
    </div>
  );
}

interface FilterFieldProps {
  readonly label: string;
  readonly htmlFor?: string;
  readonly width?: number;
  readonly className?: string;
  readonly children: ReactNode;
}

export function FilterField({ label, htmlFor, width, className, children }: FilterFieldProps) {
  if (!htmlFor) {
    return (
      <label style={width ? { width } : undefined} className={`block ${className ?? ""}`}>
        <span className="block text-[12px] font-medium text-[#4A5568] mb-1.5">{label}</span>
        {children}
      </label>
    );
  }
  return (
    <div style={width ? { width } : undefined} className={className}>
      <label htmlFor={htmlFor} className="block text-[12px] font-medium text-[#4A5568] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

interface SelectFilterFieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly width?: number;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly string[];
}

export function SelectFilterField({ label, htmlFor, width, value, onValueChange, options }: SelectFilterFieldProps) {
  return (
    <FilterField label={label} htmlFor={htmlFor} width={width}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={htmlFor}
          className="h-11 rounded-lg border-[#CBD5E0] bg-white text-[14px] text-[#2D3748] focus:border-[#2B3178] focus:ring-[#2B3178]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );
}

interface DateRangeFilterFieldsProps {
  readonly from: string;
  readonly onFromChange: (value: string) => void;
  readonly to: string;
  readonly onToChange: (value: string) => void;
}

export function DateRangeFilterFields({ from, onFromChange, to, onToChange }: DateRangeFilterFieldsProps) {
  return (
    <>
      <FilterField label="From date" width={160}>
        <DateField value={from} onChange={onFromChange} />
      </FilterField>
      <FilterField label="To date" width={160}>
        <DateField value={to} onChange={onToChange} minDate={from || undefined} />
      </FilterField>
    </>
  );
}

interface ExportButtonProps {
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly label: string;
  readonly className?: string;
}

export function ExportButton({ onClick, disabled, label, className }: ExportButtonProps) {
  return (
    <div className={className}>
      <Button variant="outline" onClick={onClick} disabled={disabled} className="h-11 rounded-lg">
        <Download className="h-4 w-4 mr-1" /> {label}
      </Button>
    </div>
  );
}
