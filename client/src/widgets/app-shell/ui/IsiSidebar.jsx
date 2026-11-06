import { NavLink, useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { cn } from "@/shared/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { NAMA_PERAN, useKeluar } from "@/entities/sesi";
import { MENU } from "../model/navigasi";

export function Merek({ kecil = false, hanyaLogo = false }) {
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
      {!hanyaLogo && (
        <div className="min-w-0">
          <p className={cn("whitespace-nowrap font-bold leading-tight text-foreground", kecil ? "text-sm" : "text-base")}>EATS Dashboard</p>
          {!kecil && <p className="whitespace-nowrap text-xs text-[hsl(var(--sidebar-muted))]">Laporan keuangan PT EATS</p>}
        </div>
      )}
    </div>
  );
}

function inisial(nama) {
  const kata = String(nama ?? "").trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return "?";
  return (kata[0][0] + (kata[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Saat sidebar ciut, nama menu tampil sebagai keterangan di samping ikon.
 * Pemicunya dibungkus <div>: kalau langsung `asChild` ke NavLink, className
 * NavLink (berupa fungsi) ikut digabung jadi teks dan gaya menu aktif hilang.
 */
function DenganKeterangan({ aktif, teks, children }) {
  if (!aktif) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{children}</div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {teks}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Isi sidebar — dipakai sidebar desktop dan laci (drawer) di HP, jadi menunya selalu sama.
 * `ciut` = hanya ikon (sidebar desktop yang diciutkan).
 */
export function IsiSidebar({ pengguna, jumlahMenunggu = 0, onPilih, ciut = false }) {
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
      <div className={cn("pb-4 pt-6", ciut ? "flex justify-center px-2" : "px-5")}>
        <Merek hanyaLogo={ciut} />
      </div>

      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-3", ciut ? "px-2" : "px-3")} aria-label="Menu utama">
        {menu.map((m) => {
          const menunggu = m.lencanaMenunggu && jumlahMenunggu > 0;
          return (
            <DenganKeterangan key={m.to} aktif={ciut} teks={menunggu ? `${m.label} (${jumlahMenunggu} menunggu dicek)` : m.label}>
              <NavLink
                to={m.to}
                end={m.akhir}
                onClick={onPilih}
                aria-label={ciut ? m.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center rounded-xl py-3 text-[15px] font-medium transition-colors",
                    ciut ? "justify-center px-0" : "gap-3 px-3",
                    isActive
                      ? "bg-[hsl(var(--sidebar-active))] font-semibold text-[hsl(var(--sidebar-active-foreground))] before:absolute before:inset-y-2.5 before:left-0 before:w-1 before:rounded-full before:bg-[hsl(var(--primary))]"
                      : "hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground",
                  )
                }
              >
                <span className="relative">
                  <m.ikon className="h-5 w-5 shrink-0" aria-hidden />
                  {ciut && menunggu && (
                    <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))] ring-2 ring-card" aria-hidden />
                  )}
                </span>
                {!ciut && <span className="flex-1 whitespace-nowrap">{m.label}</span>}
                {!ciut && menunggu && (
                  <span
                    className="min-w-6 rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-center text-xs font-bold text-white"
                    title={`${jumlahMenunggu} unggahan menunggu dicek`}
                  >
                    {jumlahMenunggu}
                  </span>
                )}
              </NavLink>
            </DenganKeterangan>
          );
        })}
      </nav>

      <div className={cn("space-y-3 border-t border-[hsl(var(--sidebar-border))]", ciut ? "px-2 py-4" : "p-4")}>
        <DenganKeterangan aktif={ciut} teks={`${pengguna?.nama ?? ""} · ${NAMA_PERAN[pengguna?.peran] ?? ""}`}>
          <div className={cn("flex items-center gap-3", ciut && "justify-center")}>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--accent-foreground))]"
              aria-hidden
            >
              {inisial(pengguna?.nama)}
            </div>
            {!ciut && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground" title={pengguna?.email}>
                  {pengguna?.nama ?? "—"}
                </p>
                <p className="truncate text-xs text-[hsl(var(--sidebar-muted))]">
                  {NAMA_PERAN[pengguna?.peran] ?? ""}
                  {pengguna?.email ? ` · ${pengguna.email}` : ""}
                </p>
              </div>
            )}
          </div>
        </DenganKeterangan>
        <DenganKeterangan aktif={ciut} teks="Keluar">
          <button
            type="button"
            onClick={tekanKeluar}
            disabled={keluar.isPending}
            aria-label={ciut ? "Keluar" : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:opacity-60"
          >
            <FiLogOut className="h-4 w-4 shrink-0" aria-hidden />
            {!ciut && (keluar.isPending ? "Keluar…" : "Keluar")}
          </button>
        </DenganKeterangan>
        {!ciut && <p className="text-center text-xs text-[hsl(var(--sidebar-muted))]">Semua angka dalam rupiah penuh</p>}
      </div>
    </div>
  );
}
