// API Log Aktivitas: filter, halaman, detail.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/shared/db/pool.js";
import { catatLog } from "../src/shared/log/log.js";
import { hariIni } from "../src/features/penomoran/penomoran.service.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, cookie, pencatat;
before(async () => {
  const admin = await buatPenggunaUji({ peran: "admin" });
  pencatat = await buatPenggunaUji({ peran: "admin" });
  const req = { pengguna: { id: pencatat.id, nama: pencatat.nama, email: pencatat.email }, ip: "127.0.0.1" };
  for (let i = 0; i < 55; i++) {
    await catatLog(pool, req, {
      tindakan: i < 50 ? "buat" : "hapus",
      menu: "akses_grup",
      referensi: `UJI log ${i}`,
      sebelum: i < 50 ? null : { "Nama grup": `UJI log ${i}` },
      sesudah: i < 50 ? { "Nama grup": `UJI log ${i}` } : null,
    });
  }
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, admin);
});
after(async () => {
  await app.tutup();
  await selesai();
});

const api = (jalur) => panggil(app.url, cookie, "GET", jalur);

test("log dibagi per 50 baris, terbaru di atas", async () => {
  const h1 = await api(`/log-aktivitas?pengguna_id=${pencatat.id}`);
  assert.equal(h1.status, 200);
  assert.equal(h1.body.data.jumlah, 55);
  assert.equal(h1.body.data.baris.length, 50);
  assert.equal(h1.body.data.baris[0].referensi, "UJI log 54");
  assert.equal(h1.body.data.baris[0].menu_nama, "Akses Grup");
  const h2 = await api(`/log-aktivitas?pengguna_id=${pencatat.id}&halaman=2`);
  assert.equal(h2.body.data.baris.length, 5);
});

test("filter tindakan, tanggal, dan pencarian referensi", async () => {
  const hapus = await api(`/log-aktivitas?pengguna_id=${pencatat.id}&tindakan=hapus`);
  assert.equal(hapus.body.data.jumlah, 5);
  assert.ok(hapus.body.data.baris.every((b) => b.tindakan === "hapus"));
  const hari = hariIni();
  const tanggal = await api(`/log-aktivitas?pengguna_id=${pencatat.id}&dari=${hari}&sampai=${hari}`);
  assert.equal(tanggal.body.data.jumlah, 55);
  const cari = await api(`/log-aktivitas?pengguna_id=${pencatat.id}&cari=log%2053`);
  assert.equal(cari.body.data.jumlah, 1);
});

test("detail memuat isi sebelum dan sesudah", async () => {
  const daftar = await api(`/log-aktivitas?pengguna_id=${pencatat.id}&tindakan=hapus`);
  const detail = await api(`/log-aktivitas/${daftar.body.data.baris[0].id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.sebelum["Nama grup"], "UJI log 54");
  assert.equal(detail.body.data.sesudah, null);
});

test("pilihan filter memuat menu dan pengguna yang ada di log", async () => {
  const r = await api("/log-aktivitas/pilihan");
  assert.ok(r.body.data.menu.some((m) => m.kode === "akses_grup" && m.nama === "Akses Grup"));
  assert.ok(r.body.data.pengguna.some((p) => p.id === pencatat.id));
});

test("Operator tanpa hak tidak bisa membuka log", async () => {
  const c = await masuk(app.url, await buatPenggunaUji({ peran: "staf" }));
  assert.equal((await panggil(app.url, c, "GET", "/log-aktivitas")).status, 403);
});
