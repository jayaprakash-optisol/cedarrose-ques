import { Check } from "lucide-react";

interface SectionState {
  index: number;
  done: boolean;
}

interface Props {
  total: number;
  current: number;         // 0-indexed current section
  completed: Set<number>;  // 0-indexed set of completed section indices
  onNavigate: (index: number) => void;
}

export function SectionNavigator({ total, current, completed, onNavigate }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = completed.has(i);
        const isCurrent = i === current;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Section ${i + 1}${isDone ? " (complete)" : ""}`}
            aria-current={isCurrent ? "step" : undefined}
            onClick={() => (isDone || isCurrent) ? onNavigate(i) : undefined}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all"
            style={{
              backgroundColor: isDone
                ? "#22C55E"
                : isCurrent
                ? "#1E2561"
                : "transparent",
              borderColor: isDone
                ? "#22C55E"
                : isCurrent
                ? "#1E2561"
                : "#CBD5E0",
              color: isDone || isCurrent ? "#FFFFFF" : "#718096",
              cursor: isDone ? "pointer" : isCurrent ? "default" : "not-allowed",
            }}
          >
            {isDone ? <Check className="h-4 w-4" /> : i + 1}
          </button>
        );
      })}
    </div>
  );
}
