// Turunan data untuk halaman Ringkasan laba rugi. Server sudah memberi `pos`
// dan `ukuran` per unit per bulan (termasuk GABUNGAN); di sini hanya
// perbandingan, total tahun berjalan, dan kalimat kesimpulan.
import { ukuranRentang } from "@/entities/laporan";
import { namaBulan, normalPeriode, pecahPeriode, periodeSebelum, rupiah, persen } from "@/shared/lib/format";

export const METRIK_UTAMA = [
  { kunci: "total_pendapatan", label: "Pendapatan", naikBaik: true },
  { kunci: "total_hpp", label: "Harga pokok penjualan", naikBaik: false, rasio: "persen_hpp", ketRasio: "dari pendapatan" },
  { kunci: "laba_kotor", label: "Laba kotor", naikBaik: true, rasio: "margin_laba_kotor", ketRasio: "margin laba kotor" },
  { kunci: "total_biaya_operasional", label: "Biaya operasional", naikBaik: false },
  { kunci: "laba_bersih", label: "Laba bersih", naikBaik: true, rasio: "margin_laba_bersih", ketRasio: "margin laba bersih" },
  {
    kunci: "ebitda",
    label: "EBITDA",
    naikBaik: true,
    penjelasan: "Laba sebelum bunga, pajak, penyusutan, dan amortisasi",
  },
];

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

export function dataBulan(dataUnit, periode) {
  return dataUnit?.[periode] ?? null;
}

/** Perubahan nilai sekarang vs pembanding. persen = pecahan terhadap |pembanding|. */
export function perubahan(sekarang, pembanding) {
  if (!ada(sekarang) || !ada(pembanding)) return { selisih: null, persen: null };
  const selisih = Number(sekarang) - Number(pembanding);
  const persenUbah = Number(pembanding) !== 0 ? selisih / Math.abs(Number(pembanding)) : null;
  return { selisih, persen: persenUbah };
}

/** Bulan-bulan tahun yang sama sampai bulan terpilih (Jan–bulan terpilih) yang punya data. */
export function periodeTahunBerjalan(periodeList, periode) {
  if (!periode) return [];
  const { tahun } = pecahPeriode(periode);
  return periodeList.filter((p) => pecahPeriode(p).tahun === tahun && p <= periode);
}

export function ukuranGabunganBulan(dataUnit, daftarPeriode, daftarPos) {
  const peta = daftarPeriode.map((p) => dataUnit?.[p]?.pos).filter(Boolean);
  if (!peta.length) return null;
  return ukuranRentang(peta, daftarPos);
}

/** Kalimat kesimpulan bagian 1, berdasarkan laba bersih. */
export function kesimpulanHasil(unitNama, periode, ukuranIni, ukuranLalu) {
  const lb = ukuranIni?.laba_bersih;
  const bulan = namaBulan(periode, { panjang: true });
  if (!ada(lb)) return { teks: `${unitNama} belum punya angka laba bersih untuk ${bulan}.`, nada: "netral" };
  const { selisih } = perubahan(lb, ukuranLalu?.laba_bersih);
  const rugi = Number(lb) < 0;
  let teks = `${rugi ? "Rugi bersih" : "Laba bersih"} ${bulan} ${rupiah(lb)}`;
  if (ada(selisih)) {
    const lalu = namaBulan(periodeSebelum(periode), { panjang: true, tanpaTahun: true });
    if (Math.abs(selisih) < 1) teks += `, sama dengan ${lalu}`;
    else teks += `, ${selisih > 0 ? "naik" : "turun"} ${rupiah(Math.abs(selisih))} dari ${lalu}`;
  }
  const m = ukuranIni?.margin_laba_bersih;
  if (ada(m)) teks += ` (margin ${persen(m)})`;
  teks += ".";
  const nada = rugi ? "buruk" : ada(selisih) && selisih < 0 ? "waspada" : "baik";
  return { teks, nada };
}

export function kesimpulanTren(dataUnit, periodeList) {
  const titik = periodeList
    .map((p) => ({ p, v: dataUnit?.[p]?.ukuran?.total_pendapatan }))
    .filter((t) => ada(t.v));
  if (titik.length === 0) return { teks: "Belum ada data pendapatan.", nada: "netral" };
  if (titik.length === 1) return { teks: `Baru ada data satu bulan (${namaBulan(titik[0].p, { panjang: true })}).`, nada: "netral" };
  const tinggi = titik.reduce((a, b) => (Number(b.v) > Number(a.v) ? b : a));
  const rendah = titik.reduce((a, b) => (Number(b.v) < Number(a.v) ? b : a));
  const rugi = periodeList.filter((p) => Number(dataUnit?.[p]?.ukuran?.laba_bersih) < 0);
  let teks = `Pendapatan tertinggi di ${namaBulan(tinggi.p, { panjang: true, tanpaTahun: true })} (${rupiah(tinggi.v)}), terendah di ${namaBulan(rendah.p, { panjang: true, tanpaTahun: true })} (${rupiah(rendah.v)}).`;
  if (rugi.length) {
    teks += ` Rugi di ${rugi.length} bulan: ${rugi.map((p) => namaBulan(p, { tanpaTahun: true })).join(", ")}.`;
  }
  return { teks, nada: rugi.length ? "waspada" : "baik" };
}

export { normalPeriode };
