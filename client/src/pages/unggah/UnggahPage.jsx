import { FiCheckCircle, FiCpu, FiEdit3 } from "react-icons/fi";
import { KotakUnggah } from "@/features/unggah-berkas/ui/KotakUnggah";
import { RiwayatUnggahan } from "./ui/RiwayatUnggahan";

const LANGKAH = [
  { ikon: FiCpu, judul: "AI membaca", isi: "Claude membaca berkas (cadangan: Gemini) dan menyusun angka mana masuk pos apa." },
  { ikon: FiEdit3, judul: "Anda mengecek", isi: "Hasilnya dicocokkan dengan total di berkas. Angka yang meragukan diberi tanda kuning dan bisa diubah." },
  { ikon: FiCheckCircle, judul: "Disetujui, baru tersimpan", isi: "Data bulan yang sama diganti, tidak pernah dobel. Belum disetujui = belum masuk dashboard." },
];

export function UnggahPage() {
  return (
    <div className="space-y-6">
      <KotakUnggah />
      <ol className="grid gap-3 lg:grid-cols-3">
        {LANGKAH.map((l, i) => (
          <li key={l.judul} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
              <l.ikon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-bold text-foreground">
                {i + 1}. {l.judul}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{l.isi}</p>
            </div>
          </li>
        ))}
      </ol>
      <RiwayatUnggahan />
    </div>
  );
}
