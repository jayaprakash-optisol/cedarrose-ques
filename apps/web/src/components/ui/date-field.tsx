// @ts-nocheck
import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateFieldProps {
  value: string; // ISO yyyy-MM-dd
  onChange: (v: string) => void;
  placeholder?: string;
  minDate?: string;
  className?: string;
}

export function DateField({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  minDate,
  className,
}: DateFieldProps) {
  const date = value && isValid(parseISO(value)) ? parseISO(value) : undefined;
  const min = minDate && isValid(parseISO(minDate)) ? parseISO(minDate) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-lg border border-[#CBD5E0] bg-white px-3 text-[14px] text-[#2D3748] focus:outline-none focus:border-[#2B3178] focus:ring-1 focus:ring-[#2B3178]",
            !date && "text-[#A0AEC0]",
            className,
          )}
        >
          <span className="truncate">{date ? format(date, "dd/MM/yyyy") : placeholder}</span>
          <CalendarIcon className="h-4 w-4 text-[#4A5568] shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          disabled={min ? { before: min } : undefined}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
