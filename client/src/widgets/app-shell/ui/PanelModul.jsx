import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/cn";
import { WARNA_JENIS, ikonMenu } from "../model/ikon";

/**
 * Isi satu modul: judul, garis merek, lalu kotak-kotak menu berwarna menurut
 * jenisnya (pola Accurate). Dipakai panel melayang di desktop dan laci di HP.
 */
export function PanelModul({ modul, onPilih, jumlahMenunggu = 0 }) {
  return (
    <section aria-label={modul.nama}>
      <h2 className="text-lg font-semibold text-foreground">{modul.nama}</h2>
      <div className="mt-2 h-0.5 rounded-full bg-[hsl(var(--primary))]" aria-hidden />
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5">
        {modul.menu.map((menu) => {
          const Ikon = ikonMenu(menu.kode);
          const lencana = menu.kode === "unggah_laporan" && jumlahMenunggu > 0;
          return (
            <li key={menu.kode}>
              <Link
                to={menu.path}
                onClick={onPilih}
                className={cn(
                  "relative flex h-[104px] flex-col items-center justify-center gap-2 rounded-lg border p-2 text-center text-[13px] font-semibold leading-tight transition-[filter,transform] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] active:scale-[0.98]",
                  WARNA_JENIS[menu.jenis],
                )}
              >
                <Ikon className="h-7 w-7 shrink-0" aria-hidden />
                <span>{menu.nama}</span>
                {lencana && (
                  <span
                    className="absolute right-1.5 top-1.5 min-w-6 rounded-full bg-[hsl(var(--primary))] px-1.5 py-0.5 text-xs font-bold text-white"
                    title={`${jumlahMenunggu} unggahan menunggu dicek`}
                  >
                    {jumlahMenunggu}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
