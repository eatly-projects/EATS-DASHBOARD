// Tabel rencana untuk satu unit: baris = pos (dikelompokkan), kolom = bulan.
// Total di bawah dihitung ulang langsung setiap kali angka diubah.
import { useMemo } from "react";
import { CardBox, StickyTable } from "@/shared/ui/bits";
import { cn } from "@/shared/lib/cn";
import { namaBulan, rentangBulan, rupiah } from "@/shared/lib/format";
import { hitungUkuran } from "@/entities/laporan";
import { kunci, posBulan } from "../lib/rencana";
import { SelAngka } from "./SelAngka";

const URUTAN_KELOMPOK = ["pendapatan", "hpp", "biaya_maklon", "biaya_lainnya", "biaya_dimples", "di_bawah_laba"];
const NAMA_KELOMPOK_CADANGAN = {
  pendapatan: "Pendapatan",
  hpp: "Harga pokok penjualan",
  biaya_maklon: "Biaya operasional maklon",
  biaya_lainnya: "Biaya lain-lain (rincian biaya maklon)",
  biaya_dimples: "Biaya operasional Dimples",
  di_bawah_laba: "Di bawah laba bersih",
};

const BARIS_TOTAL = [
  { kunci: "total_pendapatan", label: "Total pendapatan" },
  { kunci: "total_hpp", label: "Total harga pokok penjualan" },
  { kunci: "laba_kotor", label: "Laba kotor", sorot: true },
  { kunci: "total_biaya_operasional", label: "Total biaya operasional" },
  { kunci: "laba_bersih", label: "Laba bersih", sorot: true },
  { kunci: "ebitda", label: "EBITDA (laba sebelum bunga, pajak, penyusutan, dan amortisasi)", sorot: true },
];

export function TabelRencanaUnit({
  unit,
  judul,
  periodeList,
  posKodes,
  nilai,
  lama,
  bulanLama,
  info,
  asli,
  dilihat,
  referensi: ref,
  bisaUbah,
  onUbah,
  onDilihat,
}) {
  const grup = useMemo(() => {
    const perKelompok = new Map();
    for (const kode of posKodes) {
      const p = ref.posPerKode[kode];
      const kel = p?.kelompok ?? "tidak_dikenal";
      if (!perKelompok.has(kel)) perKelompok.set(kel, []);
      perKelompok.get(kel).push({ kode, nama: p?.nama ?? `Pos tidak dikenal (${kode})`, urutan: p?.urutan ?? 9999 });
    }
    const urutanKel = [...URUTAN_KELOMPOK, "tidak_dikenal"];
    return urutanKel
      .filter((k) => perKelompok.has(k))
      .map((k) => ({
        kode: k,
        nama: k === "tidak_dikenal" ? "Pos tidak dikenal" : ref.namaKelompok?.[k] ?? NAMA_KELOMPOK_CADANGAN[k],
        pos: perKelompok.get(k).sort((a, b) => a.urutan - b.urutan),
      }));
  }, [posKodes, ref]);

  const totalPerBulan = useMemo(
    () => Object.fromEntries(periodeList.map((p) => [p, hitungUkuran(posBulan(nilai, unit, p, []), ref.pos)])),
    [nilai, unit, periodeList, ref.pos],
  );

  const jumlahAngka = [...nilai.entries()].filter(([k, v]) => k.startsWith(`${unit}|`) && v !== null).length;

  return (
    <CardBox
      title={judul}
      subtitle={`${rentangBulan(periodeList)} · ${jumlahAngka.toLocaleString("id-ID")} angka. Arahkan kursor ke sel untuk melihat asalnya di berkas.`}
    >
      <StickyTable maxHeight="max-h-[75vh]">
        <thead className="sticky top-0 z-20">
          <tr className="text-xs text-muted-foreground">
            <th className="sticky left-0 z-30 min-w-[13rem] border-b border-border bg-card px-3 py-2 text-left font-medium sm:min-w-[17rem]">Pos</th>
            {periodeList.map((p) => (
              <th key={p} className="whitespace-nowrap border-b border-border bg-card px-2 py-2 text-right font-medium">
                {namaBulan(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grup.map((g) => (
            <GrupBaris
              key={g.kode}
              g={g}
              unit={unit}
              periodeList={periodeList}
              nilai={nilai}
              lama={lama}
              bulanLama={bulanLama}
              info={info}
              asli={asli}
              dilihat={dilihat}
              bisaUbah={bisaUbah}
              onUbah={onUbah}
              onDilihat={onDilihat}
            />
          ))}
          <tr>
            <td colSpan={periodeList.length + 1} className="sticky left-0 border-b border-border/40 bg-card px-3 pb-1 pt-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Hasil hitung (ikut berubah saat angka diubah)
            </td>
          </tr>
          {BARIS_TOTAL.map((b) => (
            <tr key={b.kunci}>
              <td
                className={cn(
                  "sticky left-0 z-10 border-b border-border/40 bg-card px-3 py-1.5 text-left font-semibold",
                  b.sorot && "shadow-[inset_0_0_0_9999px_hsl(var(--primary)/0.06)]",
                )}
              >
                {b.label}
              </td>
              {periodeList.map((p) => {
                const v = totalPerBulan[p]?.[b.kunci];
                return (
                  <td
                    key={p}
                    className={cn(
                      "whitespace-nowrap border-b border-border/40 px-2 py-1.5 text-right text-sm font-semibold tabular-nums",
                      b.sorot && "bg-[hsl(var(--primary))]/[0.06]",
                      v !== null && Number(v) < 0 && "text-destructive",
                    )}
                  >
                    {rupiah(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </StickyTable>
    </CardBox>
  );
}

function GrupBaris({ g, unit, periodeList, nilai, lama, bulanLama, info, asli, dilihat, bisaUbah, onUbah, onDilihat }) {
  return (
    <>
      <tr>
        <td
          colSpan={periodeList.length + 1}
          className="sticky left-0 border-b border-border/40 bg-card px-3 pb-1 pt-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {g.nama}
        </td>
      </tr>
      {g.pos.map((p) => {
        const adaRagu = periodeList.some((per) => {
          const k = kunci(unit, per, p.kode);
          return info.get(k)?.ragu && !dilihat.has(k);
        });
        return (
          <tr key={p.kode} className="align-top">
            <td className="sticky left-0 z-10 border-b border-border/40 bg-card px-3 py-1.5 text-left text-sm">
              <span className="flex items-center gap-1.5">
                {adaRagu && bisaUbah && <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(45_93%_55%)]" title="Ada angka yang AI kurang yakin" />}
                {p.nama}
              </span>
            </td>
            {periodeList.map((per) => {
              const k = kunci(unit, per, p.kode);
              const i = info.get(k);
              const v = nilai.has(k) ? nilai.get(k) : null;
              return (
                <td key={per} className="border-b border-border/40 px-1.5 py-1">
                  <SelAngka
                    k={k}
                    nilai={v}
                    lama={lama.get(k)}
                    punyaLama={bulanLama.has(`${unit}|${per}`)}
                    ragu={Boolean(i?.ragu) && !dilihat.has(k)}
                    alasan={i?.alasan}
                    sumber={i?.sumber}
                    diubah={asli.has(k) ? asli.get(k) !== v : v !== null}
                    bisaUbah={bisaUbah}
                    onUbah={onUbah}
                    onDilihat={onDilihat}
                  />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
