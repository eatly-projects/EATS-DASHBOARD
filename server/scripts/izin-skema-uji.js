// Memberi peran aplikasi (finance_app) hak baca-tulis di schema finance_uji,
// schema salinan untuk tes otomatis dan dev server laptop.
//
//   DB_SCHEMA=finance_uji npm run izin:uji          -> hanya menampilkan
//   DB_SCHEMA=finance_uji npm run izin:uji -- --ya  -> menjalankan
//
// SENGAJA TIDAK mengubah peran (alter role) atau kata sandinya, dan tidak
// menulis .env: kata sandi finance_app juga dipakai production di Vercel.
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(AKAR, ".env"), quiet: true });

const PERAN = "finance_app";
const SKEMA = (process.env.DB_SCHEMA || "").trim();
const URL_MIGRASI = (process.env.MIGRASI_DATABASE_URL || "").trim();
const YA = process.argv.includes("--ya");
if (SKEMA !== "finance_uji") throw new Error(`DB_SCHEMA harus "finance_uji", sekarang "${SKEMA}"`);
if (!URL_MIGRASI) throw new Error("MIGRASI_DATABASE_URL belum diisi.");

const alamat = new URL(URL_MIGRASI);
console.log(`Tujuan: ${alamat.hostname}, hak peran "${PERAN}" di schema "${SKEMA}"`);
if (!YA) {
  console.log("(Hanya menampilkan. Tambahkan --ya untuk menjalankan.)");
  process.exit(0);
}

const klien = new pg.Client({ connectionString: URL_MIGRASI, ssl: { rejectUnauthorized: false } });
await klien.connect();
try {
  await klien.query("begin");
  const ada = (await klien.query("select 1 from pg_roles where rolname = $1", [PERAN])).rowCount > 0;
  if (!ada) throw new Error(`Peran ${PERAN} belum ada. Jalankan npm run peran:buat dulu.`);
  await klien.query(`grant usage on schema ${SKEMA} to ${PERAN}`);
  await klien.query(`grant select, insert, update, delete on all tables in schema ${SKEMA} to ${PERAN}`);
  await klien.query(`grant usage, select on all sequences in schema ${SKEMA} to ${PERAN}`);
  await klien.query(`alter default privileges in schema ${SKEMA} grant select, insert, update, delete on tables to ${PERAN}`);
  await klien.query(`alter default privileges in schema ${SKEMA} grant usage, select on sequences to ${PERAN}`);
  await klien.query(`revoke all on ${SKEMA}.migrasi_terpasang from ${PERAN}`);
  await klien.query(`revoke insert, update, delete on ${SKEMA}.unit_usaha, ${SKEMA}.pos_akun from ${PERAN}`);
  await klien.query("commit");
  console.log(`Hak ${PERAN} di ${SKEMA} terpasang.`);
} catch (e) {
  await klien.query("rollback").catch(() => {});
  throw e;
} finally {
  await klien.end();
}
