interface Props {
  readonly label: string;
  readonly value: number | string;
  readonly tone?: "navy" | "green" | "amber" | "red";
  readonly hint?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  navy: "text-navy",
  green: "text-status-completed-fg",
  amber: "text-status-pending-fg",
  red: "text-status-abandoned-fg",
};

export function MetricCard({ label, value, tone = "navy", hint }: Props) {
  return (
    <div className="rounded-lg bg-secondary px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </div>
      <div className={["text-3xl font-semibold mt-2 tabular-nums", TONE[tone]].join(" ")}>
        {value}
      </div>
      {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
    </div>
  );
}
