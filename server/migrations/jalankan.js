// Menjalankan migrasi SQL bernomor (NNN_deskripsi.sql) ke schema DB_SCHEMA.
// Pola yang sama dengan POS & Operations: berkas yang sudah terpasang dicatat
// di tabel migrasi_terpasang, jadi tidak pernah dijalankan dua kali.
//
//   npm run migrate          -> HANYA menampilkan tujuan & berkas yang belum terpasang
//   npm run migrate -- --ya  -> menjalankan berkas yang belum terpasang
//
// Memakai MIGRASI_DATABASE_URL (peran postgres), BUKAN DATABASE_URL aplikasi:
// peran aplikasi (finance_app) sengaja tidak boleh membuat/mengubah tabel.
//
// Database bos dipakai bersama POS, Operations, dan Marketing. Karena itu
// sebelum & sesudah migrasi dicetak jumlah tabel/view tiap schema lain sebagai
// bukti tidak ada yang tersentuh.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const FOLDER = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(FOLDER, "../../.env"), quiet: true });

const SKEMA = (process.env.DB_SCHEMA || "").trim();
const URL_MIGRASI = (process.env.MIGRASI_DATABASE_URL || "").trim();
const YA = process.argv.includes("--ya");

if (!/^[a-z_][a-z0-9_]*$/.test(SKEMA) || SKEMA === "public") throw new Error(`DB_SCHEMA tidak sah: "${SKEMA}"`);
if (!URL_MIGRASI) throw new Error("MIGRASI_DATABASE_URL belum diisi.");

const alamat = new URL(URL_MIGRASI);
const [peran, kodeProject = "?"] = decodeURIComponent(alamat.username).split(".");
const SKEMA_LAIN = ["public", "pos", "operation_v2", "marketing"];

const berkas = fs.readdirSync(FOLDER).filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f)).sort();

async function potretSkemaLain(klien) {
  const { rows } = await klien.query(
    `select n.nspname as skema,
            count(*) filter (where c.relkind in ('r','p'))::int as tabel,
            count(*) filter (where c.relkind in ('v','m'))::int as view
       from pg_namespace n left join pg_class c on c.relnamespace = n.oid
      where n.nspname = any($1)
      group by n.nspname order by n.nspname`,
    [SKEMA_LAIN],
  );
  return rows.map((r) => `${r.skema}: ${r.tabel} tabel, ${r.view} view`).join(" | ");
}

const klien = new pg.Client({ connectionString: URL_MIGRASI, ssl: { rejectUnauthorized: false } });
await klien.connect();
try {
  console.log(`Tujuan  : ${alamat.hostname} (project ${kodeProject}), peran "${peran}", schema "${SKEMA}"`);
  const adaSkema = (await klien.query("select 1 from pg_namespace where nspname = $1", [SKEMA])).rowCount > 0;
  const adaCatatan = adaSkema && (await klien.query("select to_regclass($1) t", [`${SKEMA}.migrasi_terpasang`])).rows[0].t !== null;
  const terpasang = new Set(
    adaCatatan ? (await klien.query(`select berkas from "${SKEMA}".migrasi_terpasang`)).rows.map((r) => r.berkas) : [],
  );
  const belum = berkas.filter((f) => !terpasang.has(f));
  console.log(`Terpasang: ${[...terpasang].sort().join(", ") || "-"}`);
  console.log(`Belum    : ${belum.join(", ") || "-"}`);
  const sebelum = await potretSkemaLain(klien);
  console.log(`Schema lain (sebelum): ${sebelum}`);

  if (!YA) {
    console.log("\n(Hanya menampilkan. Tambahkan --ya untuk menjalankan.)");
  } else {
    for (const f of belum) {
      const sql = fs.readFileSync(path.join(FOLDER, f), "utf8");
      await klien.query("begin");
      try {
        await klien.query(`create schema if not exists "${SKEMA}"`);
        await klien.query(`set local search_path to "${SKEMA}", extensions`);
        await klien.query(
          `create table if not exists migrasi_terpasang (
             berkas text primary key,
             dipasang_pada timestamptz not null default now()
           )`,
        );
        await klien.query(sql);
        await klien.query("insert into migrasi_terpasang (berkas) values ($1)", [f]);
        await klien.query("commit");
        console.log(`terpasang: ${f}`);
      } catch (e) {
        await klien.query("rollback").catch(() => {});
        throw new Error(`${f} GAGAL, dibatalkan seluruhnya: ${e.message}`);
      }
    }
    if (!belum.length) console.log("Tidak ada yang perlu dijalankan.");
    const sesudah = await potretSkemaLain(klien);
    console.log(`Schema lain (sesudah): ${sesudah}`);
    console.log(sebelum === sesudah ? "Schema lain TIDAK berubah." : "PERINGATAN: jumlah objek schema lain berubah!");
  }
} finally {
  await klien.end();
}
