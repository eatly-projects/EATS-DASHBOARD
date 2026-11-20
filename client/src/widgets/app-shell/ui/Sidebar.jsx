// Sidebar bertulisan yang bisa dibuka-tutup. Dipakai sidebar desktop dan laci di HP,
// jadi menunya selalu sama. Saat ditutup hanya kotak ikon yang tampil, dan nama
// menu muncul sebagai keterangan saat ditunjuk.
import { Link, useNavigate } from "react-router-dom";
import { FiChevronsLeft, FiChevronsRight, FiGrid, FiLogOut } from "react-icons/fi";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/cn";
import { NAMA_PERAN, useKeluar } from "@/entities/sesi";
import { usePreferensi } from "@/entities/preferensi";
import { KODE_DASHBOARD } from "../model/useTab";
import { KOTAK_JENIS, ikonMenu, urutkanModul } from "../model/ikon";

export function inisial(nama) {
  const kata = String(nama ?? "").trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return "?";
  return (kata[0][0] + (kata[1]?.[0] ?? "")).toUpperCase();
}

/** Logo "E". Dengan tulisan: nama aplikasi dan nama perusahaan di bawahnya. */
export function Merek({ hanyaLogo = false, perusahaan }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-base font-extrabold text-white shadow-gold"
        aria-hidden
      >
        E
      </div>
      {!hanyaLogo && (
        <div className="min-w-0">
          <p className="whitespace-nowrap text-base font-bold leading-tight text-foreground">EATS Dashboard</p>
          {perusahaan && <p className="break-words text-xs leading-snug text-muted-foreground">{perusahaan}</p>}
        </div>
      )}
    </div>
  );
}

/** Keterangan di samping saat sidebar ditutup; saat terbuka tulisannya sudah terlihat. */
function DenganKeterangan({ tampil, teks, children }) {
  if (!tampil) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {teks}
      </TooltipContent>
    </Tooltip>
  );
}

function ItemMenu({ menu, nama, Ikon, kotak, aktif, ciut, lencana, onPilih }) {
  const teks = lencana ? `${nama} (${lencana} menunggu)` : nama;
  return (
    <li>
      <DenganKeterangan tampil={ciut} teks={teks}>
        <Link
          to={menu.path}
          onClick={onPilih}
          aria-current={aktif ? "page" : undefined}
          aria-label={ciut ? teks : undefined}
          className={cn(
            "relative flex items-center rounded-lg py-2 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
            ciut ? "justify-center px-0" : "gap-3 px-2.5",
            aktif
              ? "bg-[hsl(var(--sidebar-active))] font-semibold text-[hsl(var(--sidebar-active-foreground))] before:absolute before:inset-y-2 before:-left-2 before:w-1 before:rounded-full before:bg-[hsl(var(--primary))]"
              : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground",
          )}
        >
          <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", kotak)}>
            <Ikon className="h-[18px] w-[18px]" aria-hidden />
            {ciut && lencana > 0 && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))] ring-2 ring-card" aria-hidden />
            )}
          </span>
          {!ciut && <span className="min-w-0 flex-1 leading-snug">{nama}</span>}
          {!ciut && lencana > 0 && (
            <span
              className="min-w-6 shrink-0 rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-center text-xs font-bold text-white"
              title={`${lencana} menunggu`}
            >
              {lencana}
            </span>
          )}
        </Link>
      </DenganKeterangan>
    </li>
  );
}

/**
 * Isi sidebar.
 * - `ciut`: hanya ikon (sidebar desktop yang ditutup).
 * - `onAlihkan`: tombol buka/tutup; tidak ada di laci HP.
 * - `onPilih`: dipanggil setelah menu diklik (menutup laci HP).
 */
