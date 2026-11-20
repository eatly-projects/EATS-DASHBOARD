// Pengaturan > Penyetuju Transaksi: per tipe transaksi, apakah perlu persetujuan,
// mulai nilai berapa, dan siapa penyetujunya (cukup salah satu yang setuju).
import { useState } from "react";
import { FiSave } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { InputUang } from "@/shared/ui/InputUang";
import { useAturanPenyetuju, useSimpanAturan } from "@/entities/persetujuan";
import { useDaftarPengguna } from "@/entities/pengguna";
import { NAMA_PERAN } from "@/entities/sesi";
import { formatRupiah } from "@/shared/lib/uang";

const dariServer = (a) => ({ aktif: a.aktif, nilai_minimal: a.nilai_minimal ?? "", penyetuju: a.penyetuju.map((p) => p.id) });
const baku = (x) => JSON.stringify({ ...x, penyetuju: [...x.penyetuju].sort() });

function KartuAturan({ aturan, pengguna }) {
  const simpan = useSimpanAturan();
  const [awal, setAwal] = useState(() => dariServer(aturan));
  const [isian, setIsian] = useState(awal);
  const berubah = baku(isian) !== baku(awal);
  const ubah = (bagian) => setIsian((x) => ({ ...x, ...bagian }));
  const alihkan = (id) => ubah({ penyetuju: isian.penyetuju.includes(id) ? isian.penyetuju.filter((x) => x !== id) : [...isian.penyetuju, id] });
  const kurang = isian.aktif && !isian.penyetuju.length ? "Pilih paling sedikit satu penyetuju." : null;
  const kunci = aturan.tipe_transaksi;

  const ringkasan = !isian.aktif
    ? "Tidak perlu persetujuan: transaksi langsung tersimpan dan masuk laporan."
    : `Transaksi ${isian.nilai_minimal ? `mulai ${formatRupiah(isian.nilai_minimal)}` : "berapa pun nilainya"} harus disetujui salah satu penyetuju sebelum masuk laporan.`;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6" aria-label={aturan.nama}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">{aturan.nama}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{ringkasan}</p>
        </div>
        <Button
          onClick={() =>
            simpan.mutate(
              { tipe: kunci, aktif: isian.aktif, nilai_minimal: isian.nilai_minimal || null, penyetuju: isian.penyetuju },
              {
                onSuccess: (a) => {
                  setAwal(dariServer(a));
                  setIsian(dariServer(a));
                },
              },
            )
          }
          disabled={!berubah || Boolean(kurang) || simpan.isPending}
          className="gap-2"
        >
          <FiSave className="h-4 w-4" aria-hidden /> {simpan.isPending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={isian.aktif} onChange={(e) => ubah({ aktif: e.target.checked })} />
        Transaksi {aturan.nama} perlu disetujui dulu
      </label>

      {isian.aktif && (
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor={`min-${kunci}`}>Mulai nilai</Label>
            <InputUang id={`min-${kunci}`} value={isian.nilai_minimal} onChange={(v) => ubah({ nilai_minimal: v })} placeholder="Kosong = semua nilai" />
            <p className="text-xs text-muted-foreground">Transaksi di bawah nilai ini langsung tersimpan tanpa persetujuan.</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Penyetuju (cukup salah satu yang setuju)</p>
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {pengguna.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/60">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={isian.penyetuju.includes(p.id)}
                      onChange={() => alihkan(p.id)}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{p.nama}</span>
                      <span className="block break-all text-xs text-muted-foreground">
                        {p.email} · {NAMA_PERAN[p.peran] ?? p.peran}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {kurang && <p className="text-xs text-destructive">{kurang}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

export function PenyetujuTransaksiPage() {
  const q = useAturanPenyetuju();
  const pengguna = useDaftarPengguna();
  if (q.isError) return <ErrorState pesan={q.error?.message} />;
  if (q.isPending || pengguna.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }
  const aktif = (pengguna.data ?? []).filter((p) => p.aktif);
  return (
    <div className="space-y-4">
      {q.data.map((a) => (
        <KartuAturan key={`${a.tipe_transaksi}-${a.aktif}-${a.penyetuju.length}`} aturan={a} pengguna={aktif} />
      ))}
    </div>
  );
}
