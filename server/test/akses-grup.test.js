// API Akses Grup (khusus Administrator) dan jejaknya di Log Aktivitas.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, admin, operator, cookieAdmin;
before(async () => {
  admin = await buatPenggunaUji({ peran: "admin" });
  operator = await buatPenggunaUji({ peran: "staf" });
  app = await jalankanAplikasi();
  cookieAdmin = await masuk(app.url, admin);
});
after(async () => {
  await app.tutup();
  await selesai();
});

const api = (method, jalur, body) => panggil(app.url, cookieAdmin, method, jalur, body);

test("daftar menu untuk matriks tidak memuat Pengaturan", async () => {
  const r = await api("GET", "/akses-grup/menu");
  assert.equal(r.status, 200);
  const kode = r.body.data.map((m) => m.kode);
  assert.ok(kode.includes("perusahaan"));
  assert.ok(!kode.includes("pengaturan"));
});

test("membuat, mengubah, dan menghapus akses grup, semuanya tercatat di log", async () => {
  const dibuat = await api("POST", "/akses-grup", {
    nama: "UJI Keuangan",
    keterangan: "",
    anggota: [operator.id],
    hak: { unggah_laporan: { buat: true } },
  });
  assert.equal(dibuat.status, 201);
  const id = dibuat.body.data.id;

  const satu = await api("GET", `/akses-grup/${id}`);
  assert.deepEqual(satu.body.data.hak.unggah_laporan, { lihat: true, buat: true, ubah: false, hapus: false });
  assert.deepEqual(satu.body.data.anggota.map((a) => a.id), [operator.id]);

  const kembar = await api("POST", "/akses-grup", { nama: "uji keuangan", keterangan: "", anggota: [], hak: {} });
  assert.equal(kembar.status, 409);

  const masihDipakai = await api("DELETE", `/akses-grup/${id}`);
  assert.equal(masihDipakai.status, 409);
  assert.match(masihDipakai.body.error.message, /masih dipakai 1 pengguna/);

  const diubah = await api("PUT", `/akses-grup/${id}`, { nama: "UJI Keuangan", keterangan: "", anggota: [], hak: { unggah_laporan: { buat: true } } });
  assert.equal(diubah.status, 200);
  const { rows: op } = await kueri("select akses_grup_id from pengguna where id = $1", [operator.id]);
  assert.equal(op[0].akses_grup_id, null);

  const dihapus = await api("DELETE", `/akses-grup/${id}`);
  assert.equal(dihapus.status, 200);

  const { rows: log } = await kueri(
    "select tindakan, sesudah from log_aktivitas where menu_kode = 'akses_grup' and referensi = 'UJI Keuangan' and pengguna_email = $1 order by id",
    [admin.email],
  );
  assert.deepEqual(log.map((l) => l.tindakan), ["buat", "ubah", "hapus"]);
  assert.equal(log[0].sesudah["Nama grup"], "UJI Keuangan");
  assert.equal(log[0].sesudah["Hak — Unggah Laporan"], "Lihat, Buat");
});

test("Administrator tidak bisa dimasukkan ke akses grup", async () => {
  const r = await api("POST", "/akses-grup", { nama: "UJI Admin", keterangan: "", anggota: [admin.id], hak: {} });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /Administrator/);
});

test("aksi yang bukan milik menu ditolak", async () => {
  const r = await api("POST", "/akses-grup", { nama: "UJI Salah", keterangan: "", anggota: [], hak: { log_aktivitas: { buat: true } } });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /Log Aktivitas hanya punya hak Lihat/);
});

test("menu yang tidak dikenal ditolak", async () => {
  const r = await api("POST", "/akses-grup", { nama: "UJI Asing", keterangan: "", anggota: [], hak: { pengguna: { lihat: true } } });
  assert.equal(r.status, 400);
});

test("Operator tidak bisa membuka Akses Grup", async () => {
  const r = await panggil(app.url, await masuk(app.url, operator), "GET", "/akses-grup");
  assert.equal(r.status, 403);
});