export function IsiSidebar({ modul, kodeAktif, lencana = {}, pengguna, ciut = false, onAlihkan, onPilih }) {
  const keluar = useKeluar();
  const navigate = useNavigate();
  const { data: perusahaan } = usePreferensi();

  const semua = modul.flatMap((m) => m.menu);
  const dashboard = semua.find((m) => m.kode === KODE_DASHBOARD);
  const grup = urutkanModul(modul)
    .map((m) => ({ ...m, menu: m.menu.filter((x) => x.kode !== KODE_DASHBOARD) }))
    .filter((m) => m.menu.length > 0);

  const tekanKeluar = () =>
    keluar.mutate(undefined, {
      onSettled: () => {
        onPilih?.();
        navigate("/masuk", { replace: true });
      },
    });

  const namaAlihkan = ciut ? "Buka menu samping" : "Tutup menu samping";

  return (
    <div className="flex h-full flex-col bg-card text-[hsl(var(--sidebar-foreground))]">
      <div className={cn("flex border-b border-border", ciut ? "flex-col items-center gap-2 px-2 py-3" : "items-start gap-2 px-4 py-4")}>
        <div className="min-w-0 flex-1">
          <Merek hanyaLogo={ciut} perusahaan={perusahaan?.nama} />
        </div>
        {onAlihkan && (
          <DenganKeterangan tampil teks={namaAlihkan}>
            <button
              type="button"
              onClick={onAlihkan}
              aria-label={namaAlihkan}
              aria-expanded={!ciut}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              {ciut ? <FiChevronsRight className="h-4 w-4" aria-hidden /> : <FiChevronsLeft className="h-4 w-4" aria-hidden />}
            </button>
          </DenganKeterangan>
        )}
      </div>

      <nav className={cn("flex-1 overflow-y-auto py-3", ciut ? "px-2" : "px-3")} aria-label="Menu utama">
        {dashboard && (
          <ul>
            <ItemMenu
              menu={dashboard}
              nama="Dashboard"
              Ikon={FiGrid}
              kotak="bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"
              aktif={kodeAktif === KODE_DASHBOARD}
              ciut={ciut}
              onPilih={onPilih}
            />
          </ul>
        )}
        {grup.map((m) => (
          <section key={m.kode} aria-label={m.nama} className="mt-3">
            {ciut ? (
              <div className="mx-2 mb-2 h-px bg-border" aria-hidden />
            ) : (
              <h2 className="px-2.5 pb-1 text-xs font-semibold text-muted-foreground">{m.nama}</h2>
            )}
            <ul className="space-y-0.5">
              {m.menu.map((menu) => (
                <ItemMenu
                  key={menu.kode}
                  menu={menu}
                  nama={menu.nama}
                  Ikon={ikonMenu(menu.kode)}
                  kotak={KOTAK_JENIS[menu.jenis]}
                  aktif={kodeAktif === menu.kode}
                  ciut={ciut}
                  lencana={lencana[menu.kode] ?? 0}
                  onPilih={onPilih}
                />
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className={cn("border-t border-border", ciut ? "flex flex-col items-center gap-2 px-2 py-3" : "space-y-1 p-3")}>
        <div className={cn("flex items-center", ciut ? "flex-col" : "gap-3 px-1 py-1")}>
          <DenganKeterangan tampil={ciut} teks={`${pengguna?.nama ?? ""}, ${NAMA_PERAN[pengguna?.peran] ?? ""}`}>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--accent-foreground))]"
              aria-label={ciut ? `${pengguna?.nama ?? ""}, ${NAMA_PERAN[pengguna?.peran] ?? ""}` : undefined}
            >
              {inisial(pengguna?.nama)}
            </div>
          </DenganKeterangan>
          {!ciut && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-foreground">{pengguna?.nama}</p>
              <p className="text-xs text-muted-foreground">{NAMA_PERAN[pengguna?.peran] ?? ""}</p>
            </div>
          )}
        </div>
        <DenganKeterangan tampil={ciut} teks="Keluar">
          <button
            type="button"
            onClick={tekanKeluar}
            disabled={keluar.isPending}
            aria-label={ciut ? "Keluar" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
              ciut ? "h-9 w-9 justify-center" : "h-9 w-full px-2.5",
            )}
          >
            <FiLogOut className="h-4 w-4" aria-hidden />
            {!ciut && (keluar.isPending ? "Keluar…" : "Keluar")}
          </button>
        </DenganKeterangan>
      </div>
    </div>
  );
}
