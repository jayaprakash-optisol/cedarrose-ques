import { useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function OtpInputGroup({ value, onChange, disabled, hasError }: Props) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, char: string) {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = new Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(next);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="One-time password">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value[i] ?? ""}
          disabled={disabled}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={cn(
            "text-center font-semibold outline-none transition rounded-[10px] bg-white",
            hasError
              ? "border-[1.5px] border-[var(--color-cr-error)] bg-[#FFF5F5]"
              : value[i]
                ? "border-[1.5px] border-[var(--color-cr-indigo)]"
                : "border-[1.5px] border-[var(--color-cr-input-border)]",
            "focus:border-[2px] focus:border-[var(--color-cr-indigo)] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.15)]",
          )}
          style={{ width: 52, height: 60, fontSize: 24, color: "var(--color-cr-heading)" }}
        />
      ))}
    </div>
  );
}
