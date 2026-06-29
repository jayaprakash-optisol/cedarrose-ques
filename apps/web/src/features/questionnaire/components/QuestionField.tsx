import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import type { Question } from "@/types/template";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Props {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function QuestionField({ question, value, onChange, disabled }: Props) {
  const [sameAsAbove, setSameAsAbove] = useState(false);
  const [repeaterItems, setRepeaterItems] = useState<string[]>(
    question.repeater ? (value ? value.split("\n") : [""]) : []
  );
  const questionText = question.text?.trim() || "this field";

  // ---------- Repeater ----------
  if (question.repeater) {
    const update = (items: string[]) => {
      setRepeaterItems(items);
      onChange(items.filter(Boolean).join("\n"));
    };
    return (
      <div className="space-y-2">
        {repeaterItems.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={item}
              disabled={disabled}
              placeholder={question.helpText ?? questionText}
              onChange={(e) => {
                const next = [...repeaterItems];
                next[i] = e.target.value;
                update(next);
              }}
              className="flex-1"
            />
            {repeaterItems.length > 1 && (
              <button
                type="button"
                onClick={() => update(repeaterItems.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Remove"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => update([...repeaterItems, ""])}
          disabled={disabled}
          className="flex items-center gap-1 text-sm font-medium mt-1"
          style={{ color: "#4F46E5" }}
        >
          <Plus className="h-4 w-4" />
          Add another {questionText.toLowerCase()}
        </button>
      </div>
    );
  }

  // ---------- Multiselect (checkboxes) ----------
  if (question.type === "multiselect" && question.options) {
    const selected = value ? value.split(",").map((s) => s.trim()) : [];
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      onChange(next.join(", "));
    };
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={() => toggle(opt)}
              disabled={disabled}
            />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  // ---------- Radio ----------
  if (question.type === "radio" && question.options) {
    return (
      <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
        <div className="space-y-2">
          {question.options.map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer">
              <RadioGroupItem value={opt} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </RadioGroup>
    );
  }

  // ---------- Dropdown ----------
  if (question.type === "dropdown" && question.options) {
    return (
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${questionText.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {question.options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // ---------- Date ----------
  if (question.type === "date") {
    return (
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={question.validation?.allowPast === false ? new Date().toISOString().split("T")[0] : undefined}
        max={question.validation?.allowFuture === false ? new Date().toISOString().split("T")[0] : undefined}
      />
    );
  }

  // ---------- Number ----------
  if (question.type === "number") {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={question.validation?.min}
        max={question.validation?.max}
      />
    );
  }

  // ---------- URL ----------
  if (question.type === "url") {
    return (
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="https://"
      />
    );
  }

  // ---------- File / support_doc ----------
  if (question.type === "file" || question.type === "support_doc") {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">Drag & drop a file or</p>
        <label className="cursor-pointer text-sm font-medium" style={{ color: "#4F46E5" }}>
          Browse files
          <input
            type="file"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
          />
        </label>
        {value && <p className="text-xs text-muted-foreground mt-2">{value}</p>}
      </div>
    );
  }

  // ---------- Toggle (esign / toggle) ----------
  if (question.type === "esign" || question.type === "toggle") {
    return (
      <div className="flex items-center gap-3">
        <Switch
          checked={value === "true"}
          onCheckedChange={(checked) => onChange(String(checked))}
          disabled={disabled}
        />
        <span className="text-sm text-muted-foreground">
          {value === "true" ? "Yes" : "No"}
        </span>
      </div>
    );
  }

  // ---------- Long text (textarea) ----------
  if (question.type === "longtext") {
    const maxLen = question.validation?.maxLength;
    return (
      <div className="space-y-1">
        {question.sameAsToggleLabel && (
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <Switch
              checked={sameAsAbove}
              onCheckedChange={(checked) => {
                setSameAsAbove(checked);
                if (checked) onChange("[Same as above]");
                else onChange("");
              }}
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">{question.sameAsToggleLabel}</span>
          </label>
        )}
        <Textarea
          value={sameAsAbove ? "[Same as above]" : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || sameAsAbove}
          placeholder={question.helpText ?? questionText}
          maxLength={maxLen}
          rows={3}
          className="resize-none"
        />
        {maxLen && (
          <div className="text-right text-xs text-muted-foreground">
            {value.length}/{maxLen}
          </div>
        )}
      </div>
    );
  }

  // ---------- Default: text ----------
  const maxLen = question.validation?.maxLength;
  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={question.helpText ?? `Enter ${questionText.toLowerCase()}`}
        maxLength={maxLen}
        className={cn(maxLen ? "pr-16" : "")}
      />
      {maxLen && (
        <div className="text-right text-xs text-muted-foreground">
          {value.length}/{maxLen}
        </div>
      )}
    </div>
  );
}
