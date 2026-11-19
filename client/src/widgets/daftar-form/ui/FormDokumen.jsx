// Formulir ala Accurate: tab di atas (Umum, Hak Akses, …) dan kolom tombol aksi
// di kanan (Simpan, Hapus). Di HP semua bagian disusun bertumpuk dan tombol
// aksi pindah ke bilah bawah yang menempel.
import { useState } from "react";
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

const GAYA_AKSI = {
  utama: "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90",
  bahaya: "border-destructive/40 bg-card text-destructive hover:bg-destructive/5",
  biasa: "border-border bg-card text-foreground hover:bg-muted",
};

function TombolAksi({ a, onTekan, hp }) {
  const Ikon = a.ikon;
  return (
    <button
      type="button"
      onClick={onTekan}
      disabled={a.nonaktif || a.memuat}
      className={cn(
        "flex items-center justify-center rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        hp ? "h-11 flex-1 gap-2 px-3 text-sm" : "h-[72px] w-[88px] flex-col gap-1.5 text-xs",
        GAYA_AKSI[a.nada ?? "biasa"],
      )}
    >
      {Ikon && <Ikon className={cn(hp ? "h-4 w-4" : "h-5 w-5", a.memuat && "animate-pulse")} aria-hidden />}
      <span>{a.memuat ? a.labelMemuat ?? `${a.label}…` : a.label}</span>
    </button>
  );
}

export function FormDokumen({ tab, aksi = [] }) {
  const [aktif, setAktif] = useState(tab[0]?.kunci);
  const [konfirmasi, setKonfirmasi] = useState(null);
  const tekan = (a) => (a.konfirmasi ? setKonfirmasi(a) : a.onClick());

  return (
    <div className="flex items-start gap-4">
      <div className={cn("min-w-0 flex-1 space-y-4", aksi.length && "pb-20 md:pb-0")}>
        {tab.length > 1 && (
          <div className="hidden gap-1 border-b border-border md:flex" role="tablist">
            {tab.map((t) => (
              <button
                key={t.kunci}
                type="button"
                role="tab"
                aria-selected={aktif === t.kunci}
                onClick={() => setAktif(t.kunci)}
                className={cn(
                  "-mb-px rounded-t-md border border-b-0 px-4 py-2 text-sm",
                  aktif === t.kunci ? "border-border bg-card font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.judul}
              </button>
            ))}
          </div>
        )}
        {tab.map((t) => (
          <section key={t.kunci} className={cn("rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5", aktif !== t.kunci && "md:hidden")}>
            {tab.length > 1 && <h3 className="mb-3 text-base font-bold text-foreground md:hidden">{t.judul}</h3>}
            {t.isi}
          </section>
        ))}
      </div>

      {aksi.length > 0 && (
        <>
          <aside className="sticky top-32 hidden shrink-0 flex-col gap-2 md:flex" aria-label="Aksi">
            {aksi.map((a) => (
              <TombolAksi key={a.kunci} a={a} onTekan={() => tekan(a)} />
            ))}
          </aside>
          <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-card p-3 shadow-elevated md:hidden">
            {aksi.map((a) => (
              <TombolAksi key={a.kunci} a={a} onTekan={() => tekan(a)} hp />
            ))}
          </div>
        </>
      )}

      <AlertDialog open={Boolean(konfirmasi)} onOpenChange={(o) => !o && setKonfirmasi(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{konfirmasi?.konfirmasi?.judul}</AlertDialogTitle>
            <AlertDialogDescription>{konfirmasi?.konfirmasi?.isi}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                konfirmasi.onClick();
                setKonfirmasi(null);
              }}
            >
              {konfirmasi?.konfirmasi?.tombol ?? konfirmasi?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
