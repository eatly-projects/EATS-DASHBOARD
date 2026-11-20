import { cn } from "@/shared/lib/cn";

/** Lencana Aktif / Nonaktif untuk data induk. */
export function LencanaStatus({ aktif }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        aktif ? "border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}
