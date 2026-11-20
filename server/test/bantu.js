// Alat bantu tes. Aturannya: tes hanya boleh menyentuh baris buatannya sendiri
// (email berakhiran @uji.test, nama berawalan "UJI "), karena schema
// finance_uji juga dipakai dev server laptop Lutfi.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { kueri, pool } from "../src/shared/db/pool.js";
import { buatAplikasi } from "../src/app.js";

export const AKHIRAN_EMAIL = "@uji.test";

/** Menolak jalan kalau koneksi tidak sedang di finance_uji (mencegah tes mengenai production). */
export async function pastikanSkemaUji(db = pool) {
  const { rows } = await db.query("select current_schema() as s");
  if (rows[0].s !== "finance_uji") throw new Error(`Tes hanya boleh di schema finance_uji, sekarang ${rows[0].s}`);
}

const acak = () => crypto.randomBytes(4).toString("hex");

export async function buatPenggunaUji({ peran = "staf", aksesGrupId = null } = {}) {
  await pastikanSkemaUji();
  const kode = acak();
  const p = { email: `uji-${kode}${AKHIRAN_EMAIL}`, sandi: `sandi-uji-${kode}`, nama: `UJI ${kode}` };
  const hash = await bcrypt.hash(p.sandi, 10);
  const kolom = ["email", "nama", "peran", "kata_sandi_hash"];
  const nilai = [p.email, p.nama, peran, hash];
  if (aksesGrupId) {
    kolom.push("akses_grup_id");
    nilai.push(aksesGrupId);
  }
  const { rows } = await kueri(
    `insert into pengguna (${kolom.join(", ")}) values (${nilai.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    nilai,
  );
  return { id: rows[0].id, ...p };
}

/**
 * Menghapus semua data buatan tes, dengan urutan yang menghormati foreign key.
 * Log aktivitas tidak dihapus: tabel itu memang tidak bisa dihapus aplikasi.
 */
export async function bersihkanDataUji() {
  await pastikanSkemaUji();
  // Buku Besar (Tahap 1): jurnal dulu (barisnya ikut terhapus), lalu akun anak → induk, lalu departemen.
  const akunUji = "select id from akun where kode like 'UJI%'";
  await kueri(
    `delete from jurnal
      where dibuat_oleh in (select id from pengguna where email like $1)
         or keterangan like 'UJI%'
         or akun_lawan_id in (${akunUji})
         or id in (select jurnal_id from jurnal_baris where akun_id in (${akunUji})
                                                         or departemen_id in (select id from departemen where nama like 'UJI %'))`,
    [`%${AKHIRAN_EMAIL}`],
  );
  for (let i = 0; i < 6; i++) {
    await kueri("delete from akun a where kode like 'UJI%' and not exists (select 1 from akun c where c.induk_id = a.id)");
    await kueri("delete from departemen d where nama like 'UJI %' and not exists (select 1 from departemen c where c.induk_id = d.id)");
  }
  await kueri("delete from penomoran_counter where penomoran_id in (select id from penomoran where nama like 'UJI %')");
  await kueri("delete from penomoran where nama like 'UJI %'");
  const unggahanUji = `select id from unggahan where diunggah_oleh in (select id from pengguna where email like $1)
                         or diputuskan_oleh in (select id from pengguna where email like $1)`;
  await kueri(`delete from nilai_laporan where unggahan_id in (${unggahanUji})`, [`%${AKHIRAN_EMAIL}`]);
  await kueri(`delete from unggahan where id in (${unggahanUji})`, [`%${AKHIRAN_EMAIL}`]);
  await kueri("update pengguna set akses_grup_id = null where email like $1 or akses_grup_id in (select id from akses_grup where nama like 'UJI %')", [`%${AKHIRAN_EMAIL}`]);
  await kueri("delete from pengguna where email like $1", [`%${AKHIRAN_EMAIL}`]);
  await kueri("delete from akses_grup where nama like 'UJI %'");
}

export async function jalankanAplikasi() {
  const server = buatAplikasi().listen(0, "127.0.0.1");
  await new Promise((selesai) => server.once("listening", selesai));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, tutup: () => new Promise((selesai) => server.close(selesai)) };
}

export async function panggil(url, cookie, method, jalur, body) {
  const res = await fetch(`${url}/api${jalur}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const teks = await res.text();
  return { status: res.status, body: teks ? JSON.parse(teks) : null };
}

/** Masuk lewat API dan mengembalikan isi header cookie untuk permintaan berikutnya. */
export async function masuk(url, { email, sandi }) {
  const res = await fetch(`${url}/api/auth/masuk`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, kata_sandi: sandi }),
  });
  if (res.status !== 200) throw new Error(`Gagal masuk sebagai ${email}: ${res.status}`);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

/** Dipakai di after() setiap berkas tes yang memakai database. */
export async function selesai() {
  await bersihkanDataUji();
  await pool.end();
}
