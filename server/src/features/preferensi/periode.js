// Pemeriksa tanggal transaksi. Setiap transaksi memanggil ini di dalam transaksinya
// sebelum menyimpan, mengubah, atau menghapus.
// Baris perusahaan dibaca dengan `for share`: selama transaksi ini berjalan, kunci
// periode tidak bisa diubah orang lain, jadi tidak ada transaksi yang lolos tepat
// saat periodenya sedang dikunci.
import { AppError } from "../../shared/http.js";
import { tanggalPanjang } from "../../shared/format.js";

/**
 * `saldoAwal`: jurnal saldo awal memang bertanggal sehari sebelum periode dimulai,
 * jadi cek "sebelum periode" dilewati; kunci periode tetap berlaku.
 */
export async function pastikanTanggalTerbuka(db, tanggal, { saldoAwal = false } = {}) {
  const { rows } = await db.query(
    "select to_char(mulai_periode, 'YYYY-MM-DD') as mulai, to_char(kunci_sampai, 'YYYY-MM-DD') as kunci from perusahaan for share",
  );
  const { mulai, kunci } = rows[0];
  if (!saldoAwal && tanggal < mulai) {
    throw new AppError(400, "SEBELUM_PERIODE", `Tanggal ${tanggalPanjang(tanggal)} sebelum periode akuntansi dimulai (${tanggalPanjang(mulai)}).`);
  }
  if (kunci && tanggal <= kunci) {
    throw new AppError(
      409,
      "PERIODE_TERKUNCI",
      `Transaksi sampai ${tanggalPanjang(kunci)} sudah dikunci. Buka kuncinya di Pengaturan, menu Preferensi, bagian Pembatasan.`,
    );
  }
}

/** Tanggal saldo awal: sehari sebelum periode akuntansi dimulai (format YYYY-MM-DD). */
export async function tanggalSaldoAwal(db) {
  const { rows } = await db.query("select to_char(mulai_periode - 1, 'YYYY-MM-DD') as t from perusahaan");
  return rows[0].t;
}
