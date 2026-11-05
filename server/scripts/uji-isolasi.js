// Membuktikan peran aplikasi (finance_app) terkurung di schema finance.
// Pola uji:pindah milik POS. Hanya MEMBACA; satu-satunya tulis yang dicoba
// adalah yang memang harus DITOLAK database.
//
//   npm run uji:isolasi
import { pool } from "../src/shared/db/pool.js";

let gagal = 0;
const lulus = (pesan) => console.log(`  LULUS  ${pesan}`);
const salah = (pesan) => { gagal++; console.log(`  GAGAL  ${pesan}`); };

async function harusDitolak(judul, sql) {
  const klien = await pool.connect();
  try {
    await klien.query("begin");
    await klien.query(sql);
    salah(`${judul} — seharusnya ditolak, ternyata diizinkan`);
  } catch (e) {
    if (/permission denied|must be owner|does not exist/i.test(e.message)) lulus(`${judul} — ditolak (${e.message.split("\n")[0]})`);
    else salah(`${judul} — galat tak terduga: ${e.message}`);
  } finally {
    await klien.query("rollback").catch(() => {});
    klien.release();
  }
}

try {
  console.log("Identitas sambungan:");
  const { rows: [id] } = await pool.query("select current_user, current_setting('search_path') sp");
  id.current_user === "finance_app" ? lulus(`peran = ${id.current_user}`) : salah(`peran = ${id.current_user}, seharusnya finance_app`);
  id.sp.startsWith("finance") && !/\bpublic\b/.test(id.sp) ? lulus(`search_path = ${id.sp}`) : salah(`search_path = ${id.sp}`);

  console.log("Boleh di schema sendiri:");
  const { rows: [u] } = await pool.query("select count(*)::int n from unit_usaha");
  u.n === 2 ? lulus(`unit_usaha terbaca (${u.n} unit)`) : salah(`unit_usaha berisi ${u.n}`);
  const { rows: [p] } = await pool.query("select count(*)::int n from pos_akun");
  p.n > 0 ? lulus(`pos_akun terbaca (${p.n} pos)`) : salah("pos_akun kosong");
  await pool.query("select count(*) from pengguna");
  lulus("pengguna terbaca");

  console.log("Harus ditolak:");
  await harusDitolak("membuat tabel di finance", "create table finance.coba_coba (x int)");
  await harusDitolak("mengubah data master pos_akun", "update finance.pos_akun set nama = nama");
  await harusDitolak("membaca catatan migrasi", "select * from finance.migrasi_terpasang");
  for (const skema of ["public", "pos", "operation_v2", "marketing"]) {
    const { rows } = await pool.query(
      "select table_name from information_schema.tables where table_schema = $1 limit 1", [skema]);
    // information_schema hanya menampilkan tabel yang boleh diakses; kosong = bagus.
    if (rows.length === 0) lulus(`tidak bisa melihat satu tabel pun di schema ${skema}`);
    else await harusDitolak(`membaca ${skema}.${rows[0].table_name}`, `select 1 from ${skema}."${rows[0].table_name}" limit 1`);
  }
  await harusDitolak("membaca public.employees langsung", "select 1 from public.employees limit 1");
} finally {
  await pool.end();
}

console.log(gagal ? `\n${gagal} pemeriksaan GAGAL.` : "\nSemua pemeriksaan LULUS.");
process.exit(gagal ? 1 : 0);
