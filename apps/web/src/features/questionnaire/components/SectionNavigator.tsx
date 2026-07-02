import { Check } from "lucide-react";

interface Props {
  readonly total: number;
  readonly current: number;         // 0-indexed current section
  readonly completed: Set<number>;  // 0-indexed set of completed section indices
  readonly onNavigate: (index: number) => void;
}

function sectionBackgroundColor(isDone: boolean, isCurrent: boolean): string {
  if (isDone) return "#22C55E";
  if (isCurrent) return "#1E2561";
  return "transparent";
}

function sectionBorderColor(isDone: boolean, isCurrent: boolean): string {
  if (isDone) return "#22C55E";
  if (isCurrent) return "#1E2561";
  return "#CBD5E0";
}

function sectionCursor(isDone: boolean, isCurrent: boolean): string {
  if (isDone) return "pointer";
  if (isCurrent) return "default";
  return "not-allowed";
}

export function SectionNavigator({ total, current, completed, onNavigate }: Props) {
  const sectionIndices = Array.from({ length: total }, (_, i) => i);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sectionIndices.map((i) => {
        const isDone = completed.has(i);
        const isCurrent = i === current;
        return (
          <button
            key={`section-${i}`}
            type="button"
            aria-label={`Section ${i + 1}${isDone ? " (complete)" : ""}`}
            aria-current={isCurrent ? "step" : undefined}
            onClick={() => (isDone || isCurrent) ? onNavigate(i) : undefined}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all"
            style={{
              backgroundColor: sectionBackgroundColor(isDone, isCurrent),
              borderColor: sectionBorderColor(isDone, isCurrent),
              color: isDone || isCurrent ? "#FFFFFF" : "#718096",
              cursor: sectionCursor(isDone, isCurrent),
            }}
          >
            {isDone ? <Check className="h-4 w-4" /> : i + 1}
          </button>
        );
      })}
    </div>
  );
}
