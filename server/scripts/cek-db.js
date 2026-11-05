// Memeriksa sambungan database aplikasi & isi singkat schema finance.
//   npm run cek:db
import { pool } from "../src/shared/db/pool.js";

try {
  const { rows: [s] } = await pool.query(
    "select current_user as peran, current_setting('search_path') as jalur, version() as versi",
  );
  console.log(`Tersambung sebagai ${s.peran} | search_path ${s.jalur}`);
  console.log(s.versi.split(" on ")[0]);
  for (const t of ["pengguna", "unit_usaha", "pos_akun", "unggahan", "nilai_laporan"]) {
    const { rows: [r] } = await pool.query(`select count(*)::int as n from ${t}`);
    console.log(`  ${t.padEnd(14)} ${r.n} baris`);
  }
  const { rows } = await pool.query(
    `select unit_kode, min(periode) as dari, max(periode) as sampai, count(*)::int as angka
       from nilai_laporan group by unit_kode order by unit_kode`,
  );
  for (const r of rows) console.log(`  data ${r.unit_kode}: ${r.dari} s/d ${r.sampai} (${r.angka} angka)`);
  if (!rows.length) console.log("  belum ada data laporan yang disetujui");
} catch (e) {
  console.error("GAGAL:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
