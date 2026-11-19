// Migrasi 003: tabel fondasi pembukuan dan isi awalnya.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { AKHIRAN_EMAIL, pastikanSkemaUji, selesai } from "./bantu.js";

after(selesai);

test("perusahaan berisi satu baris, periode mulai 1 Januari 2027", async () => {
  await pastikanSkemaUji();
  const { rows } = await kueri("select nama, mulai_periode from perusahaan");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].mulai_periode, "2027-01-01");
});

test("penomoran bawaan Jurnal Umum tersedia", async () => {
  const { rows } = await kueri("select bawaan from penomoran where nama = 'Jurnal Umum' and tipe_transaksi = 'jurnal_umum'");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bawaan, true);
});

test("log aktivitas hanya bisa ditambah, tidak bisa diubah atau dihapus", async () => {
  const { rows } = await kueri(
    `insert into log_aktivitas (pengguna_nama, pengguna_email, tindakan, menu_kode, referensi)
     values ('UJI migrasi', $1, 'buat', 'akses_grup', 'UJI migrasi') returning id`,
    [`migrasi${AKHIRAN_EMAIL}`],
  );
  await assert.rejects(() => kueri("update log_aktivitas set referensi = 'x' where id = $1", [rows[0].id]), /permission denied/);
  await assert.rejects(() => kueri("delete from log_aktivitas where id = $1", [rows[0].id]), /permission denied/);
});

test("baris perusahaan kedua tidak bisa ditambahkan", async () => {
  await assert.rejects(() => kueri("insert into perusahaan (id, nama, mulai_periode) values (true, 'UJI', '2027-01-01')"), /permission denied/);
});
