import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import type { Question } from "@/types/template";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  readonly question: Question;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}

interface RepeaterFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly disabled?: boolean;
}

function RepeaterField({ value, onChange, placeholder, disabled }: RepeaterFieldProps) {
  const [items, setItems] = useState<string[]>(value ? value.split("\n") : [""]);

  const update = (next: string[]) => {
    setItems(next);
    onChange(next.filter(Boolean).join("\n"));
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const key = `${i}-${item}`;
        return (
          <div key={key} className="flex gap-2">
            <Input
              value={item}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                update(next);
              }}
              className="flex-1"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => update(items.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Remove"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => update([...items, ""])}
        disabled={disabled}
        className="flex items-center gap-1 text-sm font-medium mt-1"
        style={{ color: "#4F46E5" }}
      >
        <Plus className="h-4 w-4" />
        Add another {placeholder.toLowerCase()}
      </button>
    </div>
  );
}

interface OptionsFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: string[];
  readonly disabled?: boolean;
}

function MultiselectField({ value, onChange, options, disabled }: OptionsFieldProps) {
  const selected = value ? value.split(",").map((s) => s.trim()) : [];
  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(next.join(", "));
  };
  return (
    <div className="space-y-2">
      {options.map((opt) => (
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

function RadioField({ value, onChange, options, disabled }: OptionsFieldProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer">
            <RadioGroupItem value={opt} />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    </RadioGroup>
  );
}

interface DropdownFieldProps extends OptionsFieldProps {
  readonly questionText: string;
}

function DropdownField({ value, onChange, options, disabled, questionText }: DropdownFieldProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={`Select ${questionText.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FileFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}

function FileField({ value, onChange, disabled }: FileFieldProps) {
  return (
    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
      <p className="text-sm text-muted-foreground mb-2">Drag & drop a file or</p>
      <label className="cursor-pointer text-sm font-medium" style={{ color: "#4F46E5" }}>
        Browse files{" "}
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

interface ToggleFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}

function ToggleField({ value, onChange, disabled }: ToggleFieldProps) {
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

interface LongTextFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder: string;
  readonly maxLen?: number;
  readonly sameAsToggleLabel?: string;
}

function LongTextField({
  value,
  onChange,
  disabled,
  placeholder,
  maxLen,
  sameAsToggleLabel,
}: LongTextFieldProps) {
  const [sameAsAbove, setSameAsAbove] = useState(false);
  return (
    <div className="space-y-1">
      {sameAsToggleLabel && (
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <Switch
            checked={sameAsAbove}
            onCheckedChange={(checked) => {
              setSameAsAbove(checked);
              onChange(checked ? "[Same as above]" : "");
            }}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">{sameAsToggleLabel}</span>
        </label>
      )}
      <Textarea
        value={sameAsAbove ? "[Same as above]" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || sameAsAbove}
        placeholder={placeholder}
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

interface TextFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder: string;
  readonly maxLen?: number;
}

function TextField({ value, onChange, disabled, placeholder, maxLen }: TextFieldProps) {
  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
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

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function QuestionField({ question, value, onChange, disabled }: Props) {
  const questionText = question.text?.trim() || "this field";

  if (question.repeater) {
    return (
      <RepeaterField
        value={value}
        onChange={onChange}
        placeholder={question.helpText ?? questionText}
        disabled={disabled}
      />
    );
  }

  switch (question.type) {
    case "multiselect":
      if (question.options) {
        return (
          <MultiselectField
            value={value}
            onChange={onChange}
            options={question.options}
            disabled={disabled}
          />
        );
      }
      break;

    case "radio":
      if (question.options) {
        return (
          <RadioField value={value} onChange={onChange} options={question.options} disabled={disabled} />
        );
      }
      break;

    case "dropdown":
      if (question.options) {
        return (
          <DropdownField
            value={value}
            onChange={onChange}
            options={question.options}
            disabled={disabled}
            questionText={questionText}
          />
        );
      }
      break;

    case "date":
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={question.validation?.allowPast === false ? todayIso() : undefined}
          max={question.validation?.allowFuture === false ? todayIso() : undefined}
        />
      );

    case "number":
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

    case "url":
      return (
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://"
        />
      );

    case "file":
      return <FileField value={value} onChange={onChange} disabled={disabled} />;

    case "esign":
    case "toggle":
      return <ToggleField value={value} onChange={onChange} disabled={disabled} />;

    case "longtext":
      return (
        <LongTextField
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={question.helpText ?? questionText}
          maxLen={question.validation?.maxLength}
          sameAsToggleLabel={question.sameAsToggleLabel}
        />
      );
  }

  return (
    <TextField
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={question.helpText ?? `Enter ${questionText.toLowerCase()}`}
      maxLen={question.validation?.maxLength}
    />
  );
}
