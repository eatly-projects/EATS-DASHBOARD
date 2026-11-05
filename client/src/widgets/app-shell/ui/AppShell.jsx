import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { NAMA_PERAN, useSesi } from "@/entities/sesi";
import { useDaftarUnggahan } from "@/entities/unggahan";
import { IsiSidebar } from "./IsiSidebar";
import { judulHalaman } from "../model/navigasi";

export function AppShell() {
  const { data: pengguna } = useSesi();
  const { pathname } = useLocation();
  const [laciTerbuka, setLaciTerbuka] = useState(false);
  const daftar = useDaftarUnggahan();
  const jumlahMenunggu = (daftar.data ?? []).filter((u) => u.status === "menunggu_cek").length;
  const { judul, sub } = judulHalaman(pathname);

  useEffect(() => {
    document.title = `${judul} · EATS Dashboard`;
  }, [judul]);

  // Pindah halaman selalu mulai dari atas (mis. setelah "Benar, simpan" ke Ringkasan).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop: menempel setinggi layar, tidak ikut memanjang (pelajaran PLD). */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 self-start md:block">
        <IsiSidebar pengguna={pengguna} jumlahMenunggu={jumlahMenunggu} />
      </aside>

      {/* Bilah atas HP */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] px-3 md:hidden">
        <button
          type="button"
          onClick={() => setLaciTerbuka(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-[hsl(var(--sidebar-hover))]"
          aria-label="Buka menu"
        >
          <FiMenu className="h-5 w-5" />
          {jumlahMenunggu > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--accent))]" aria-hidden />}
        </button>
        <p className="truncate font-display text-base text-white">{judul}</p>
      </div>
      <Sheet open={laciTerbuka} onOpenChange={setLaciTerbuka}>
        <SheetContent side="left" className="w-[85vw] max-w-xs border-0 p-0 [&>button]:text-white [&>button]:opacity-80">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <IsiSidebar pengguna={pengguna} jumlahMenunggu={jumlahMenunggu} onPilih={() => setLaciTerbuka(false)} />
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1 pt-14 md:pt-0">
        <header className="border-b border-border/60 bg-card/60 px-4 py-4 backdrop-blur sm:px-6 md:px-8 md:py-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--primary))]">PT EATS</p>
              <h1 className="mt-0.5 font-display text-2xl font-medium text-foreground md:text-3xl">{judul}</h1>
              {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
            </div>
            {pengguna && (
              <p className="hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground md:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--success))]" aria-hidden />
                Masuk sebagai <span className="font-medium text-foreground">{pengguna.nama}</span> · {NAMA_PERAN[pengguna.peran] ?? ""}
              </p>
            )}
          </div>
        </header>
        <div className="px-3 py-5 sm:px-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
