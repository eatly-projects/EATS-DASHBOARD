// API Pengguna: level Administrator/Operator, akses grup, dan jejak di log.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { AKHIRAN_EMAIL, buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, admin, cookieAdmin, grupId;
before(async () => {
  admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookieAdmin = await masuk(app.url, admin);
  const { rows } = await kueri("insert into akses_grup (nama) values ('UJI A') returning id");
  grupId = rows[0].id;
});
after(async () => {
  await app.tutup();
  await selesai();
});

const api = (method, jalur, body) => panggil(app.url, cookieAdmin, method, jalur, body);

test("Operator dengan akses grup, lalu dinaikkan jadi Administrator, lalu ganti kata sandi", async () => {
  const email = `operator-baru${AKHIRAN_EMAIL}`;
  const dibuat = await api("POST", "/pengguna", { email, nama: "UJI Operator Baru", peran: "staf", kata_sandi: "rahasia-uji-1", akses_grup_id: grupId });
  assert.equal(dibuat.status, 201);
  const id = dibuat.body.data.id;

  const daftar = await api("GET", "/pengguna");
  const baris = daftar.body.data.find((p) => p.id === id);
  assert.equal(baris.akses_grup_nama, "UJI A");

  const naik = await api("PATCH", `/pengguna/${id}`, { peran: "admin" });
  assert.equal(naik.status, 200);
  assert.equal(naik.body.data.akses_grup_id, null);

  const sandi = await api("PATCH", `/pengguna/${id}`, { kata_sandi: "rahasia-uji-2" });
  assert.equal(sandi.status, 200);

  const { rows } = await kueri(
    "select * from log_aktivitas where menu_kode = 'pengguna' and referensi = 'UJI Operator Baru' and pengguna_email = $1 order by id",
    [admin.email],
  );
  assert.deepEqual(rows.map((r) => r.tindakan), ["buat", "ubah", "ubah"]);
  assert.equal(rows[0].sesudah["Akses grup"], "UJI A");
  assert.equal(rows[1].sesudah.Level, "Administrator");
  assert.equal(rows[2].sesudah["Kata sandi"], "Diganti");
  assert.ok(!JSON.stringify(rows).includes("$2"), "hash kata sandi tidak boleh masuk log");
});

test("akses grup Operator bisa dicabut (dikosongkan)", async () => {
  const dibuat = await api("POST", "/pengguna", {
    email: `cabut-grup${AKHIRAN_EMAIL}`,
    nama: "UJI Cabut Grup",
    peran: "staf",
    kata_sandi: "rahasia-uji-1",
    akses_grup_id: grupId,
  });
  assert.equal(dibuat.status, 201);
  const cabut = await api("PATCH", `/pengguna/${dibuat.body.data.id}`, { akses_grup_id: null });
  assert.equal(cabut.status, 200);
  assert.equal(cabut.body.data.akses_grup_id, null);
  const { rows } = await kueri("select akses_grup_id from pengguna where id = $1", [dibuat.body.data.id]);
  assert.equal(rows[0].akses_grup_id, null);
});

test("akses grup yang tidak dikenal ditolak", async () => {
  const r = await api("POST", "/pengguna", {
    email: `grup-asing${AKHIRAN_EMAIL}`,
    nama: "UJI Grup Asing",
    peran: "staf",
    kata_sandi: "rahasia-uji-1",
    akses_grup_id: "00000000-0000-4000-8000-000000000000",
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /Akses grup tidak ditemukan/);
});
