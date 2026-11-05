// Data master: unit usaha & pos laba rugi. Jarang berubah (hanya lewat
// migrasi), jadi disimpan di memori 5 menit.
import { kueri } from "../../shared/db/pool.js";

export const KELOMPOK = [
  { kode: "pendapatan", nama: "Pendapatan" },
  { kode: "hpp", nama: "Harga pokok penjualan" },
  { kode: "biaya_maklon", nama: "Biaya operasional maklon" },
  { kode: "biaya_lainnya", nama: "Rincian biaya lain-lain (maklon)" },
  { kode: "biaya_dimples", nama: "Biaya operasional Dimples" },
  { kode: "di_bawah_laba", nama: "Di bawah laba bersih" },
];

let simpanan = null;
let waktu = 0;

export async function ambilReferensi() {
  if (simpanan && Date.now() - waktu < 5 * 60 * 1000) return simpanan;
  const [unit, pos] = await Promise.all([
    kueri("select kode, nama, keterangan, urutan from unit_usaha order by urutan, kode"),
    kueri("select kode, nama, kelompok, urutan, nama_di_berkas, tambah_ebitda from pos_akun order by urutan, kode"),
  ]);
  simpanan = { unit: unit.rows, pos: pos.rows, kelompok: KELOMPOK };
  waktu = Date.now();
  return simpanan;
}
