import { cn } from "@/shared/lib/cn";

const GAYA = {
  disetujui: "border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  diajukan: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  ditolak: "border-destructive/30 bg-destructive/10 text-destructive",
};
const NAMA = { disetujui: "Disetujui", diajukan: "Menunggu persetujuan", ditolak: "Ditolak" };

/** Status transaksi: Disetujui / Menunggu persetujuan / Ditolak. */
export function LencanaStatusJurnal({ status }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", GAYA[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {NAMA[status] ?? status}
    </span>
  );
}
