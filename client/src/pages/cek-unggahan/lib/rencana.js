// Olah `rencana` hasil bacaan AI untuk halaman Cek dan setujui.
// Kunci satu angka: "UNIT|YYYY-MM|kode_pos".
import { hitungUkuran, gabungPos } from "@/entities/laporan";
import { normalPeriode } from "@/shared/lib/format";

export const kunci = (unit, periode, pos) => `${unit}|${normalPeriode(periode)}|${pos}`;
export const pecahKunci = (k) => {
  const [unit_kode, periode, pos_kode] = k.split("|");
  return { unit_kode, periode, pos_kode };
};

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

/** Peta awal dari rencana.nilai: nilai, info (ragu/sumber), dan nilai asli AI. */
export function petaDariRencana(rencana) {
  const nilai = new Map();
  const info = new Map();
  for (const n of rencana?.nilai ?? []) {
    const k = kunci(n.unit_kode, n.periode, n.pos_kode);
    nilai.set(k, ada(n.nilai) ? Number(n.nilai) : null);
    info.set(k, { ragu: Boolean(n.ragu), alasan: n.alasan_ragu ?? "", sumber: n.sumber ?? [] });
  }
  return { nilai, info, asli: new Map(nilai) };
}

export function petaLama(dataTersimpan) {
  const m = new Map();
  for (const d of dataTersimpan ?? []) m.set(kunci(d.unit_kode, d.periode, d.pos_kode), ada(d.nilai) ? Number(d.nilai) : null);
  return m;
}

/** Struktur per unit: daftar periode & pos yang tampil (dari rencana + data lama di bulan yang sama). */
export function strukturUnit(nilai, lama, urutanUnit) {
  const perUnit = new Map();
  for (const k of nilai.keys()) {
    const { unit_kode, periode, pos_kode } = pecahKunci(k);
    if (!perUnit.has(unit_kode)) perUnit.set(unit_kode, { periode: new Set(), pos: new Set() });
    perUnit.get(unit_kode).periode.add(periode);
    perUnit.get(unit_kode).pos.add(pos_kode);
  }
  for (const k of lama.keys()) {
    const { unit_kode, periode, pos_kode } = pecahKunci(k);
    const u = perUnit.get(unit_kode);
    if (u && u.periode.has(periode)) u.pos.add(pos_kode);
  }
  const urut = (a, b) => (urutanUnit.indexOf(a) + 1 || 99) - (urutanUnit.indexOf(b) + 1 || 99);
  return [...perUnit.keys()].sort(urut).map((unit) => ({
    unit,
    periode: [...perUnit.get(unit).periode].sort(),
    pos: [...perUnit.get(unit).pos],
  }));
}

/** Peta pos {kode: nilai} untuk satu unit & periode dari state nilai. GABUNGAN = jumlah semua unit. */
export function posBulan(nilai, unit, periode, semuaUnit) {
  if (unit === "GABUNGAN") return gabungPos(semuaUnit.map((u) => posBulan(nilai, u, periode, semuaUnit)));
  const hasil = {};
  const awal = `${unit}|${normalPeriode(periode)}|`;
  for (const [k, v] of nilai) {
    if (k.startsWith(awal) && ada(v)) hasil[k.slice(awal.length)] = v;
  }
  return hasil;
}

const UKURAN_PECAHAN = new Set(["margin_laba_kotor", "margin_laba_bersih", "persen_hpp"]);

/** Bulan-bulan (YYYY-MM) dalam satu tahun yang punya angka untuk unit itu (GABUNGAN = unit mana pun). */
function bulanDalamTahun(nilai, unit, tahun) {
  const hasil = new Set();
  for (const k of nilai.keys()) {
    const { unit_kode, periode } = pecahKunci(k);
    if ((unit === "GABUNGAN" || unit_kode === unit) && periode.startsWith(`${tahun}-`)) hasil.add(periode);
  }
  return [...hasil];
}

/** Ukuran satu unit & periode. Periode "YYYY" = jumlah ukuran semua bulannya (sama seperti server). */
function ukuranPeriode(nilai, unit, periode, daftarPos, semuaUnit) {
  if (!/^\d{4}$/.test(String(periode))) return hitungUkuran(posBulan(nilai, unit, periode, semuaUnit), daftarPos);
  const total = {};
  for (const p of bulanDalamTahun(nilai, unit, periode)) {
    const u = hitungUkuran(posBulan(nilai, unit, p, semuaUnit), daftarPos);
    for (const [k, v] of Object.entries(u)) {
      if (!UKURAN_PECAHAN.has(k) && ada(v)) total[k] = Math.round(((total[k] ?? 0) + Number(v)) * 100) / 100;
    }
  }
  return total;
}

/** Hitung ulang pemeriksaan (cek silang) dengan angka terbaru di layar. */
export function cekSilangLangsung(pemeriksaan, nilai, daftarPos, semuaUnit) {
  const cache = new Map();
  return (pemeriksaan ?? []).map((c) => {
    const p = /^\d{4}$/.test(String(c.periode)) ? String(c.periode) : normalPeriode(c.periode);
    const ck = `${c.unit_kode}|${p}`;
    if (!cache.has(ck)) cache.set(ck, ukuranPeriode(nilai, c.unit_kode, p, daftarPos, semuaUnit));
    const hitung = cache.get(ck)?.[c.ukuran];
    const berkas = c.angka_berkas;
    // Sama dengan server: kalau tidak ada rincian sama sekali (hasil hitung kosong),
    // dibandingkan sebagai 0 — Excel juga menjumlah sel kosong sebagai 0.
    const selisih = ada(berkas) ? (ada(hitung) ? Number(hitung) : 0) - Number(berkas) : null;
    const toleransi = UKURAN_PECAHAN.has(c.ukuran) ? 0.0005 : 1;
    // Berkas tidak punya angka total -> tidak bisa dicek (null), bukan "tidak cocok".
    const cocok = !ada(berkas) ? null : selisih !== null && Math.abs(selisih) < toleransi;
    return { ...c, angka_hitung: ada(hitung) ? Number(hitung) : null, selisih, cocok, pecahan: UKURAN_PECAHAN.has(c.ukuran) };
  });
}
