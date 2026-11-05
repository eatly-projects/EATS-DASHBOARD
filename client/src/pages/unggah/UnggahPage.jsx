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
          <li key={l.judul} className="flex gap-3 rounded-xl border border-border/60 bg-card/70 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
              <l.ikon className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {i + 1}. {l.judul}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{l.isi}</p>
            </div>
          </li>
        ))}
      </ol>
      <RiwayatUnggahan />
    </div>
  );
}
