// Bilah atas khusus HP: tombol ☰ untuk laci menu, logo, dan menu akun.
// Di tablet dan desktop semua ini sudah ada di sidebar.
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
import { NAMA_PERAN, useKeluar } from "@/entities/sesi";
import { usePreferensi } from "@/entities/preferensi";
import { Merek, inisial } from "./Sidebar";

export function BilahAtas({ pengguna, onBukaLaci, adaMenu }) {
  const keluar = useKeluar();
  const navigate = useNavigate();
  const { data: perusahaan } = usePreferensi();

  const tekanKeluar = () => keluar.mutate(undefined, { onSettled: () => navigate("/masuk", { replace: true }) });

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card px-2 md:hidden">
      {adaMenu && (
        <button
          type="button"
          onClick={onBukaLaci}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted"
          aria-label="Buka menu"
        >
          <FiMenu className="h-5 w-5" aria-hidden />
        </button>
      )}
      <Merek />
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Akun ${pengguna?.nama ?? ""}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--accent-foreground))]"
            >
              {inisial(pengguna?.nama)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-foreground">{pengguna?.nama}</p>
              <p className="break-all text-xs text-muted-foreground">{pengguna?.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Level: {NAMA_PERAN[pengguna?.peran] ?? ""}</p>
              {perusahaan?.nama && <p className="mt-1 text-xs text-muted-foreground">{perusahaan.nama}</p>}
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
