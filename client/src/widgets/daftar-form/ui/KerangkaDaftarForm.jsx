// Pola Accurate di dalam satu tab menu: tombol daftar (hijau) lalu satu sub-tab
// per data yang dibuka ("Data baru", atau nama datanya). Sub-tab yang tidak aktif
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
    setTerbuka((daftar) => [...daftar, { kunci, id: null, judul: "Data baru", berubah: false }]);
    setAktif(kunci);
  };

  const tutupLangsung = (kunci) => {
    setTerbuka((daftar) => daftar.filter((t) => t.kunci !== kunci));
    setAktif((a) => (a === kunci ? "daftar" : a));
  };

  const mintaTutup = (t) => (t.berubah ? setMauDitutup(t) : tutupLangsung(t.kunci));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-1.5 border-b border-border">
        <button
          type="button"
          onClick={() => setAktif("daftar")}
          aria-label={`Daftar ${namaData}`}
          title={`Daftar ${namaData}`}
          className={cn(
            "mb-1.5 flex h-9 w-11 items-center justify-center rounded-md border text-[hsl(var(--jenis-transaksi-isi))] transition-colors",
            aktif === "daftar"
              ? "border-[hsl(var(--jenis-transaksi-isi))] bg-[hsl(var(--jenis-transaksi-isi))] text-white"
              : "border-[hsl(var(--jenis-transaksi-garis))] bg-[hsl(var(--jenis-transaksi))] hover:brightness-95",
          )}
        >
          <FiList className="h-5 w-5" aria-hidden />
        </button>
        {terbuka.map((t) => (
          <div
            key={t.kunci}
            className={cn(
              "flex h-9 max-w-[16rem] items-center rounded-t-md border border-b-0 text-sm",
              aktif === t.kunci ? "border-border bg-card font-semibold text-foreground" : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <button type="button" onClick={() => setAktif(t.kunci)} className="min-w-0 truncate py-1.5 pl-3 pr-2" title={t.judul}>
              {t.berubah && <span className="mr-1 text-[hsl(var(--primary))]" aria-label="belum disimpan">•</span>}
              {t.judul}
            </button>
            <button
              type="button"
              onClick={() => mintaTutup(t)}
              aria-label={`Tutup ${t.judul}`}
              className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
            >
              <FiX className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
        {bisaBuat && (
          <button
            type="button"
            onClick={bukaBaru}
            className="mb-1.5 ml-auto flex h-9 items-center gap-1.5 rounded-md bg-[hsl(var(--primary))] px-3 text-sm font-semibold text-white hover:bg-[hsl(var(--primary))]/90"
          >
            <FiPlus className="h-4 w-4" aria-hidden /> Data baru
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
