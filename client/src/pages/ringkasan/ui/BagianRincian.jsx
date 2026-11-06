// Bagian 4 · Rincian laba rugi per bulan: tabel lengkap seperti susunan Excel,
// kolom = bulan + total, kolom pertama menempel, bisa diunduh sebagai CSV.
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { CardBox, SectionHeader, StickyTable } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { unduhCsv } from "@/shared/lib/csv";
import { namaBulan, persen, rentangBulan, rupiah } from "@/shared/lib/format";
import { jumlah, ukuranRentang } from "@/entities/laporan";

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

const NAMA_KELOMPOK_CADANGAN = {
  pendapatan: "Pendapatan",
  hpp: "Harga pokok penjualan",
  biaya_maklon: "Biaya operasional maklon",
  biaya_lainnya: "Biaya lain-lain",
  biaya_dimples: "Biaya operasional Dimples",
  di_bawah_laba: "Di bawah laba bersih",
};

/** Susun baris tabel. Pos yang kosong sepanjang tahun tidak ditampilkan. */
function susunBaris(daftarPos, punyaNilai, namaKelompok) {
  const nk = (k) => namaKelompok?.[k] ?? NAMA_KELOMPOK_CADANGAN[k];
  const pos = (k) => daftarPos.filter((p) => p.kelompok === k && punyaNilai.has(p.kode));
  const baris = [];
  const grup = (kelompok, ukuranTotal, labelTotal) => {
    const isi = pos(kelompok);
    if (!isi.length) return;
    baris.push({ tipe: "judul", label: nk(kelompok) });
    for (const p of isi) baris.push({ tipe: "pos", kode: p.kode, label: p.nama });
    baris.push({ tipe: "ukuran", kunci: ukuranTotal, label: labelTotal, gaya: "total" });
  };

  grup("pendapatan", "total_pendapatan", "Total pendapatan");
  grup("hpp", "total_hpp", "Total harga pokok penjualan");
  baris.push({ tipe: "ukuran", kunci: "laba_kotor", label: "Laba kotor", gaya: "sorot" });
  baris.push({ tipe: "ukuran", kunci: "margin_laba_kotor", label: "Margin laba kotor", gaya: "persen" });

  const maklon = pos("biaya_maklon");
  const lainnya = pos("biaya_lainnya");
  if (maklon.length || lainnya.length) {
    baris.push({ tipe: "judul", label: nk("biaya_maklon") });
    for (const p of maklon) baris.push({ tipe: "pos", kode: p.kode, label: p.nama });
    if (lainnya.length) {
      baris.push({ tipe: "induk-lainnya", kunci: "biaya_lainnya", label: "Lain-lain" });
      for (const p of lainnya) baris.push({ tipe: "pos", kode: p.kode, label: p.nama, anakLainnya: true });
    }
    baris.push({ tipe: "ukuran", kunci: "total_biaya_maklon", label: "Total biaya operasional maklon", gaya: "total" });
  }
  grup("biaya_dimples", "total_biaya_dimples", "Total biaya operasional Dimples");
  baris.push({ tipe: "ukuran", kunci: "total_biaya_operasional", label: "Total biaya operasional", gaya: "total-besar" });
  baris.push({ tipe: "ukuran", kunci: "laba_bersih", label: "Laba bersih", gaya: "sorot" });
  baris.push({ tipe: "ukuran", kunci: "margin_laba_bersih", label: "Margin laba bersih", gaya: "persen" });

  const bawah = pos("di_bawah_laba");
  if (bawah.length) {
    baris.push({ tipe: "judul", label: nk("di_bawah_laba") });
    for (const p of bawah) baris.push({ tipe: "pos", kode: p.kode, label: p.nama });
  }
  baris.push({ tipe: "ukuran", kunci: "total_penyusutan", label: "Total penyusutan dan amortisasi", gaya: "total" });
  baris.push({
    tipe: "ukuran",
    kunci: "ebitda",
    label: "EBITDA",
    keterangan: "laba sebelum bunga, pajak, penyusutan, dan amortisasi",
    gaya: "sorot",
  });
  return baris;
}

