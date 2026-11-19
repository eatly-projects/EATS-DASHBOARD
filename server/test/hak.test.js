// Daftar menu, hak akses per menu, dan navigasi.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { boleh, muatHak, susunNavigasi } from "../src/shared/akses/hak.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

after(selesai);

const HAK_KOSONG = { lihat: false, buat: false, ubah: false, hapus: false };

test("navigasi hanya memuat menu yang boleh dilihat, modul kosong dibuang", () => {
  const nav = susunNavigasi({ log_aktivitas: { ...HAK_KOSONG, lihat: true } });
  assert.equal(nav.modul.length, 1);
  assert.equal(nav.modul[0].kode, "perusahaan");
  assert.deepEqual(nav.modul[0].menu.map((m) => m.kode), ["log_aktivitas"]);
  assert.equal(nav.modul[0].menu[0].path, "/perusahaan/log-aktivitas");
});

test("tanpa hak berarti tidak boleh", () => {
  assert.equal(boleh({}, "unggah_laporan", "lihat"), false);
});

test("Administrator boleh semua aksi milik menu, tidak lebih", async () => {
  const hak = await muatHak({ peran: "admin", akses_grup_id: null });
  assert.equal(hak.preferensi.ubah, true);
  assert.equal(hak.log_aktivitas.lihat, true);
  assert.equal(hak.log_aktivitas.buat, false);
});

test("Operator tanpa akses grup tidak mendapat menu apa pun", async () => {
  const p = await buatPenggunaUji({ peran: "staf" });
  const app = await jalankanAplikasi();
  try {
    const r = await panggil(app.url, await masuk(app.url, p), "GET", "/navigasi");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.modul.length, 0);
  } finally {
    await app.tutup();
  }
});

test("Operator mendapat menu sesuai akses grupnya", async () => {
  const { rows } = await kueri("insert into akses_grup (nama) values ('UJI Log') returning id");
  await kueri("insert into akses_grup_hak (grup_id, menu_kode, lihat) values ($1, 'log_aktivitas', true)", [rows[0].id]);
  const p = await buatPenggunaUji({ peran: "staf", aksesGrupId: rows[0].id });
  const app = await jalankanAplikasi();
  try {
    const cookie = await masuk(app.url, p);
    const nav = await panggil(app.url, cookie, "GET", "/navigasi");
    assert.deepEqual(nav.body.data.modul.map((m) => m.kode), ["perusahaan"]);
    assert.deepEqual(nav.body.data.modul[0].menu[0].hak, { lihat: true, buat: false, ubah: false, hapus: false });
    const pengguna = await panggil(app.url, cookie, "GET", "/pengguna");
    assert.equal(pengguna.status, 403);
  } finally {
    await app.tutup();
  }
});
