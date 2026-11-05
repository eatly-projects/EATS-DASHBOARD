// Membuat (atau memperbarui kata sandi) peran database khusus aplikasi:
// finance_app. Pola sama dengan marketing_app di Marketing Dashboard.
//
//   npm run peran:buat          -> hanya menampilkan apa yang akan dilakukan
//   npm run peran:buat -- --ya  -> menjalankan, lalu menulis DATABASE_URL baru ke .env
//
// Peran ini HANYA boleh baca-tulis isi tabel di schema finance. Tidak boleh
// membuat/mengubah tabel (itu tugas MIGRASI_DATABASE_URL), dan tidak punya hak
// apa pun di schema aplikasi lain. Kata sandinya acak dan tidak pernah dicetak.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BERKAS_ENV = path.join(AKAR, ".env");
dotenv.config({ path: BERKAS_ENV, quiet: true });

const PERAN = "finance_app";
const SKEMA = (process.env.DB_SCHEMA || "").trim();
const URL_MIGRASI = (process.env.MIGRASI_DATABASE_URL || "").trim();
const YA = process.argv.includes("--ya");
if (SKEMA !== "finance") throw new Error(`DB_SCHEMA harus "finance", sekarang "${SKEMA}"`);
if (!URL_MIGRASI) throw new Error("MIGRASI_DATABASE_URL belum diisi.");

const alamat = new URL(URL_MIGRASI);
const kodeProject = decodeURIComponent(alamat.username).split(".")[1];
if (!kodeProject) throw new Error("Nama pengguna MIGRASI_DATABASE_URL harus berbentuk postgres.<kode-project> (pooler).");

console.log(`Tujuan: ${alamat.hostname} (project ${kodeProject}), peran baru "${PERAN}" untuk schema "${SKEMA}"`);
if (!YA) {
  console.log("(Hanya menampilkan. Tambahkan --ya untuk menjalankan.)");
  process.exit(0);
}

const sandi = crypto.randomBytes(24).toString("hex");
const klien = new pg.Client({ connectionString: URL_MIGRASI, ssl: { rejectUnauthorized: false } });
await klien.connect();
try {
  await klien.query("begin");
  const ada = (await klien.query("select 1 from pg_roles where rolname = $1", [PERAN])).rowCount > 0;
  // `valid until 'infinity'` wajib: peran kedaluwarsa membuat pooler menolak
  // dengan galat EAUTHQUERY yang menyesatkan (pelajaran Marketing Dashboard).
  await klien.query(`${ada ? "alter" : "create"} role ${PERAN} login password '${sandi}' valid until 'infinity'`);
  await klien.query(`grant usage on schema ${SKEMA} to ${PERAN}`);
  await klien.query(`grant usage on schema extensions to ${PERAN}`);
  await klien.query(`grant select, insert, update, delete on all tables in schema ${SKEMA} to ${PERAN}`);
  await klien.query(`grant usage, select on all sequences in schema ${SKEMA} to ${PERAN}`);
  await klien.query(`alter default privileges in schema ${SKEMA} grant select, insert, update, delete on tables to ${PERAN}`);
  await klien.query(`alter default privileges in schema ${SKEMA} grant usage, select on sequences to ${PERAN}`);
  // Catatan migrasi bukan urusan aplikasi.
  await klien.query(`revoke all on ${SKEMA}.migrasi_terpasang from ${PERAN}`);
  // Data master hanya dibaca aplikasi; perubahan lewat migrasi.
  await klien.query(`revoke insert, update, delete on ${SKEMA}.unit_usaha, ${SKEMA}.pos_akun from ${PERAN}`);
  await klien.query("commit");
  console.log(`Peran ${PERAN} ${ada ? "diperbarui" : "dibuat"} dan hak aksesnya dipasang.`);
} catch (e) {
  await klien.query("rollback").catch(() => {});
  throw e;
} finally {
  await klien.end();
}

// Tulis DATABASE_URL aplikasi ke .env (ganti baris lama, tanpa mencetak nilai).
const urlAplikasi = `postgresql://${PERAN}.${kodeProject}:${sandi}@${alamat.hostname}:6543/postgres`;
const isi = fs.readFileSync(BERKAS_ENV, "utf8");
const baru = /^DATABASE_URL=.*$/m.test(isi)
  ? isi.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${urlAplikasi}`)
  : `${isi.trimEnd()}\nDATABASE_URL=${urlAplikasi}\n`;
fs.writeFileSync(BERKAS_ENV, baru);
console.log("DATABASE_URL di .env diarahkan ke peran finance_app (port 6543).");
