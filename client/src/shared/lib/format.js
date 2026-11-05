// Format angka & tanggal untuk layar. Aturan Lutfi:
// - rupiah selalu penuh (tidak dipotong jadi "jt"/"M"), pemisah ribuan titik (id-ID)
// - data kosong tampil "—", BUKAN Rp 0
// - rentang bulan ditulis jelas: "Jan–Okt 2026"

const KOSONG = "—"; // —
const MINUS = "−"; // − (tanda minus tipografis, lebih jelas dari "-")

export const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const adaAngka = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

/** 57299000 -> "57.299.000" (tanpa "Rp"), dipakai di kolom input. */
export function angka(v) {
  if (!adaAngka(v)) return "";
  const n = Number(v);
  const abs = Math.abs(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  return n < 0 ? `-${abs}` : abs;
}

/** 57299000 -> "Rp 57.299.000"; -1905000 -> "−Rp 1.905.000"; null -> "—". */
export function rupiah(v, { bertanda = false } = {}) {
  if (!adaAngka(v)) return KOSONG;
  const n = Number(v);
  const tanda = n < 0 ? MINUS : bertanda && n > 0 ? "+" : "";
  return `${tanda}Rp ${Math.abs(n).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

/** 0.339 -> "33,9%". Masukan berupa pecahan. */
export function persen(pecahan, digit = 1, { bertanda = false } = {}) {
  if (!adaAngka(pecahan)) return KOSONG;
  const n = Number(pecahan) * 100;
  const tanda = n < 0 ? MINUS : bertanda && n > 0 ? "+" : "";
  return `${tanda}${Math.abs(n).toLocaleString("id-ID", { minimumFractionDigits: digit, maximumFractionDigits: digit })}%`;
}

/** Angka untuk sumbu grafik — tetap kata lengkap, bukan singkatan: "60 juta", "1,2 miliar". */
export function sumbuRupiah(v) {
  if (!adaAngka(v)) return "";
  const n = Number(v);
  const abs = Math.abs(n);
  const tanda = n < 0 ? MINUS : "";
  if (abs >= 1e9) return `${tanda}${(abs / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} miliar`;
  if (abs >= 1e6) return `${tanda}${(abs / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} juta`;
  if (abs >= 1e3) return `${tanda}${(abs / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 })} ribu`;
  return `${tanda}${abs.toLocaleString("id-ID")}`;
}

/** Ubah teks isian ("1.234.567", "-5.000", "1234567,5") jadi angka; kosong -> null; tidak sah -> NaN. */
export function bacaAngka(teks) {
  if (teks === null || teks === undefined) return null;
  let t = String(teks).trim().replace(/\s/g, "").replace(/^Rp/i, "").replace(MINUS, "-");
  if (t === "" || t === "-") return null;
  // Format Indonesia: titik = ribuan, koma = desimal.
  t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** "2026-10" atau "2026-10-01" -> { tahun: 2026, bulan: 10 } */
export function pecahPeriode(p) {
  const [t, b] = String(p).slice(0, 7).split("-").map(Number);
  return { tahun: t, bulan: b };
}

export const normalPeriode = (p) => String(p ?? "").slice(0, 7);

/** "2026-10" -> "Okt 2026" (pendek) / "Oktober 2026" (panjang) / "Okt" (tanpaTahun). */
export function namaBulan(p, { panjang = false, tanpaTahun = false } = {}) {
  if (!p) return KOSONG;
  // Periode berupa tahun saja ("2026") = total setahun di berkas (cek silang).
  if (/^\d{4}$/.test(String(p))) return `Total tahun ${p}`;
  const { tahun, bulan } = pecahPeriode(p);
  const nama = (panjang ? BULAN_PANJANG : BULAN_PENDEK)[bulan - 1] ?? "?";
  return tanpaTahun ? nama : `${nama} ${tahun}`;
}

/** ["2026-01", …, "2026-10"] -> "Jan–Okt 2026"; lintas tahun -> "Des 2025–Feb 2026"; satu bulan -> "Okt 2026". */
export function rentangBulan(daftar) {
  const urut = [...new Set((daftar ?? []).map(normalPeriode))].filter(Boolean).sort();
  if (urut.length === 0) return KOSONG;
  const awal = pecahPeriode(urut[0]);
  const akhir = pecahPeriode(urut[urut.length - 1]);
  if (urut.length === 1) return namaBulan(urut[0]);
  if (awal.tahun === akhir.tahun) {
    return `${BULAN_PENDEK[awal.bulan - 1]}–${BULAN_PENDEK[akhir.bulan - 1]} ${akhir.tahun}`;
  }
  return `${namaBulan(urut[0])}–${namaBulan(urut[urut.length - 1])}`;
}

/** Periode sebelumnya secara kalender: "2026-01" -> "2025-12". */
export function periodeSebelum(p) {
  const { tahun, bulan } = pecahPeriode(p);
  return bulan === 1 ? `${tahun - 1}-12` : `${tahun}-${String(bulan - 1).padStart(2, "0")}`;
}

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const fmtJam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/** ISO -> "5 Nov 2026" */
export function tanggal(iso) {
  if (!iso) return KOSONG;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? KOSONG : fmtTanggal.format(d);
}

/** ISO -> "5 Nov 2026, 14.20 WIB" */
export function tanggalJam(iso) {
  if (!iso) return KOSONG;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? KOSONG : `${fmtTanggal.format(d)}, ${fmtJam.format(d)} WIB`;
}

/** 29400 -> "29 KB" */
export function ukuranBerkas(byte) {
  if (!adaAngka(byte)) return KOSONG;
  const n = Number(byte);
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
  if (n >= 1024) return `${Math.round(n / 1024).toLocaleString("id-ID")} KB`;
  return `${n} byte`;
}

export { KOSONG, MINUS };
