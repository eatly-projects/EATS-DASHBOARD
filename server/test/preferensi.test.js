// Preferensi (data perusahaan, awal periode, kunci periode) dan pemeriksa tanggal transaksi.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri, pool } from "../src/shared/db/pool.js";
import { pastikanTanggalTerbuka } from "../src/features/preferensi/periode.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, admin, cookieAdmin, cookieOperator, asli, rekeningAsli;
before(async () => {
  ({ rows: [asli] } = await kueri("select nama, alamat, telepon, email, npwp, mulai_periode, kunci_sampai from perusahaan"));
  ({ rows: [{ id: rekeningAsli }] } = await kueri("select akun_rekening_utama_id as id from perusahaan"));
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
  await kueri("update perusahaan set akun_rekening_utama_id = $1", [rekeningAsli]);
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

test("saldo awal (sehari sebelum periode) boleh, kecuali periodenya sudah dikunci", async () => {
  await kueri("update perusahaan set kunci_sampai = null");
  await pastikanTanggalTerbuka(pool, "2026-12-31", { saldoAwal: true });
  await assert.rejects(() => pastikanTanggalTerbuka(pool, "2026-12-31"), /sebelum periode akuntansi dimulai/);
  await kueri("update perusahaan set kunci_sampai = '2026-12-31'");
  await assert.rejects(() => pastikanTanggalTerbuka(pool, "2026-12-31", { saldoAwal: true }), /sudah dikunci/);
});

test("rekening utama harus akun Kas & Bank; perubahannya tercatat di log", async () => {
  await kueri("update perusahaan set kunci_sampai = null");
  const pref = (await panggil(app.url, cookieAdmin, "GET", "/preferensi")).body.data;
  const beban = (await kueri("select id from akun where kode = '600005'")).rows[0].id;
  const salah = await panggil(app.url, cookieAdmin, "PUT", "/preferensi", { ...pref, akun_rekening_utama_id: beban });
  assert.equal(salah.status, 400, JSON.stringify(salah.body));
  assert.match(salah.body.error.message, /Kas & Bank/);
  const { rows: bank } = await kueri("insert into akun (kode, nama, tipe, bank_nama) values ('UJI-PREF-BANK', 'UJI Bank Preferensi', 'kas_bank', 'BNI') returning id");
  const r = await panggil(app.url, cookieAdmin, "PUT", "/preferensi", { ...pref, akun_rekening_utama_id: bank[0].id });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.data.akun_rekening_utama_nama, /UJI-PREF-BANK/);
  const { rows } = await kueri(
    "select sesudah from log_aktivitas where menu_kode = 'preferensi' and pengguna_email = $1 order by id desc limit 1",
    [admin.email],
  );
  assert.match(rows[0].sesudah["Rekening utama"], /UJI-PREF-BANK/);
  await kueri("update perusahaan set akun_rekening_utama_id = $1", [rekeningAsli]);
});

test("rekening utama yang dikirim kosong (null) dianggap tidak berubah", async () => {
  await kueri("update perusahaan set kunci_sampai = null");
  const pref = (await panggil(app.url, cookieAdmin, "GET", "/preferensi")).body.data;
  const r = await panggil(app.url, cookieAdmin, "PUT", "/preferensi", { ...pref, akun_rekening_utama_id: null });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.akun_rekening_utama_id, pref.akun_rekening_utama_id);
});
