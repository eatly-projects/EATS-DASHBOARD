import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/cn";
import { ikonModul } from "../model/ikon";
import { PanelModul } from "./PanelModul";

/**
 * Bilah ikon modul di kiri (tablet dan desktop), seperti Accurate. Klik ikon
 * membuka panel melayang berisi kotak menu modul itu.
 */
export function RelModul({ modul, modulAktif, jumlahMenunggu }) {
  const [terbuka, setTerbuka] = useState(null);
  return (
    <nav
      aria-label="Modul"
      className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-[hsl(var(--rel))] py-3 md:flex"
    >
      {modul.map((m) => {
        const Ikon = ikonModul(m.kode);
        const aktif = m.kode === modulAktif;
        const titik = m.kode === "laporan" && jumlahMenunggu > 0;
        return (
          <Popover key={m.kode} open={terbuka === m.kode} onOpenChange={(o) => setTerbuka(o ? m.kode : null)}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={m.nama}
                    className={cn(
                      "relative flex h-11 w-11 items-center justify-center rounded-lg text-[hsl(var(--rel-foreground))]/80 transition-colors hover:bg-[hsl(var(--rel-hover))] hover:text-[hsl(var(--rel-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                      (aktif || terbuka === m.kode) &&
                        "bg-[hsl(var(--rel-hover))] text-[hsl(var(--rel-foreground))] before:absolute before:-left-2.5 before:inset-y-2 before:w-1 before:rounded-full before:bg-white",
                    )}
                  >
                    <Ikon className="h-5 w-5" aria-hidden />
                    {titik && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-[hsl(var(--rel))]" aria-hidden />}
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {m.nama}
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="right" align="start" sideOffset={14} className="w-[30rem] max-w-[calc(100vw-6rem)] p-4">
              <PanelModul modul={m} onPilih={() => setTerbuka(null)} jumlahMenunggu={jumlahMenunggu} />
            </PopoverContent>
          </Popover>
        );
      })}
    </nav>
  );
}
