import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/cn";
import { useSesi } from "@/entities/sesi";
import { useDaftarUnggahan } from "@/entities/unggahan";
import { IsiSidebar, Merek } from "./IsiSidebar";
import { judulHalaman } from "../model/navigasi";
import { useSidebar } from "../model/useSidebar";

const hariIni = () =>
  new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function AppShell() {
  const { data: pengguna } = useSesi();
  const { pathname } = useLocation();
  const [laciTerbuka, setLaciTerbuka] = useState(false);
  const { ciut, alihkan } = useSidebar();
  const daftar = useDaftarUnggahan();
  const jumlahMenunggu = (daftar.data ?? []).filter((u) => u.status === "menunggu_cek").length;
  const { judul, sub } = judulHalaman(pathname);
  const namaDepan = String(pengguna?.nama ?? "").trim().split(/\s+/)[0];

  useEffect(() => {
    document.title = `${judul} · EATS Dashboard`;
  }, [judul]);

  // Pindah halaman selalu mulai dari atas (mis. setelah "Benar, simpan" ke Ringkasan).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop: menempel setinggi layar, tidak ikut memanjang (pelajaran PLD).
          Bisa diciutkan jadi bilah ikon lewat tombol di kiri judul halaman. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 self-start overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none md:block",
          ciut ? "w-[76px]" : "w-64",
        )}
      >
        <IsiSidebar pengguna={pengguna} jumlahMenunggu={jumlahMenunggu} ciut={ciut} />
      </aside>

      {/* Bilah atas HP */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-2 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setLaciTerbuka(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted"
          aria-label="Buka menu"
        >
          <FiMenu className="h-5 w-5" />
          {jumlahMenunggu > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))] ring-2 ring-card" aria-hidden />}
        </button>
        <Merek kecil />
      </div>
      <Sheet open={laciTerbuka} onOpenChange={setLaciTerbuka}>
        <SheetContent side="left" className="w-[85vw] max-w-xs border-0 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <IsiSidebar pengguna={pengguna} jumlahMenunggu={jumlahMenunggu} onPilih={() => setLaciTerbuka(false)} />
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1 pt-14 md:pt-0">
        <header className="border-b border-border bg-card px-4 py-5 sm:px-6 md:px-8 md:py-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="flex min-w-0 items-start gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={alihkan}
                    aria-label={ciut ? "Buka menu samping" : "Tutup menu samping"}
                    aria-expanded={!ciut}
                    className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted md:flex"
                  >
                    <FiMenu className="h-5 w-5" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{ciut ? "Buka menu samping" : "Tutup menu samping"}</TooltipContent>
              </Tooltip>
              <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground md:text-[28px] md:leading-9">{judul}</h1>
              {sub && <p className="mt-1 text-sm text-muted-foreground md:text-[15px]">{sub}</p>}
              </div>
            </div>
            {pengguna && (
              <div className="hidden text-right lg:block">
                <p className="text-sm font-semibold text-foreground">Halo, {namaDepan || pengguna.nama}</p>
                <p className="text-xs text-muted-foreground">{hariIni()}</p>
              </div>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-[1400px] px-3 py-5 sm:px-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
