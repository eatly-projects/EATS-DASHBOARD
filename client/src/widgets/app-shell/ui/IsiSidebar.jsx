import { NavLink } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { cn } from "@/shared/lib/cn";
import { NAMA_PERAN, useKeluar } from "@/entities/sesi";
import { MENU } from "../model/navigasi";

export function Merek() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-gold font-display text-lg font-semibold text-white shadow-gold">
        E
      </div>
      <div className="min-w-0">
        <p className="font-display text-base font-medium leading-tight text-white">EATS Dashboard</p>
        <p className="text-xs text-[hsl(var(--sidebar-muted))]">Laporan keuangan PT EATS</p>
      </div>
    </div>
  );
}

/** Isi sidebar — dipakai sidebar desktop dan laci (drawer) di HP, jadi menunya selalu sama. */
export function IsiSidebar({ pengguna, jumlahMenunggu = 0, onPilih }) {
  const keluar = useKeluar();
  const menu = MENU.filter((m) => !m.khususAdmin || pengguna?.peran === "admin");

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="border-b border-[hsl(var(--sidebar-border))] px-5 py-5">
        <Merek />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Menu utama">
        {menu.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.akhir}
            onClick={onPilih}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))] shadow-gold"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-white",
              )
            }
          >
            <m.ikon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{m.label}</span>
            {m.lencanaMenunggu && jumlahMenunggu > 0 && (
              <span
                className="rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[11px] font-semibold text-white"
                title={`${jumlahMenunggu} unggahan menunggu dicek`}
              >
                {jumlahMenunggu}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[hsl(var(--sidebar-border))] px-4 py-4">
        <p className="text-xs text-[hsl(var(--sidebar-muted))]">Semua angka dalam rupiah penuh</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white" title={pengguna?.email}>
              {pengguna?.nama ?? "—"}
            </p>
            <p className="text-xs text-[hsl(var(--sidebar-muted))]">{NAMA_PERAN[pengguna?.peran] ?? ""}</p>
          </div>
          <button
            type="button"
            onClick={() => keluar.mutate()}
            disabled={keluar.isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--sidebar-border))] px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--sidebar-foreground))] transition-colors hover:bg-[hsl(var(--sidebar-hover))] hover:text-white disabled:opacity-60"
          >
            <FiLogOut className="h-3.5 w-3.5" aria-hidden />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
