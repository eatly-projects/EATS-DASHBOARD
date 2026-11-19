// Pemeriksa tanggal transaksi. Setiap transaksi (mulai Tahap 1) memanggil ini
// di dalam transaksinya sebelum menyimpan, mengubah, atau menghapus.
import { AppError } from "../../shared/http.js";
import { tanggalPanjang } from "../../shared/format.js";

export async function pastikanTanggalTerbuka(db, tanggal) {
  const { rows } = await db.query("select to_char(mulai_periode, 'YYYY-MM-DD') as mulai, to_char(kunci_sampai, 'YYYY-MM-DD') as kunci from perusahaan");
  const { mulai, kunci } = rows[0];
  if (tanggal < mulai) {
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
