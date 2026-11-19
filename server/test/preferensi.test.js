// Preferensi (data perusahaan, awal periode, kunci periode) dan pemeriksa tanggal transaksi.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri, pool } from "../src/shared/db/pool.js";
import { pastikanTanggalTerbuka } from "../src/features/preferensi/periode.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, admin, cookieAdmin, cookieOperator, asli;
before(async () => {
  ({ rows: [asli] } = await kueri("select nama, alamat, telepon, email, npwp, mulai_periode, kunci_sampai from perusahaan"));
  admin = await buatPenggunaUji({ peran: "admin" });
  const operator = await buatPenggunaUji({ peran: "staf" });
  app = await jalankanAplikasi();
  cookieAdmin = await masuk(app.url, admin);
  cookieOperator = await masuk(app.url, operator);
});
after(async () => {
  await kueri("update perusahaan set nama = $1, alamat = $2, telepon = $3, email = $4, npwp = $5, mulai_periode = $6, kunci_sampai = $7", [
    asli.nama,
    asli.alamat,
    asli.telepon,
    asli.email,
    asli.npwp,
    asli.mulai_periode,
    asli.kunci_sampai,
  ]);
  await app.tutup();
  await selesai();
});

test("semua pengguna bisa membaca preferensi, hanya Administrator yang bisa mengubah", async () => {
  const baca = await panggil(app.url, cookieOperator, "GET", "/preferensi");
  assert.equal(baca.status, 200);
  assert.ok(baca.body.data.nama);
  const ubah = await panggil(app.url, cookieOperator, "PUT", "/preferensi", asli);
  assert.equal(ubah.status, 403);
});

test("NPWP harus 15 atau 16 angka", async () => {
  const r = await panggil(app.url, cookieAdmin, "PUT", "/preferensi", { ...asli, npwp: "12.345" });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /15 atau 16 angka/);
});

test("kunci periode menolak transaksi sampai tanggal kunci, dan sebelum periode dimulai", async () => {
  const r = await panggil(app.url, cookieAdmin, "PUT", "/preferensi", { ...asli, mulai_periode: "2027-01-01", kunci_sampai: "2027-01-31" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await assert.rejects(() => pastikanTanggalTerbuka(pool, "2027-01-31"), /sudah dikunci/);
  await pastikanTanggalTerbuka(pool, "2027-02-01");
  await assert.rejects(() => pastikanTanggalTerbuka(pool, "2026-12-31"), /sebelum periode akuntansi dimulai \(1 Januari 2027\)/);

  const { rows } = await kueri(
    "select sesudah from log_aktivitas where menu_kode = 'preferensi' and pengguna_email = $1 order by id desc limit 1",
    [admin.email],
  );
  assert.equal(rows[0].sesudah["Transaksi dikunci sampai"], "31 Januari 2027");
});
