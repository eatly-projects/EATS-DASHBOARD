// Bagian 1 · Hasil bulan ini: kartu angka utama + tabel bulan ini vs bulan lalu
// vs total tahun berjalan.
import { CardBox, EmptyState, KpiTile, PerubahanPill, SectionHeader } from "@/shared/ui/bits";
import { MountFade } from "@/shared/ui/motion";
import { cn } from "@/shared/lib/cn";
import { namaBulan, periodeSebelum, persen, rentangBulan, rupiah } from "@/shared/lib/format";
import { METRIK_UTAMA, kesimpulanHasil, perubahan } from "../lib/ringkasan";

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

function SelSelisih({ selisih, naikBaik, jenis = "rupiah" }) {
  if (!ada(selisih)) return <span className="text-muted-foreground">—</span>;
  const datar = Math.abs(selisih) < (jenis === "rupiah" ? 1 : 0.00005);
  const baik = datar ? null : selisih > 0 === naikBaik;
  const teks =
    jenis === "rupiah"
      ? rupiah(selisih, { bertanda: true })
      : `${selisih > 0 ? "+" : selisih < 0 ? "−" : ""}${(Math.abs(selisih) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin`;
  return (
    <span className={cn(baik === true && "text-[hsl(var(--success))]", baik === false && "text-destructive", baik === null && "text-muted-foreground")}>
      {teks}
    </span>
  );
}

export function BagianHasilBulan({ unitNama, periode, ukuranIni, ukuranLalu, ukuranTahunBerjalan, periodeTahunBerjalan }) {
  const periodeLalu = periodeSebelum(periode);
  const { teks, nada } = kesimpulanHasil(unitNama, periode, ukuranIni, ukuranLalu);
  const labelTahunBerjalan = `Total ${rentangBulan(periodeTahunBerjalan)}`;

  const barisTabel = [];
  for (const m of METRIK_UTAMA) {
    barisTabel.push({ ...m, jenis: "rupiah" });
    if (m.rasio) {
      barisTabel.push({
        kunci: m.rasio,
        label: m.rasio === "persen_hpp" ? "Harga pokok terhadap pendapatan" : m.ketRasio.charAt(0).toUpperCase() + m.ketRasio.slice(1),
        naikBaik: m.naikBaik,
        jenis: "persen",
        anak: true,
      });
    }
  }

  return (
    <section aria-labelledby="bagian-1">
      <SectionHeader id="bagian-1" nomor={1} judul="Hasil bulan ini" kesimpulan={teks} nada={nada} />

      {!ukuranIni ? (
        <EmptyState judul={`Belum ada data ${namaBulan(periode, { panjang: true })}`} keterangan={`${unitNama} belum punya angka untuk bulan ini.`} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {METRIK_UTAMA.map((m, i) => {
              const ini = ukuranIni?.[m.kunci];
              const lalu = ukuranLalu?.[m.kunci];
              const { persen: persenUbah } = perubahan(ini, lalu);
              const rasio = m.rasio ? ukuranIni?.[m.rasio] : null;
              return (
                <MountFade key={m.kunci} delay={i * 0.04}>
                  <KpiTile
                    label={m.label}
                    nilai={rupiah(ini)}
                    nada={m.kunci.startsWith("laba") || m.kunci === "ebitda" ? (Number(ini) < 0 ? "buruk" : undefined) : undefined}
                    perubahan={<PerubahanPill persenUbah={persenUbah} naikBaik={m.naikBaik} />}
                    keterangan={m.penjelasan ?? (ada(rasio) ? `${persen(rasio)} ${m.ketRasio}` : null)}
                    catatanPerubahan={
                      ukuranLalu
                        ? `${namaBulan(periodeLalu)}: ${rupiah(lalu)}`
                        : `${namaBulan(periodeLalu)}: belum ada data`
                    }
                  />
                </MountFade>
              );
            })}
          </div>

          <CardBox
            title="Perbandingan"
            subtitle={`${namaBulan(periode, { panjang: true })} dibanding bulan sebelumnya, dan total sejak awal tahun. Hijau = membaik, merah = memburuk.`}
          >
            <div className="relative -mx-3 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px] text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Ukuran</th>
                    <th className="bg-muted/40 px-3 py-2 text-right font-semibold text-foreground">{namaBulan(periode)}</th>
                    <th className="px-3 py-2 text-right font-medium">{namaBulan(periodeLalu)}</th>
                    <th className="px-3 py-2 text-right font-medium">Selisih</th>
                    <th className="px-3 py-2 text-right font-medium">{labelTahunBerjalan}</th>
                  </tr>
                </thead>
                <tbody>
                  {barisTabel.map((b) => {
                    const ini = ukuranIni?.[b.kunci];
                    const lalu = ukuranLalu?.[b.kunci];
                    const selisih = ada(ini) && ada(lalu) ? Number(ini) - Number(lalu) : null;
                    const fmt = b.jenis === "persen" ? (v) => persen(v) : (v) => rupiah(v);
                    return (
                      <tr key={b.kunci} className={cn("border-b border-border/40", !b.anak && "font-medium")}>
                        <td className={cn("px-3 py-2 text-left", b.anak && "pl-7 text-xs text-muted-foreground")}>{b.label}</td>
                        <td className={cn("bg-muted/40 px-3 py-2 text-right", ada(ini) && Number(ini) < 0 && "text-destructive")}>{fmt(ini)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{fmt(lalu)}</td>
                        <td className="px-3 py-2 text-right">
                          <SelSelisih selisih={selisih} naikBaik={b.naikBaik} jenis={b.jenis} />
                        </td>
                        <td className="px-3 py-2 text-right">{fmt(ukuranTahunBerjalan?.[b.kunci])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBox>
        </div>
      )}
    </section>
  );
}
