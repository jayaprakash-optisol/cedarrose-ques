import { useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  readonly value: string[];
  readonly onChange: (digits: string[]) => void;
  readonly disabled?: boolean;
  readonly hasError?: boolean;
}

const DIGIT_POSITIONS = [0, 1, 2, 3, 4, 5] as const;

function digitBorderClass(hasError: boolean | undefined, filled: boolean): string {
  if (hasError) return "border-[1.5px] border-[var(--color-cr-error)] bg-[#FFF5F5]";
  if (filled) return "border-[1.5px] border-[var(--color-cr-indigo)]";
  return "border-[1.5px] border-[var(--color-cr-input-border)]";
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
    <fieldset className="flex justify-center gap-2 border-0 p-0 m-0">
      <legend className="sr-only">One-time password</legend>
      {DIGIT_POSITIONS.map((i) => (
        <input
          key={`otp-digit-${i}`}
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
            digitBorderClass(hasError, Boolean(value[i])),
            "focus:border-[2px] focus:border-[var(--color-cr-indigo)] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.15)]",
          )}
          style={{ width: 52, height: 60, fontSize: 24, color: "var(--color-cr-heading)" }}
        />
      ))}
    </fieldset>
  );
}