export function BagianRincian({ unitNama, dataUnit, periodeList, periodeTerpilih, daftarPos, namaKelompok, tahun }) {
  const [bukaLainnya, setBukaLainnya] = useState(false);

  const { baris, ukuranTotal, totalPos } = useMemo(() => {
    const punyaNilai = new Set();
    for (const p of periodeList) {
      for (const [kode, v] of Object.entries(dataUnit?.[p]?.pos ?? {})) if (ada(v)) punyaNilai.add(kode);
    }
    const petaBulan = periodeList.map((p) => dataUnit?.[p]?.pos).filter(Boolean);
    const totalPosHitung = {};
    for (const kode of punyaNilai) totalPosHitung[kode] = jumlah(periodeList.map((p) => dataUnit?.[p]?.pos?.[kode]));
    return {
      baris: susunBaris(daftarPos, punyaNilai, namaKelompok),
      ukuranTotal: petaBulan.length ? ukuranRentang(petaBulan, daftarPos) : null,
      totalPos: totalPosHitung,
    };
  }, [dataUnit, periodeList, daftarPos, namaKelompok]);

  const rentang = rentangBulan(periodeList);
  const labelTotal = `Total ${rentang}`;

  const nilaiSel = (b, p) => (b.tipe === "pos" ? dataUnit?.[p]?.pos?.[b.kode] : dataUnit?.[p]?.ukuran?.[b.kunci]);
  const nilaiTotal = (b) => (b.tipe === "pos" ? totalPos[b.kode] : ukuranTotal?.[b.kunci]);
  const fmt = (b, v) => (b.gaya === "persen" ? persen(v) : rupiah(v));

  const lb = ukuranTotal?.laba_bersih;
  const teks = ukuranTotal
    ? `${labelTotal}: pendapatan ${rupiah(ukuranTotal.total_pendapatan)}, ${Number(lb) < 0 ? "rugi" : "laba"} bersih ${rupiah(lb)}${ada(ukuranTotal.margin_laba_bersih) ? ` (margin ${persen(ukuranTotal.margin_laba_bersih)})` : ""}.`
    : "Belum ada data.";
  const nada = !ukuranTotal ? "netral" : Number(lb) < 0 ? "buruk" : "baik";

  const unduh = () => {
    const kepala = ["Pos", ...periodeList.map((p) => namaBulan(p)), labelTotal];
    // CSV selalu memuat rincian biaya lain-lain, terbuka atau tidak di layar.
    const isi = baris.map((b) => {
      if (b.tipe === "judul") return [b.label.toUpperCase(), ...periodeList.map(() => ""), ""];
      const label = b.anakLainnya ? `   ${b.label}` : b.keterangan ? `${b.label} (${b.keterangan})` : b.label;
      const sel = (v) => (b.gaya === "persen" ? (ada(v) ? persen(v) : "") : ada(v) ? Number(v) : "");
      return [label, ...periodeList.map((p) => sel(nilaiSel(b, p))), sel(nilaiTotal(b))];
    });
    unduhCsv(`Laba rugi ${unitNama} ${rentang}`.replace(/[\\/:*?"<>|–]/g, "-"), [kepala, ...isi]);
  };

  return (
    <section aria-labelledby="bagian-4">
      <SectionHeader id="bagian-4" nomor={4} judul="Rincian laba rugi per bulan" kesimpulan={teks} nada={nada} />
      <CardBox
        title={`${unitNama} · ${rentang}`}
        subtitle={`Tahun ${tahun}. Kolom bulan terpilih diberi warna. "—" berarti belum ada data, bukan nol.`}
        action={
          <Button variant="outline" size="sm" onClick={unduh} className="hover:bg-muted hover:text-foreground">
            <Download aria-hidden />
            Unduh CSV
          </Button>
        }
      >
        <StickyTable maxHeight="max-h-[70vh]">
          <thead className="sticky top-0 z-20">
            <tr className="text-xs text-muted-foreground">
              <th className="sticky left-0 z-30 min-w-[14rem] border-b border-border bg-card px-3 py-2 text-left font-medium sm:min-w-[18rem]">Pos</th>
              {periodeList.map((p) => (
                <th
                  key={p}
                  className={cn(
                    "whitespace-nowrap border-b border-border bg-card px-3 py-2 text-right font-medium",
                    p === periodeTerpilih && "bg-[hsl(var(--primary))]/10 font-semibold text-foreground",
                  )}
                >
                  {namaBulan(p)}
                </th>
              ))}
              <th className="whitespace-nowrap border-b border-l border-border bg-card px-3 py-2 text-right font-semibold text-foreground">{labelTotal}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {baris.map((b, i) => {
              if (b.anakLainnya && !bukaLainnya) return null;
              if (b.tipe === "judul") {
                return (
                  <tr key={`j-${i}`}>
                    <td
                      colSpan={periodeList.length + 2}
                      className="sticky left-0 border-b border-border/40 bg-card px-3 pb-1 pt-4 text-left text-xs font-bold text-[hsl(var(--primary))]"
                    >
                      {b.label}
                    </td>
                  </tr>
                );
              }
              const sorot = b.gaya === "sorot";
              const bgBaris = sorot ? "bg-[hsl(var(--primary))]/[0.06]" : b.gaya === "total-besar" ? "bg-muted/50" : "bg-card";
              // Sel yang menempel harus berlatar padat (bukan transparan), kalau tidak
              // angka bulan lain terlihat tembus saat tabel digeser ke samping.
              const bgMenempel = sorot
                ? "bg-card shadow-[inset_0_0_0_9999px_hsl(var(--primary)/0.06)]"
                : b.gaya === "total-besar"
                  ? "bg-card shadow-[inset_0_0_0_9999px_hsl(var(--muted)/0.5)]"
                  : "bg-card";
              return (
                <tr key={`${b.tipe}-${b.kode ?? b.kunci}-${i}`} className="group">
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-b border-border/40 px-3 py-1.5 text-left",
                      bgMenempel,
                      b.anakLainnya && "pl-9 text-xs text-muted-foreground",
                      b.gaya === "persen" && "pl-6 text-xs italic text-muted-foreground",
                      (b.gaya === "total" || b.gaya === "total-besar") && "font-semibold",
                      sorot && "font-display font-semibold text-foreground",
                    )}
                  >
                    {b.tipe === "induk-lainnya" ? (
                      <button
                        type="button"
                        onClick={() => setBukaLainnya((v) => !v)}
                        className="inline-flex items-center gap-1 text-left hover:text-[hsl(var(--primary))]"
                        aria-expanded={bukaLainnya}
                      >
                        {bukaLainnya ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {b.label}
                        <span className="text-xs font-normal text-muted-foreground">({bukaLainnya ? "tutup rincian" : "lihat rincian"})</span>
                      </button>
                    ) : (
                      <>
                        {b.label}
                        {b.keterangan && <span className="ml-1 text-xs font-normal text-muted-foreground">({b.keterangan})</span>}
                      </>
                    )}
                  </td>
                  {periodeList.map((p) => {
                    const v = nilaiSel(b, p);
                    return (
                      <td
                        key={p}
                        className={cn(
                          "whitespace-nowrap border-b border-border/40 px-3 py-1.5 text-right",
                          bgBaris,
                          p === periodeTerpilih && "bg-[hsl(var(--primary))]/10",
                          b.anakLainnya && "text-xs text-muted-foreground",
                          b.gaya === "persen" && "text-xs italic text-muted-foreground",
                          (b.gaya === "total" || b.gaya === "total-besar" || sorot) && "font-semibold",
                          ada(v) && Number(v) < 0 && b.gaya !== "persen" && "text-destructive",
                          !ada(v) && "text-muted-foreground/60",
                        )}
                      >
                        {fmt(b, v)}
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "whitespace-nowrap border-b border-l border-border/40 px-3 py-1.5 text-right font-medium",
                      bgBaris,
                      b.anakLainnya && "text-xs font-normal text-muted-foreground",
                      b.gaya === "persen" && "text-xs italic text-muted-foreground",
                      (b.gaya === "total" || b.gaya === "total-besar" || sorot) && "font-semibold",
                      ada(nilaiTotal(b)) && Number(nilaiTotal(b)) < 0 && b.gaya !== "persen" && "text-destructive",
                    )}
                  >
                    {fmt(b, nilaiTotal(b))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </StickyTable>
        <p className="mt-3 text-xs text-muted-foreground">
          Total dan margin dihitung dari angka rinci (margin = laba dibagi pendapatan dari total, bukan rata-rata bulanan). Geser tabel ke samping untuk melihat bulan lain.
        </p>
      </CardBox>
    </section>
  );
}
