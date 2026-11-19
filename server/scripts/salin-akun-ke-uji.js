// Menyalin akun login dari schema finance (production) ke finance_uji, supaya
// dev server laptop bisa dimasuki dengan akun yang sama. Yang disalin hanya
// tabel pengguna; data laporan tidak ikut.
//
//   DB_SCHEMA=finance_uji npm run akun:uji          -> hanya menampilkan jumlah akun
//   DB_SCHEMA=finance_uji npm run akun:uji -- --ya  -> menyalin (akun yang sudah ada diperbarui)
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(AKAR, ".env"), quiet: true });

const SKEMA = (process.env.DB_SCHEMA || "").trim();
const URL_MIGRASI = (process.env.MIGRASI_DATABASE_URL || "").trim();
const YA = process.argv.includes("--ya");
if (SKEMA !== "finance_uji") throw new Error(`DB_SCHEMA harus "finance_uji", sekarang "${SKEMA}"`);
if (!URL_MIGRASI) throw new Error("MIGRASI_DATABASE_URL belum diisi.");

const klien = new pg.Client({ connectionString: URL_MIGRASI, ssl: { rejectUnauthorized: false } });
await klien.connect();
try {
  const { rows } = await klien.query("select count(*)::int as n from finance.pengguna");
  console.log(`Akun di finance: ${rows[0].n}`);
  if (!YA) {
    console.log("(Hanya menampilkan. Tambahkan --ya untuk menyalin.)");
  } else {
    const hasil = await klien.query(
      `insert into finance_uji.pengguna (id, email, nama, kata_sandi_hash, peran, aktif, login_terakhir_at, dibuat_at, diubah_at)
       select id, email, nama, kata_sandi_hash, peran, aktif, login_terakhir_at, dibuat_at, diubah_at from finance.pengguna
       on conflict (id) do update set
         email = excluded.email, nama = excluded.nama, kata_sandi_hash = excluded.kata_sandi_hash,
         peran = excluded.peran, aktif = excluded.aktif, diubah_at = excluded.diubah_at`,
    );
    console.log(`${hasil.rowCount} akun disalin ke finance_uji.`);
  }
} finally {
  await klien.end();
}
