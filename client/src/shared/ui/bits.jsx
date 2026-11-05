// Komponen kecil bergaya PLD (diadaptasi dari PLD clone_code/web/src/shared/ui/ui-bits.jsx):
// kartu, judul bagian bernomor + kalimat kesimpulan, kartu angka, skeleton,
// dan keadaan kosong/galat. Teks bahasa Indonesia.
import { AlertCircle, ArrowDownRight, ArrowUpRight, Inbox, Minus } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function CardBox({ title, subtitle, action, children, className, bodyClassName }) {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-3 shadow-card sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4">
          <div className="min-w-0">
            {title && <h3 className="font-display text-sm font-medium text-foreground sm:text-base">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

const WARNA_NADA = {
  baik: "bg-[hsl(var(--success))]",
  waspada: "bg-[hsl(var(--warning))]",
  buruk: "bg-destructive",
  netral: "bg-muted-foreground/60",
};

/** Judul bagian bernomor: "1 · Hasil bulan ini" + satu kalimat kesimpulan bertitik warna. */
export function SectionHeader({ nomor, judul, kesimpulan, nada = "netral", action, id }) {
  return (
    <div id={id} className="mb-3 flex scroll-mt-24 flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-medium text-foreground sm:text-xl">
          <span className="text-muted-foreground">{nomor} · </span>
          {judul}
        </h2>
        {kesimpulan && (
          <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", WARNA_NADA[nada] ?? WARNA_NADA.netral)} aria-hidden />
            <span>{kesimpulan}</span>
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * Perubahan dibanding pembanding. `naikBaik=false` untuk biaya: naik = merah.
 * persenUbah berupa pecahan (0,12 = 12%).
 */
export function PerubahanPill({ persenUbah, naikBaik = true, className }) {
  if (persenUbah === null || persenUbah === undefined || !Number.isFinite(persenUbah)) return null;
  const naik = persenUbah > 0;
  const datar = Math.abs(persenUbah) < 0.0005;
  const baik = datar ? null : naik === naikBaik;
  const Icon = datar ? Minus : naik ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        baik === null && "bg-muted text-muted-foreground",
        baik === true && "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
        baik === false && "bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {datar ? "tetap" : `${(Math.abs(persenUbah) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}
    </span>
  );
}

/** Kartu angka utama (gaya StatCard PLD). */
export function KpiTile({ label, nilai, keterangan, perubahan, catatanPerubahan, nada }) {
  return (
    <div className="group relative min-w-0 rounded-xl border border-border/60 bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
        {perubahan}
      </div>
      <p
        className={cn(
          "mt-2 break-words font-display text-xl font-medium tabular-nums tracking-tight sm:text-2xl",
          nada === "buruk" ? "text-destructive" : "text-foreground",
        )}
      >
        {nilai}
      </p>
      {keterangan && <p className="mt-1 text-xs text-muted-foreground">{keterangan}</p>}
      {catatanPerubahan && <p className="mt-1 text-xs tabular-nums text-muted-foreground">{catatanPerubahan}</p>}
    </div>
  );
}

export function Skeleton({ className, style }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function StatSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-36" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton({ tinggi = "h-64" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="mt-1.5 h-3 w-28" />
      <div className={cn("mt-5 flex items-end gap-2", tinggi)}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton flex-1 rounded-t-md" style={{ height: `${30 + ((i * 53) % 70)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ baris = 6 }) {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <Skeleton className="h-4 w-48" />
      {Array.from({ length: baris }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ judul = "Data gagal dimuat", pesan, aksi }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-medium text-destructive">{judul}</p>
          {pesan && <p className="mt-1 text-sm text-destructive/80">{pesan}</p>}
          {aksi && <div className="mt-3">{aksi}</div>}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ judul, keterangan, aksi, ikon: Ikon = Inbox }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-card/60 p-8 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Ikon className="h-5 w-5" />
      </div>
      <p className="mt-3 font-display text-base font-medium text-foreground">{judul}</p>
      {keterangan && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{keterangan}</p>}
      {aksi && <div className="mt-4 flex justify-center">{aksi}</div>}
    </div>
  );
}

/** Tabel yang bisa digulir dua arah dengan judul kolom menempel di atas. */
export function StickyTable({ children, maxHeight = "max-h-[560px]", className }) {
  return (
    <div
      className={cn("relative w-full overflow-auto rounded-lg border border-border/50", maxHeight, className)}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full border-separate border-spacing-0 text-sm">{children}</table>
    </div>
  );
}
