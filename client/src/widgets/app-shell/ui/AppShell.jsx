// Kerangka aplikasi: sidebar bertulisan yang bisa dibuka-tutup di kiri, lalu baris
// tab menu ala Accurate, judul halaman, dan isi tab. Di HP sidebar jadi laci.
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { Skeleton } from "@/shared/ui/bits";
import { cn } from "@/shared/lib/cn";
import { useSesi } from "@/entities/sesi";
import { useDaftarUnggahan } from "@/entities/unggahan";
import { useJumlahPersetujuan } from "@/entities/persetujuan";
import { menuDariPath, semuaMenu, useHak, useNavigasi } from "@/entities/navigasi";
import { KODE_DASHBOARD, useTab } from "../model/useTab";
import { LEBAR_SIDEBAR, useSidebar } from "../model/useSidebar";
import { KETERANGAN_MENU } from "../model/ikon";
import { BilahAtas } from "./BilahAtas";
import { IsiSidebar } from "./Sidebar";
import { BarisTab } from "./BarisTab";
import { IsiTab } from "./IsiTab";

export function AppShell() {
  const { data: pengguna } = useSesi();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const nav = useNavigasi();
  const { tab, buka, saring } = useTab();
  const { ciut, alihkan } = useSidebar();
  const [laciTerbuka, setLaciTerbuka] = useState(false);

  const hakUnggah = useHak("unggah_laporan");
  const daftarUnggahan = useDaftarUnggahan({ aktif: hakUnggah.lihat });
  const jumlahMenunggu = (daftarUnggahan.data ?? []).filter((u) => u.status === "menunggu_cek").length;

  const modul = nav.data?.modul ?? [];
  const menuPerKode = useMemo(() => new Map(semuaMenu(nav.data).map((m) => [m.kode, m])), [nav.data]);
  const menuAktif = pathname === "/" ? { kode: KODE_DASHBOARD } : nav.data ? menuDariPath(nav.data, pathname) : null;
  const kodeAktif = menuAktif?.kode ?? null;
  const namaTab = (kode) => (kode === KODE_DASHBOARD ? "Dashboard" : menuPerKode.get(kode)?.nama ?? "");
  const judul = namaTab(kodeAktif);

  // Alamat browser -> tab. Alamat yang bukan milik menu yang boleh dibuka dialihkan ke Dashboard.
  useEffect(() => {
    if (!nav.data) return;
    const menu = pathname === "/" ? { kode: KODE_DASHBOARD } : menuDariPath(nav.data, pathname);
    if (menu) {
      buka(menu.kode, pathname + search);
    } else {
      toast.error("Halaman tidak ditemukan, atau Anda belum punya akses ke menu itu.", { id: "alamat-tidak-dikenal" });
      navigate("/", { replace: true });
    }
  }, [nav.data, pathname, search, buka, navigate]);

  // Hak dicabut atau ganti akun: tab yang tidak lagi boleh dibuka ikut tertutup.
  useEffect(() => {
    if (nav.data) saring(new Set(semuaMenu(nav.data).map((m) => m.kode)));
  }, [nav.data, saring]);

  useEffect(() => {
    document.title = `${judul || "EATS Dashboard"} · EATS Dashboard`;
  }, [judul]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [kodeAktif]);

  const hakPersetujuan = useHak("persetujuan");
  const jumlahPersetujuan = useJumlahPersetujuan(hakPersetujuan.lihat).data?.menunggu_saya ?? 0;
  const propsSidebar = { modul, kodeAktif, pengguna, lencana: { unggah_laporan: jumlahMenunggu, persetujuan: jumlahPersetujuan } };

  return (
    // --lebar-sidebar dipakai bilah yang menempel di bawah layar (mis. bilah Setujui) supaya tidak tertutup sidebar.
    <div
      className="min-h-screen bg-background md:flex"
      style={{ "--lebar-sidebar": ciut ? LEBAR_SIDEBAR.tertutup : LEBAR_SIDEBAR.terbuka }}
    >
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-screen shrink-0 border-r border-border transition-[width] duration-200 md:block print:hidden",
          ciut ? "w-[76px]" : "w-64",
        )}
      >
        <IsiSidebar {...propsSidebar} ciut={ciut} onAlihkan={alihkan} />
      </aside>

      <div className="min-w-0 flex-1">
        <BilahAtas pengguna={pengguna} onBukaLaci={() => setLaciTerbuka(true)} adaMenu={modul.length > 0} />
        <BarisTab namaTab={namaTab} kodeAktif={kodeAktif} />
        <main className="max-w-[1600px] px-3 py-5 sm:px-5 md:px-6 md:py-6 lg:px-8">
          {nav.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {judul && (
                <header className="mb-5 print:hidden">
                  <h1 className="text-2xl font-bold text-foreground md:text-[28px] md:leading-9">{judul}</h1>
                  {KETERANGAN_MENU[kodeAktif] && <p className="mt-1 text-sm text-muted-foreground md:text-base">{KETERANGAN_MENU[kodeAktif]}</p>}
                </header>
              )}
              <IsiTab tab={tab} kodeAktif={kodeAktif} alamatAktif={pathname + search} />
            </>
          )}
        </main>
      </div>

      <Sheet open={laciTerbuka} onOpenChange={setLaciTerbuka}>
        <SheetContent side="left" className="w-[85vw] max-w-xs border-0 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <IsiSidebar {...propsSidebar} onPilih={() => setLaciTerbuka(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
