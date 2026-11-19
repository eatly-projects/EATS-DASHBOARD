// Penomoran otomatis: nomor tidak kembar walau disimpan bersamaan, mulai lagi
// tiap periode, dan susunan yang sudah dipakai tidak bisa diubah.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { dalamTransaksi } from "../src/shared/db/pool.js";
import { ambilNomorBerikut } from "../src/features/penomoran/penomoran.service.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

const FORMAT_JU = [{ jenis: "teks", nilai: "JU." }, { jenis: "tahun" }, { jenis: "teks", nilai: "." }, { jenis: "bulan" }, { jenis: "teks", nilai: "." }, { jenis: "counter" }];
const DATA_UJI = { nama: "UJI Paralel", tipe_transaksi: "jurnal_umum", format: FORMAT_JU, digit_counter: 5, reset: "bulan", bawaan: false };

let app, cookie, idUji;
before(async () => {
  const admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, admin);
  const r = await panggil(app.url, cookie, "POST", "/penomoran", DATA_UJI);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  idUji = r.body.data.id;
});
after(async () => {
  await app.tutup();
  await selesai();
});

const api = (method, jalur, body) => panggil(app.url, cookie, method, jalur, body);
const nomor = (tanggal) => dalamTransaksi((k) => ambilNomorBerikut(k, "jurnal_umum", tanggal, idUji));

test("20 transaksi yang menyimpan bersamaan mendapat 20 nomor berbeda dan berurutan", async () => {
  const hasil = await Promise.all(Array.from({ length: 20 }, () => nomor("2027-03-10")));
  const harapan = Array.from({ length: 20 }, (_, i) => `JU.2027.03.${String(i + 1).padStart(5, "0")}`);
  assert.deepEqual([...hasil].sort(), harapan);
});

test("bulan berganti, nomor urut mulai lagi dari 1", async () => {
  assert.equal(await nomor("2027-04-01"), "JU.2027.04.00001");
});

test("transaksi yang batal tidak memakan nomor", async () => {
  await assert.rejects(() =>
    dalamTransaksi(async (k) => {
      await ambilNomorBerikut(k, "jurnal_umum", "2027-04-02", idUji);
      throw new Error("batal");
    }),
  );
  assert.equal(await nomor("2027-04-03"), "JU.2027.04.00002");
});

test("susunan penomoran yang sudah dipakai tidak bisa diubah, namanya bisa", async () => {
  const ubahDigit = await api("PUT", `/penomoran/${idUji}`, { ...DATA_UJI, digit_counter: 4 });
  assert.equal(ubahDigit.status, 409);
  assert.match(ubahDigit.body.error.message, /sudah dipakai untuk 22 nomor/);
  const ubahNama = await api("PUT", `/penomoran/${idUji}`, { ...DATA_UJI, nama: "UJI Paralel Baru" });
  assert.equal(ubahNama.status, 200);
  const hapus = await api("DELETE", `/penomoran/${idUji}`);
  assert.equal(hapus.status, 409);
});

test("daftar penomoran memuat jumlah terpakai dan contoh nomor berikutnya", async () => {
  const r = await api("GET", "/penomoran");
  const uji = r.body.data.find((p) => p.id === idUji);
  assert.equal(uji.terpakai, 22);
  assert.match(uji.contoh, /^JU\.\d{4}\.\d{2}\.\d{5}$/);
});

test("penomoran bawaan tidak bisa dihapus", async () => {
  const r = await api("GET", "/penomoran");
  const bawaan = r.body.data.find((p) => p.tipe_transaksi === "jurnal_umum" && p.bawaan);
  const hapus = await api("DELETE", `/penomoran/${bawaan.id}`);
  assert.equal(hapus.status, 409);
  assert.match(hapus.body.error.message, /bawaan tidak bisa dihapus/);
});

test("pratinjau memberi contoh, atau pesan galat tanpa menggagalkan permintaan", async () => {
  const baik = await api("POST", "/penomoran/pratinjau", { format: FORMAT_JU, digit_counter: 5, reset: "bulan" });
  assert.equal(baik.status, 200);
  assert.match(baik.body.data.contoh, /^JU\.\d{4}\.\d{2}\.00001$/);
  assert.equal(baik.body.data.galat, null);
  const buruk = await api("POST", "/penomoran/pratinjau", { format: [{ jenis: "teks", nilai: "JU" }, { jenis: "counter" }], digit_counter: 5, reset: "bulan" });
  assert.equal(buruk.status, 200);
  assert.match(buruk.body.data.galat, /Tahun dan Bulan/);
});
