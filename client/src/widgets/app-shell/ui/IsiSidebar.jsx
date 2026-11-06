import { NavLink, useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { cn } from "@/shared/lib/cn";
import { NAMA_PERAN, useKeluar } from "@/entities/sesi";
import { MENU } from "../model/navigasi";

export function Merek({ kecil = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] font-extrabold text-white shadow-gold",
          kecil ? "h-8 w-8 text-sm" : "h-10 w-10 text-lg",
        )}
        aria-hidden
      >
        E
      </div>
      <div className="min-w-0">
        <p className={cn("font-bold leading-tight text-foreground", kecil ? "text-sm" : "text-base")}>EATS Dashboard</p>
        {!kecil && <p className="text-xs text-[hsl(var(--sidebar-muted))]">Laporan keuangan PT EATS</p>}
      </div>
    </div>
  );
}

function inisial(nama) {
  const kata = String(nama ?? "").trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return "?";
  return (kata[0][0] + (kata[1]?.[0] ?? "")).toUpperCase();
}

/** Isi sidebar — dipakai sidebar desktop dan laci (drawer) di HP, jadi menunya selalu sama. */
export function IsiSidebar({ pengguna, jumlahMenunggu = 0, onPilih }) {
  const keluar = useKeluar();
  const navigate = useNavigate();
  const menu = MENU.filter((m) => !m.khususAdmin || pengguna?.peran === "admin");

  const tekanKeluar = () =>
    keluar.mutate(undefined, {
      onSettled: () => {
        onPilih?.();
        navigate("/masuk", { replace: true });
      },
    });

  return (
    <div className="flex h-full flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="px-5 pb-4 pt-6">
        <Merek />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Menu utama">
        {menu.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.akhir}
            onClick={onPilih}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors",
                isActive
                  ? "bg-[hsl(var(--sidebar-active))] font-semibold text-[hsl(var(--sidebar-active-foreground))] before:absolute before:inset-y-2.5 before:left-0 before:w-1 before:rounded-full before:bg-[hsl(var(--primary))]"
                  : "hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground",
              )
            }
          >
            <m.ikon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="flex-1">{m.label}</span>
            {m.lencanaMenunggu && jumlahMenunggu > 0 && (
              <span
                className="min-w-6 rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-center text-xs font-bold text-white"
                title={`${jumlahMenunggu} unggahan menunggu dicek`}
              >
                {jumlahMenunggu}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-[hsl(var(--sidebar-border))] p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--accent-foreground))]"
            aria-hidden
          >
            {inisial(pengguna?.nama)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground" title={pengguna?.email}>
              {pengguna?.nama ?? "—"}
            </p>
            <p className="truncate text-xs text-[hsl(var(--sidebar-muted))]">
              {NAMA_PERAN[pengguna?.peran] ?? ""}
              {pengguna?.email ? ` · ${pengguna.email}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={tekanKeluar}
          disabled={keluar.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:opacity-60"
        >
          <FiLogOut className="h-4 w-4" aria-hidden />
          {keluar.isPending ? "Keluar…" : "Keluar"}
        </button>
        <p className="text-center text-xs text-[hsl(var(--sidebar-muted))]">Semua angka dalam rupiah penuh</p>
      </div>
    </div>
  );
}
