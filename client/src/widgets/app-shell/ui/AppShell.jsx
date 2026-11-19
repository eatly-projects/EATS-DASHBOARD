// Kerangka aplikasi ala Accurate: bilah atas, bilah ikon modul di kiri, baris
// tab menu, lalu isi tab. Di HP bilah ikon diganti laci menu.
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { Skeleton } from "@/shared/ui/bits";
import { useSesi } from "@/entities/sesi";
import { useDaftarUnggahan } from "@/entities/unggahan";
import { menuDariPath, semuaMenu, useHak, useNavigasi } from "@/entities/navigasi";
import { KODE_DASHBOARD, useTab } from "../model/useTab";
import { BilahAtas } from "./BilahAtas";
import { RelModul } from "./RelModul";
import { PanelModul } from "./PanelModul";
import { BarisTab } from "./BarisTab";
import { IsiTab } from "./IsiTab";

export function AppShell() {
  const { data: pengguna } = useSesi();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const nav = useNavigasi();
  const { tab, buka, saring } = useTab();
  const [laciTerbuka, setLaciTerbuka] = useState(false);

  const hakUnggah = useHak("unggah_laporan");
  const daftarUnggahan = useDaftarUnggahan({ aktif: hakUnggah.lihat });
  const jumlahMenunggu = (daftarUnggahan.data ?? []).filter((u) => u.status === "menunggu_cek").length;

  const modul = nav.data?.modul ?? [];
  const menuPerKode = useMemo(() => new Map(semuaMenu(nav.data).map((m) => [m.kode, m])), [nav.data]);
  const menuAktif = pathname === "/" ? { kode: KODE_DASHBOARD } : nav.data ? menuDariPath(nav.data, pathname) : null;
  const kodeAktif = menuAktif?.kode ?? null;
  const modulAktif = menuPerKode.get(kodeAktif)?.modul ?? null;
  const namaTab = (kode) => (kode === KODE_DASHBOARD ? "Dashboard" : menuPerKode.get(kode)?.nama ?? "");

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
    document.title = `${namaTab(kodeAktif) || "EATS Dashboard"} · EATS Dashboard`;
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [kodeAktif]);

  return (
    <div className="min-h-screen bg-background">
      <BilahAtas pengguna={pengguna} onBukaLaci={() => setLaciTerbuka(true)} adaMenu={modul.length > 0} />
      <div className="flex">
        <RelModul modul={modul} modulAktif={modulAktif} jumlahMenunggu={jumlahMenunggu} />
        <div className="min-w-0 flex-1">
          <BarisTab namaTab={namaTab} kodeAktif={kodeAktif} />
          <main className="mx-auto max-w-[1400px] px-3 py-4 sm:px-5 md:px-6 md:py-6">
            {nav.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : (
              <IsiTab tab={tab} kodeAktif={kodeAktif} alamatAktif={pathname + search} />
            )}
          </main>
        </div>
      </div>

      <Sheet open={laciTerbuka} onOpenChange={setLaciTerbuka}>
        <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="space-y-6 pt-6">
            {modul.map((m) => (
              <PanelModul key={m.kode} modul={m} onPilih={() => setLaciTerbuka(false)} jumlahMenunggu={jumlahMenunggu} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
