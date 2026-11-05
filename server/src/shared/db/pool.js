// Satu-satunya titik koneksi ke Postgres. Pola sama dengan POS, Operations, dan
// Marketing: `pg` langsung ke pooler Supabase (port 6543), nama tabel ditulis
// tanpa awalan schema, schema dipilih lewat DB_SCHEMA.
import pg from "pg";
import { env } from "../../config/env.js";

// numeric -> Number. Nilai rupiah di aplikasi ini paling besar belasan digit,
// masih aman di Number (aman sampai 9 kuadriliun).
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => (v === null ? null : Number(v)));
// date -> 'YYYY-MM-DD' apa adanya, supaya tidak bergeser sehari karena zona waktu.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export const SKEMA = env.dbSchema;

// `public` sengaja TIDAK ada di jalur pencarian: di database bos, public berisi
// tabel Operation lama. Salah ketik nama tabel harus galat, bukan diam-diam
// mengenai data aplikasi lain.
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  options: `-c search_path=${SKEMA},extensions`,
  ssl: { rejectUnauthorized: false },
  // Vercel: banyak salinan fungsi hidup bersamaan, jadi tiap salinan 1 sambungan
  // dan pembagiannya diurus pooler. Di laptop satu proses, boleh lebih banyak.
  max: Number(process.env.DB_POOL_MAX) || (env.isVercel ? 1 : 8),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  statement_timeout: 25000,
});

pool.on("error", (e) => console.error("[db] kesalahan pada kolam sambungan:", e.message));

export const kueri = (teks, nilai) => pool.query(teks, nilai);

// Semua perintah di dalam `kerja` tersimpan bersama, atau tidak sama sekali.
export async function dalamTransaksi(kerja) {
  const klien = await pool.connect();
  try {
    await klien.query("begin");
    const hasil = await kerja(klien);
    await klien.query("commit");
    return hasil;
  } catch (e) {
    await klien.query("rollback").catch(() => {});
    throw e;
  } finally {
    klien.release();
  }
}
