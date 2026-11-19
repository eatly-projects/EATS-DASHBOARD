// Log Aktivitas: siapa mengubah apa, kapan, dari mana. Dipanggil di transaksi
// database yang SAMA dengan perubahannya, supaya keduanya tersimpan bersama
// atau tidak sama sekali.
//
// Aturan potret (sebelum/sesudah): kuncinya label untuk manusia ("Nama grup"),
// nilainya teks siap tampil. Jangan pernah memasukkan hash kata sandi atau ID mentah.

/** Alamat IP peminta, tanpa awalan IPv6 untuk alamat IPv4 (::ffff:). */
export const ipDari = (req) => String(req?.ip ?? "").replace(/^::ffff:/, "");

/**
 * @param db   pool atau klien transaksi (apa saja yang punya .query)
 * @param req  permintaan Express; pengguna diambil dari req.pengguna
 */
export async function catatLog(db, req, { tindakan, menu, referensi = "", tanggalTransaksi = null, sebelum = null, sesudah = null }) {
  const p = req.pengguna;
  await db.query(
    `insert into log_aktivitas
       (pengguna_id, pengguna_nama, pengguna_email, alamat_ip, tindakan, menu_kode, referensi, tanggal_transaksi, sebelum, sesudah)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)`,
    [
      p.id,
      p.nama,
      p.email,
      ipDari(req),
      tindakan,
      menu,
      referensi,
      tanggalTransaksi,
      sebelum === null ? null : JSON.stringify(sebelum),
      sesudah === null ? null : JSON.stringify(sesudah),
    ],
  );
}
