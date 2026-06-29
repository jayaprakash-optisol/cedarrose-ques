import { useState } from "react";
import { AlertTriangle, ChevronDown, Database, User, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Source = "cris" | "subject" | "missing";
interface Field { label: string; value: string; source: Source; warning?: string; signature?: boolean }
interface Section { number: number; title: string; fields: Field[] }

const REVIEW_SECTIONS: Section[] = [
  {
    number: 1, title: "Company Identity",
    fields: [
      { label: "Legal entity name", value: "Gulf Meridian Partners LLC", source: "subject" },
      { label: "Trading name", value: "Gulf Meridian", source: "cris" },
      { label: "Country of incorporation", value: "United Arab Emirates", source: "cris" },
      { label: "Entity type", value: "Limited Liability Company", source: "cris" },
    ],
  },
  {
    number: 2, title: "Registered Address & Contacts",
    fields: [
      { label: "Registered address", value: "Office 2204, Emirates Towers, Sheikh Zayed Rd, Dubai, UAE", source: "cris" },
      { label: "Primary contact name", value: "Mr. Omar Al-Sayed", source: "subject" },
      { label: "Primary contact email", value: "o.alsayed@gulfmeridian.ae", source: "subject" },
      { label: "Phone number", value: "+971 4 332 5678", source: "subject" },
    ],
  },
  {
    number: 3, title: "Management & Key Personnel",
    fields: [
      { label: "CEO / Managing Director", value: "Mr. Omar Al-Sayed", source: "subject" },
      { label: "Board members", value: "Ms. Fatima Al-Hashimi, Mr. Tariq Bin Saeed", source: "subject" },
      { label: "Compliance officer", value: "Ms. Noura Al-Mazrouei", source: "subject" },
    ],
  },
  {
    number: 4, title: "Legal Registration & Licensing",
    fields: [
      { label: "Registration number", value: "CR-AE-44529", source: "cris" },
      { label: "Date of incorporation", value: "08 September 2012", source: "cris" },
      { label: "Regulatory licences held", value: "DIFC Commercial Licence No. CL-7821", source: "subject" },
      { label: "Pending litigation (last 24 months)", value: "No pending litigation.", source: "subject" },
    ],
  },
  {
    number: 5, title: "Shareholders & Corporate Structure",
    fields: [
      {
        label: "Ultimate beneficial owners (>25%)",
        value: "Mr. Omar Al-Sayed (45%), Ms. Fatima Al-Hashimi (30%)",
        source: "subject",
        warning: "This response may require translation before data mapping.",
      },
      { label: "Corporate structure chart uploaded", value: "Not provided", source: "missing" },
    ],
  },
  {
    number: 6, title: "Business Activities & Trade",
    fields: [
      { label: "Primary business activity", value: "Trade finance and commodities distribution", source: "cris" },
      { label: "Sanctions screening procedures", value: "Daily screening via Refinitiv World-Check.", source: "subject" },
      { label: "AML / CTF policy framework", value: "Full AML policy aligned with FATF recommendations.", source: "subject" },
      { label: "Years of operation in current jurisdiction", value: "12 years", source: "subject" },
      { label: "Primary suppliers and country of origin", value: "Primarily KSA, India, Singapore.", source: "subject" },
    ],
  },
  {
    number: 7, title: "Financial Information",
    fields: [
      { label: "Annual revenue range (USD)", value: "USD 100M – 250M", source: "subject" },
      { label: "Number of full-time employees", value: "418", source: "subject" },
      { label: "ISO certifications held", value: "ISO 9001:2015, ISO 27001:2022", source: "subject" },
      { label: "Cyber security framework", value: "NIST CSF aligned, SOC 2 Type II certified.", source: "subject" },
      { label: "Data protection officer contact", value: "Layla Hadid — dpo@gulfmeridian.ae", source: "subject" },
    ],
  },
  {
    number: 8, title: "Declaration & E-Signature",
    fields: [
      { label: "Declaration accepted", value: "Yes — subject confirmed accuracy of all submitted information", source: "subject" },
      { label: "E-signature", value: "Omar Al-Sayed", source: "subject", signature: true },
      { label: "Signed at", value: "06 May 2026, 15:31", source: "subject" },
      { label: "IP address at signing", value: "94.200.45.118", source: "subject" },
    ],
  },
];

function SourceBadge({ source }: { source: Source }) {
  if (source === "cris") return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium"><Database className="h-3 w-3" /> Pre-filled — CRiS</span>;
  if (source === "subject") return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-[11px] font-medium"><User className="h-3 w-3" /> Filled by subject</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium">Not provided</span>;
}

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);
  const preFilled = section.fields.filter((f) => f.source === "cris").length;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40">
        <span className="text-sm font-semibold text-left">Section {section.number} — {section.title}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{section.fields.length} fields · {preFilled} pre-filled</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-4">
          {section.fields.map((f, i) => (
            <div key={i} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <SourceBadge source={f.source} />
              </div>
              <div className={`mt-1 text-sm text-foreground whitespace-pre-wrap ${f.signature ? "font-[cursive] text-lg italic" : ""}`}>{f.value}</div>
              {f.warning && (
                <div className="mt-2 rounded bg-amber-50 text-amber-800 text-xs p-2 flex items-start gap-2 border border-amber-200">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{f.warning}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ResponsesReview() {
  const all = REVIEW_SECTIONS.flatMap((s) => s.fields);
  const s = {
    total: all.length,
    cris: all.filter((f) => f.source === "cris").length,
    subject: all.filter((f) => f.source === "subject").length,
    missing: all.filter((f) => f.source === "missing").length,
  };
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          <strong className="text-navy">{s.cris} of {s.total}</strong> fields were pre-filled from the CRiS database
          <span className="mx-2 text-blue-300">|</span>
          <strong className="text-navy">{s.subject}</strong> fields completed by subject
          <span className="mx-2 text-blue-300">|</span>
          <strong className="text-navy">{s.missing}</strong> optional field not provided
        </span>
      </div>
      <div className="space-y-3">
        {REVIEW_SECTIONS.map((sec) => <SectionCard key={sec.number} section={sec} />)}
      </div>
    </div>
  );
}
