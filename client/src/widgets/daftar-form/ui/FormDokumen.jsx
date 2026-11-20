// Formulir: bagian-bagiannya (Umum, Hak Akses, …) disusun bertumpuk ke bawah, dan
// tombol aksi (Simpan, Hapus) ada di kolom kanan seperti Accurate. Di HP tombol
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
        "flex items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
        hp ? "h-11 flex-1 px-3" : "h-10 w-full px-4",
        GAYA_AKSI[a.nada ?? "biasa"],
      )}
    >
      {Ikon && <Ikon className={cn("h-4 w-4", a.memuat && "animate-pulse")} aria-hidden />}
      <span>{a.memuat ? a.labelMemuat ?? `${a.label}…` : a.label}</span>
    </button>
  );
}

/**
 * `tab`: bagian formulir [{ kunci, judul, isi }], ditampilkan bertumpuk berurutan.
 * `catatan`: kalimat pendek di dekat tombol, mis. kenapa Simpan belum bisa ditekan.
 */
export function FormDokumen({ tab, aksi = [], catatan = null }) {
  const [konfirmasi, setKonfirmasi] = useState(null);
  const tekan = (a) => (a.konfirmasi ? setKonfirmasi(a) : a.onClick());

  return (
    <div className="flex items-start gap-5">
      <div className={cn("min-w-0 flex-1 space-y-4", aksi.length && (catatan ? "pb-32 md:pb-0" : "pb-20 md:pb-0"))}>
        {tab.map((t) => (
          <section key={t.kunci} aria-label={t.judul} className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            {tab.length > 1 && <h3 className="mb-4 text-base font-bold text-foreground md:text-lg">{t.judul}</h3>}
            {t.isi}
          </section>
        ))}
      </div>

      {aksi.length > 0 && (
        <>
          <aside className="sticky top-16 hidden w-40 shrink-0 flex-col gap-2 md:flex print:hidden" aria-label="Aksi">
            {aksi.map((a) => (
              <TombolAksi key={a.kunci} a={a} onTekan={() => tekan(a)} />
            ))}
            {catatan && <p className="text-xs leading-snug text-muted-foreground">{catatan}</p>}
          </aside>
          <div className="fixed inset-x-0 bottom-0 z-30 space-y-2 border-t border-border bg-card p-3 shadow-elevated md:hidden print:hidden">
            {catatan && <p className="text-xs leading-snug text-muted-foreground">{catatan}</p>}
            <div className="flex gap-2">
              {aksi.map((a) => (
                <TombolAksi key={a.kunci} a={a} onTekan={() => tekan(a)} hp />
              ))}
            </div>
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
