import { useNavigate } from "react-router-dom";
import { FiLogOut, FiMenu } from "react-icons/fi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/cn";
import { NAMA_PERAN, useKeluar } from "@/entities/sesi";
import { usePreferensi } from "@/entities/preferensi";

export function Merek({ kecil = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))] font-extrabold text-white shadow-gold",
          kecil ? "h-8 w-8 text-sm" : "h-9 w-9 text-base",
        )}
        aria-hidden
      >
        E
      </div>
      <p className="whitespace-nowrap text-base font-bold leading-tight text-foreground">EATS Dashboard</p>
    </div>
  );
}

function inisial(nama) {
  const kata = String(nama ?? "").trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return "?";
  return (kata[0][0] + (kata[1]?.[0] ?? "")).toUpperCase();
}

/** Bilah atas: merek di kiri; nama perusahaan, pengguna, dan tombol keluar di kanan. */
export function BilahAtas({ pengguna, onBukaLaci, adaMenu }) {
  const keluar = useKeluar();
  const navigate = useNavigate();
  const { data: perusahaan } = usePreferensi();

  const tekanKeluar = () => keluar.mutate(undefined, { onSettled: () => navigate("/masuk", { replace: true }) });

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card px-2 sm:px-4">
      {adaMenu && (
        <button
          type="button"
          onClick={onBukaLaci}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted md:hidden"
          aria-label="Buka menu"
        >
          <FiMenu className="h-5 w-5" aria-hidden />
        </button>
      )}
      <Merek />
      <div className="ml-auto flex min-w-0 items-center gap-3">
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-semibold text-foreground" title={perusahaan?.nama}>
            {perusahaan?.nama ?? ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {pengguna?.nama} · {NAMA_PERAN[pengguna?.peran] ?? ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Akun ${pengguna?.nama ?? ""}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--accent-foreground))] hover:ring-2 hover:ring-[hsl(var(--primary))]/30"
            >
              {inisial(pengguna?.nama)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-foreground">{pengguna?.nama}</p>
              <p className="break-all text-xs text-muted-foreground">{pengguna?.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Level: {NAMA_PERAN[pengguna?.peran] ?? ""}</p>
              {perusahaan?.nama && <p className="mt-1 text-xs text-muted-foreground sm:hidden">{perusahaan.nama}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={tekanKeluar} disabled={keluar.isPending}>
              <FiLogOut className="mr-2 h-4 w-4" aria-hidden /> {keluar.isPending ? "Keluar…" : "Keluar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
