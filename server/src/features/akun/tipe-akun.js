// Tipe akun mengikuti nama di Accurate (help.accurate.id, 2026-11-19), berurutan.
// normal: sisi saldo normal. kelompok: dipakai laporan (Neraca dan Laba Rugi).
export const TIPE_AKUN = [
  { kode: "kas_bank", nama: "Kas & Bank", normal: "debit", kelompok: "aset_lancar" },
  { kode: "piutang_usaha", nama: "Piutang Usaha", normal: "debit", kelompok: "aset_lancar" },
  { kode: "persediaan", nama: "Persediaan", normal: "debit", kelompok: "aset_lancar" },
  { kode: "aset_lancar_lainnya", nama: "Aset Lancar Lainnya", normal: "debit", kelompok: "aset_lancar" },
  { kode: "aset_tetap", nama: "Aset Tetap", normal: "debit", kelompok: "aset_tidak_lancar" },
  { kode: "akumulasi_penyusutan", nama: "Akumulasi Penyusutan", normal: "kredit", kelompok: "aset_tidak_lancar" },
  { kode: "aset_lainnya", nama: "Aset Lainnya", normal: "debit", kelompok: "aset_lainnya" },
  { kode: "utang_usaha", nama: "Utang Usaha", normal: "kredit", kelompok: "liabilitas_pendek" },
  { kode: "liabilitas_jangka_pendek", nama: "Liabilitas Jangka Pendek", normal: "kredit", kelompok: "liabilitas_pendek" },
  { kode: "liabilitas_jangka_panjang", nama: "Liabilitas Jangka Panjang", normal: "kredit", kelompok: "liabilitas_panjang" },
  { kode: "modal", nama: "Modal", normal: "kredit", kelompok: "ekuitas" },
  { kode: "pendapatan", nama: "Pendapatan", normal: "kredit", kelompok: "pendapatan" },
  { kode: "beban_pokok_penjualan", nama: "Beban Pokok Penjualan", normal: "debit", kelompok: "beban_pokok" },
  { kode: "beban", nama: "Beban", normal: "debit", kelompok: "beban" },
  { kode: "pendapatan_lainnya", nama: "Pendapatan Lainnya", normal: "kredit", kelompok: "non_operasional" },
  { kode: "beban_lainnya", nama: "Beban Lainnya", normal: "debit", kelompok: "non_operasional" },
];

export const KODE_TIPE_AKUN = TIPE_AKUN.map((t) => t.kode);
const PETA = new Map(TIPE_AKUN.map((t) => [t.kode, t]));
export const tipeAkun = (kode) => PETA.get(kode);
export const namaTipeAkun = (kode) => PETA.get(kode)?.nama ?? kode;

/** Saldo (sen, BigInt) di sisi normal akun dari selisih debit − kredit. */
export const saldoNormal = (tipe, debitMinKredit) => (PETA.get(tipe)?.normal === "kredit" ? -debitMinKredit : debitMinKredit);

/** Tipe yang masuk Laba Rugi (sisanya masuk Neraca). */
export const TIPE_LABA_RUGI = ["pendapatan", "beban_pokok_penjualan", "beban", "pendapatan_lainnya", "beban_lainnya"];
