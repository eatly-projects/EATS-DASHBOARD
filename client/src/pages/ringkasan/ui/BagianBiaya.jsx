// Bagian 3 · Ke mana biayanya pergi: biaya operasional bulan terpilih per pos
// (batang HTML supaya nama pos panjang tetap terbaca di HP), plus rincian
// biaya lain-lain.
import { CardBox, EmptyState, SectionHeader } from "@/shared/ui/bits";
import { cn } from "@/shared/lib/cn";
import { namaBulan, periodeSebelum, persen, rupiah } from "@/shared/lib/format";
import { perubahan } from "../lib/ringkasan";

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

function susunBiaya(bulanIni, daftarPos) {
  if (!bulanIni) return [];
  const pos = bulanIni.pos ?? {};
  const u = bulanIni.ukuran ?? {};
  const item = daftarPos
    .filter((p) => p.kelompok === "biaya_maklon" && ada(pos[p.kode]))
    .map((p) => ({ kunci: p.kode, label: p.nama, nilai: Number(pos[p.kode]) }));
  if (ada(u.biaya_lainnya)) item.push({ kunci: "_lainnya", label: "Biaya lain-lain (rincian di samping)", nilai: Number(u.biaya_lainnya) });
  if (ada(u.total_biaya_dimples)) item.push({ kunci: "_dimples", label: "Biaya operasional Dimples", nilai: Number(u.total_biaya_dimples) });
  return item.filter((i) => i.nilai !== 0).sort((a, b) => b.nilai - a.nilai);
}

function nilaiItemLalu(kunci, bulanLalu) {
  if (!bulanLalu) return null;
  if (kunci === "_lainnya") return bulanLalu.ukuran?.biaya_lainnya ?? null;
  if (kunci === "_dimples") return bulanLalu.ukuran?.total_biaya_dimples ?? null;
  return bulanLalu.pos?.[kunci] ?? null;
}

export function BagianBiaya({ periode, bulanIni, bulanLalu, daftarPos }) {
  const item = susunBiaya(bulanIni, daftarPos);
  const total = bulanIni?.ukuran?.total_biaya_operasional;
  const maks = Math.max(1, ...item.map((i) => Math.abs(i.nilai)));
  const bulan = namaBulan(periode, { panjang: true });

  const rincianLain = daftarPos
    .filter((p) => p.kelompok === "biaya_lainnya" && ada(bulanIni?.pos?.[p.kode]) && Number(bulanIni.pos[p.kode]) !== 0)
    .map((p) => ({ kode: p.kode, label: p.nama, nilai: Number(bulanIni.pos[p.kode]) }))
    .sort((a, b) => b.nilai - a.nilai);

  let teks = `Belum ada data biaya untuk ${bulan}.`;
  let nada = "netral";
  if (item.length && ada(total)) {
    const besar = item[0];
    teks = `Biaya terbesar ${bulan}: ${besar.label.replace(" (rincian di samping)", "")} ${rupiah(besar.nilai)}, ${persen(besar.nilai / Number(total))} dari biaya operasional.`;
    const { persen: naik } = perubahan(besar.nilai, nilaiItemLalu(besar.kunci, bulanLalu));
    if (ada(naik) && naik > 0.5) {
      teks += ` Pos ini naik ${persen(naik, 0)} dari ${namaBulan(periodeSebelum(periode), { panjang: true, tanpaTahun: true })} — perlu dicek.`;
      nada = "waspada";
    }
  }

  return (
    <section aria-labelledby="bagian-3">
      <SectionHeader id="bagian-3" nomor={3} judul="Ke mana biayanya pergi" kesimpulan={teks} nada={nada} />
      {!item.length ? (
        <EmptyState judul="Belum ada data biaya" keterangan={`Biaya operasional untuk ${bulan} belum tersedia.`} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          <CardBox
            className="xl:col-span-3"
            title={`Biaya operasional ${bulan}`}
            subtitle={`Total ${rupiah(total)}. Persentase = bagian dari total biaya operasional.`}
          >
            <ul className="space-y-3">
              {item.map((i) => {
                const lalu = nilaiItemLalu(i.kunci, bulanLalu);
                const { persen: ubah } = perubahan(i.nilai, lalu);
                return (
                  <li key={i.kunci}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                      <span className="text-foreground">{i.label}</span>
                      <span className="tabular-nums">
                        <span className="font-medium">{rupiah(i.nilai)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{ada(total) && Number(total) !== 0 ? persen(i.nilai / Number(total)) : ""}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", i.nilai < 0 ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--chart-5))]")}
                        style={{ width: `${Math.max(2, (Math.abs(i.nilai) / maks) * 100)}%` }}
                      />
                    </div>
                    {ada(ubah) && (
                      <p className={cn("mt-0.5 text-xs tabular-nums", ubah > 0.0005 ? "text-destructive" : ubah < -0.0005 ? "text-[hsl(var(--success))]" : "text-muted-foreground")}>
                        {ubah > 0.0005 ? "Naik" : ubah < -0.0005 ? "Turun" : "Tetap"} {Math.abs(ubah) >= 0.0005 ? persen(Math.abs(ubah)) : ""} dibanding {namaBulan(periodeSebelum(periode))} ({rupiah(lalu)})
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardBox>

          <CardBox className="xl:col-span-2" title="Rincian biaya lain-lain" subtitle={`Isi pos "Lain-lain" biaya maklon, ${bulan}.`}>
            {rincianLain.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada rincian biaya lain-lain bulan ini.</p>
            ) : (
              <table className="w-full text-sm tabular-nums">
                <tbody>
                  {rincianLain.map((r) => (
                    <tr key={r.kode} className="border-b border-border/40">
                      <td className="py-1.5 pr-3 text-left">{r.label}</td>
                      <td className={cn("py-1.5 text-right", r.nilai < 0 && "text-[hsl(var(--success))]")}>{rupiah(r.nilai)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="pt-2 text-left">Jumlah</td>
                    <td className="pt-2 text-right">{rupiah(bulanIni?.ukuran?.biaya_lainnya)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {rincianLain.some((r) => r.nilai < 0) && (
              <p className="mt-3 text-xs text-muted-foreground">Angka hijau bernilai minus: pemasukan kecil yang mengurangi biaya.</p>
            )}
          </CardBox>
        </div>
      )}
    </section>
  );
}
