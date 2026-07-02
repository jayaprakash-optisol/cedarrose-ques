import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  readonly title?: string;
  readonly children: React.ReactNode;
  readonly backgroundImage?: string;
}

export function QuestionnaireShell({ title, children, backgroundImage }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col bg-[#F0F2FF]"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="bg-[var(--color-cr-navy)] text-white shrink-0">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center gap-3 relative">
          <span className="text-white font-semibold tracking-wide text-[15px] whitespace-nowrap">
            Cedar Rose
          </span>
          {title && (
            <span className="absolute left-1/2 -translate-x-1/2 text-sm text-white/90 hidden sm:block">
              {title}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5 text-[12px] text-white/70">
            <Lock className="w-3.5 h-3.5" />
            Confidential
          </div>
        </div>
      </header>

      <main
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-6 py-16",
          backgroundImage && "bg-cover bg-center bg-no-repeat",
        )}
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      >
        {children}
      </main>
    </div>
  );
}
