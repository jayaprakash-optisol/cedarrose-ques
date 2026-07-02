import { Loader2 } from "lucide-react";

interface Props {
  readonly isSaving: boolean;
  readonly savedAt: Date | null;
}

export function SaveIndicator({ isSaving, savedAt }: Props) {
  if (isSaving) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (savedAt) {
    return (
      <span className="flex items-center gap-1.5 text-sm" style={{ color: "#22C55E" }}>
        <span className="h-2 w-2 rounded-full bg-[#22C55E] inline-block" />{" "}
        All changes saved
      </span>
    );
  }
  return null;
}
