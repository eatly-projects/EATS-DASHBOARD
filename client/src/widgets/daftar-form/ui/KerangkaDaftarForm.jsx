// Pola Accurate di dalam satu tab menu: sub-tab "Daftar" lalu satu sub-tab per
// data yang dibuka ("Pengguna baru", atau nama datanya). Sub-tab yang tidak aktif
// disembunyikan, bukan dibuang, jadi isian formulirnya tetap ada.
import { useState } from "react";
import { FiList, FiPlus, FiX } from "react-icons/fi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { cn } from "@/shared/lib/cn";

let urutan = 0;

const kapital = (teks) => teks.charAt(0).toUpperCase() + teks.slice(1);

const GAYA_SUBTAB = "-mb-px flex h-10 items-center border-b-2 text-sm transition-colors";
const SUBTAB_AKTIF = "border-[hsl(var(--primary))] font-semibold text-foreground";
const SUBTAB_LAIN = "border-transparent text-muted-foreground hover:border-border hover:text-foreground";

export function KerangkaDaftarForm({ namaData, bisaBuat = false, renderDaftar, renderForm }) {
  const [terbuka, setTerbuka] = useState([]); // [{ kunci, id, judul, berubah }]
  const [aktif, setAktif] = useState("daftar");
  const [mauDitutup, setMauDitutup] = useState(null);

  // Hanya mengubah state kalau isinya memang berbeda, supaya formulir yang memanggil
  // ini di dalam effect tidak memicu render tanpa henti.
  const perbarui = (kunci, ubah) =>
    setTerbuka((daftar) => {
      const x = daftar.find((t) => t.kunci === kunci);
      if (!x || Object.entries(ubah).every(([k, v]) => x[k] === v)) return daftar;
      return daftar.map((t) => (t.kunci === kunci ? { ...t, ...ubah } : t));
    });

  const buka = (id, judul) => {
    const ada = terbuka.find((t) => t.id === id);
    if (ada) return setAktif(ada.kunci);
    const kunci = `data-${++urutan}`;
    setTerbuka((daftar) => [...daftar, { kunci, id, judul, berubah: false }]);
    setAktif(kunci);
  };

  const bukaBaru = () => {
    const kunci = `baru-${++urutan}`;
    setTerbuka((daftar) => [...daftar, { kunci, id: null, judul: `${kapital(namaData)} baru`, berubah: false }]);
    setAktif(kunci);
  };

  const tutupLangsung = (kunci) => {
    setTerbuka((daftar) => daftar.filter((t) => t.kunci !== kunci));
    setAktif((a) => (a === kunci ? "daftar" : a));
  };

  const mintaTutup = (t) => (t.berubah ? setMauDitutup(t) : tutupLangsung(t.kunci));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-border">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3">
          <button
            type="button"
            onClick={() => setAktif("daftar")}
            className={cn(GAYA_SUBTAB, "gap-1.5 px-1", aktif === "daftar" ? SUBTAB_AKTIF : SUBTAB_LAIN)}
          >
            <FiList className="h-4 w-4" aria-hidden /> Daftar
          </button>
          {terbuka.map((t) => (
            <div key={t.kunci} className={cn(GAYA_SUBTAB, "max-w-[18rem]", aktif === t.kunci ? SUBTAB_AKTIF : SUBTAB_LAIN)}>
              <button type="button" onClick={() => setAktif(t.kunci)} className="min-w-0 truncate py-1.5 pl-1 pr-1.5" title={t.judul}>
                {t.berubah && <span className="mr-1 text-[hsl(var(--primary))]" aria-label="belum disimpan">•</span>}
                {t.judul}
              </button>
              <button
                type="button"
                onClick={() => mintaTutup(t)}
                aria-label={`Tutup ${t.judul}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <FiX className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        {bisaBuat && (
          <button
            type="button"
            onClick={bukaBaru}
            className="mb-2 flex h-10 items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
          >
            <FiPlus className="h-4 w-4" aria-hidden /> Tambah {namaData}
          </button>
        )}
      </div>

      <div className={aktif === "daftar" ? "" : "hidden"}>{renderDaftar({ buka, bukaBaru })}</div>
      {terbuka.map((t) => (
        <div key={t.kunci} className={aktif === t.kunci ? "" : "hidden"}>
          {renderForm({
            id: t.id,
            tutup: () => tutupLangsung(t.kunci),
            setelahSimpan: (idBaru, judul) => perbarui(t.kunci, { id: idBaru, judul, berubah: false }),
            tandaiBerubah: (berubah) => perbarui(t.kunci, { berubah }),
          })}
        </div>
      ))}

      <AlertDialog open={Boolean(mauDitutup)} onOpenChange={(o) => !o && setMauDitutup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tutup tanpa menyimpan?</AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan di &ldquo;{mauDitutup?.judul}&rdquo; belum disimpan dan akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali ke formulir</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                tutupLangsung(mauDitutup.kunci);
                setMauDitutup(null);
              }}
            >
              Tutup tanpa menyimpan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
