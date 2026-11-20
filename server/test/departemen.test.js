// Departemen (lini bisnis): data induk ala Accurate — nama unik, bisa bertingkat, tidak
// bisa dihapus kalau sudah dipakai jurnal.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { dalamTransaksi, kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, cookie, admin;
before(async () => {
  admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, admin);
});
after(async () => {
  await app.tutup();
  await selesai();
});

const api = (method, jalur, body) => panggil(app.url, cookie, method, jalur, body);

test("membuat departemen, nama kembar ditolak tanpa memandang huruf besar/kecil", async () => {
  const r = await api("POST", "/departemen", { nama: "UJI Lini A", keterangan: "uji" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.nama, "UJI Lini A");
  const kembar = await api("POST", "/departemen", { nama: "uji lini a" });
  assert.equal(kembar.status, 409);
  assert.match(kembar.body.error.message, /sudah dipakai/);
});

test("sub departemen: induk tidak boleh dirinya sendiri atau keturunannya", async () => {
  const induk = (await api("POST", "/departemen", { nama: "UJI Induk" })).body.data;
  const anak = (await api("POST", "/departemen", { nama: "UJI Anak", induk_id: induk.id })).body.data;
  assert.equal(anak.induk_id, induk.id);
  const diriSendiri = await api("PUT", `/departemen/${induk.id}`, { nama: "UJI Induk", induk_id: induk.id });
  assert.equal(diriSendiri.status, 400);
  const melingkar = await api("PUT", `/departemen/${induk.id}`, { nama: "UJI Induk", induk_id: anak.id });
  assert.equal(melingkar.status, 400);
  assert.match(melingkar.body.error.message, /tidak boleh/);
  const daftar = await api("GET", "/departemen");
  const baris = daftar.body.data.find((d) => d.id === anak.id);
  assert.equal(baris.induk_nama, "UJI Induk");
});

test("departemen yang sudah dipakai jurnal tidak bisa dihapus, hanya dinonaktifkan", async () => {
  const d = (await api("POST", "/departemen", { nama: "UJI Terpakai" })).body.data;
  await dalamTransaksi(async (k) => {
    const akun = (kode) => k.query("select id from akun where kode = $1", [kode]).then((r) => r.rows[0].id);
    const { rows } = await k.query(
      "insert into jurnal (tipe, nomor, tanggal, keterangan, total, dibuat_oleh) values ('jurnal_umum', 'UJI-DEP-1', '2027-01-10', 'UJI pakai departemen', 100, $1) returning id",
      [admin.id],
    );
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, debit, departemen_id) values ($1, 1, $2, 100, $3)", [rows[0].id, await akun("600016"), d.id]);
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, kredit) values ($1, 2, $2, 100)", [rows[0].id, await akun("110101")]);
  });
  const hapus = await api("DELETE", `/departemen/${d.id}`);
  assert.equal(hapus.status, 409);
  assert.match(hapus.body.error.message, /nonaktifkan/i);
  const nonaktif = await api("PUT", `/departemen/${d.id}`, { nama: "UJI Terpakai", nonaktif: true });
  assert.equal(nonaktif.status, 200);
  const aktifSaja = await api("GET", "/departemen?aktif=1");
  assert.ok(!aktifSaja.body.data.some((x) => x.id === d.id));
});

test("departemen bebas bisa dihapus, dan setiap perubahan tercatat di log", async () => {
  const d = (await api("POST", "/departemen", { nama: "UJI Hapus" })).body.data;
  const hapus = await api("DELETE", `/departemen/${d.id}`);
  assert.equal(hapus.status, 200);
  const { rows } = await kueri(
    "select tindakan from log_aktivitas where menu_kode = 'departemen' and referensi = 'UJI Hapus' and pengguna_email = $1 order by id",
    [admin.email],
  );
  assert.deepEqual(rows.map((r) => r.tindakan), ["buat", "hapus"]);
});

test("Operator tanpa hak Departemen ditolak", async () => {
  const operator = await buatPenggunaUji({ peran: "staf" });
  const r = await panggil(app.url, await masuk(app.url, operator), "GET", "/departemen");
  assert.equal(r.status, 403);
});
