import { cn } from "@/shared/lib/cn";
import { STATUS } from "@/entities/unggahan";

const GAYA = {
  baik: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/25",
  waspada: "bg-[hsl(var(--warning))]/12 text-[hsl(32_80%_36%)] border-[hsl(var(--warning))]/30",
  buruk: "bg-destructive/10 text-destructive border-destructive/25",
  netral: "bg-muted text-muted-foreground border-border",
};

export function StatusUnggahan({ status, className }) {
  const s = STATUS[status] ?? { label: "Tidak diketahui", nada: "netral" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        GAYA[s.nada],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {s.label}
    </span>
  );
}
