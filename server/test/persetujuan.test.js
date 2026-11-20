// Penyetuju Transaksi dan Persetujuan ala Accurate: transaksi yang kena aturan menunggu
// tanpa nomor; hanya penyetujunya yang bisa menyetujui atau menolak.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, cAdmin, cA, cB, A, kunciAsli, aturanAsli, penyetujuAsli;
const akun = {};
before(async () => {
  ({ rows: [{ kunci_sampai: kunciAsli }] } = await kueri("select kunci_sampai from perusahaan"));
  await kueri("update perusahaan set kunci_sampai = null");
  ({ rows: aturanAsli } = await kueri("select tipe_transaksi, aktif, nilai_minimal from penyetuju_transaksi"));
  ({ rows: penyetujuAsli } = await kueri("select tipe_transaksi, pengguna_id from penyetuju_transaksi_pengguna"));
  const { rows: g } = await kueri("insert into akses_grup (nama) values ('UJI Penyetuju') returning id");
  for (const menu of ["persetujuan", "jurnal_umum"]) {
    await kueri("insert into akses_grup_hak (grup_id, menu_kode, lihat, buat, ubah) values ($1, $2, true, $3, $3)", [g[0].id, menu, menu === "jurnal_umum"]);
  }
  const admin = await buatPenggunaUji({ peran: "admin" });
  A = await buatPenggunaUji({ peran: "staf", aksesGrupId: g[0].id });
  const B = await buatPenggunaUji({ peran: "staf", aksesGrupId: g[0].id });
  app = await jalankanAplikasi();
  cAdmin = await masuk(app.url, admin);
  cA = await masuk(app.url, A);
  cB = await masuk(app.url, B);
  const { rows } = await kueri("select kode, id from akun where kode in ('110101','600005')");
  for (const r of rows) akun[r.kode] = r.id;
});
after(async () => {
  await kueri("update perusahaan set kunci_sampai = $1", [kunciAsli]);
  await kueri("delete from penyetuju_transaksi");
  for (const a of aturanAsli) {
    await kueri("insert into penyetuju_transaksi (tipe_transaksi, aktif, nilai_minimal) values ($1, $2, $3)", [a.tipe_transaksi, a.aktif, a.nilai_minimal]);
  }
  for (const p of penyetujuAsli) {
    await kueri("insert into penyetuju_transaksi_pengguna (tipe_transaksi, pengguna_id) values ($1, $2) on conflict do nothing", [p.tipe_transaksi, p.pengguna_id]);
  }
  await app.tutup();
  await selesai();
});

const sebagai = (cookie) => (method, jalur, body) => panggil(app.url, cookie, method, jalur, body);
const admin = (...x) => sebagai(cAdmin)(...x);
const jurnal = (nilai, keterangan = "UJI persetujuan") => ({
  tanggal: "2027-04-10",
  keterangan,
  baris: [
    { akun_id: akun["600005"], debit: nilai, kredit: "0" },
    { akun_id: akun["110101"], debit: "0", kredit: nilai },
  ],
});

let disetujui, menunggu;

test("Administrator mengatur aturan: Jurnal Umum mulai Rp 10.000.000 disetujui oleh A", async () => {
  const r = await admin("PUT", "/penyetuju-transaksi/jurnal_umum", { aktif: true, nilai_minimal: "10000000", penyetuju: [A.id] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const daftar = await admin("GET", "/penyetuju-transaksi");
  const ju = daftar.body.data.find((x) => x.tipe_transaksi === "jurnal_umum");
  assert.equal(ju.aktif, true);
  assert.equal(ju.nilai_minimal, "10000000.00");
  assert.deepEqual(ju.penyetuju.map((p) => p.id), [A.id]);
  const kosong = await admin("PUT", "/penyetuju-transaksi/pencatatan_beban", { aktif: true, nilai_minimal: null, penyetuju: [] });
  assert.equal(kosong.status, 400);
  const operator = await sebagai(cA)("GET", "/penyetuju-transaksi");
  assert.equal(operator.status, 403);
});

test("di bawah nilai minimal langsung disetujui; di atasnya menunggu tanpa nomor", async () => {
  const kecil = await admin("POST", "/jurnal-umum", jurnal("5000000"));
  assert.equal(kecil.status, 201, JSON.stringify(kecil.body));
  assert.equal(kecil.body.data.status, "disetujui");
  disetujui = kecil.body.data;
  const besar = await admin("POST", "/jurnal-umum", jurnal("20000000"));
  assert.equal(besar.status, 201, JSON.stringify(besar.body));
  assert.equal(besar.body.data.status, "diajukan");
  assert.equal(besar.body.data.nomor, null);
  menunggu = besar.body.data;
});

test("daftar Persetujuan menandai siapa yang bisa memutuskan", async () => {
  const olehA = await sebagai(cA)("GET", "/persetujuan");
  assert.equal(olehA.status, 200, JSON.stringify(olehA.body));
  const baris = olehA.body.data.find((x) => x.id === menunggu.id);
  assert.equal(baris.bisa_putuskan, true);
  assert.match(baris.penyetuju_nama, /UJI/);
  const olehB = await sebagai(cB)("GET", "/persetujuan");
  assert.equal(olehB.body.data.find((x) => x.id === menunggu.id).bisa_putuskan, false);
  const jumlah = await sebagai(cA)("GET", "/persetujuan/jumlah");
  assert.ok(jumlah.body.data.menunggu_saya >= 1);
});

test("pembuat yang bukan penyetuju (Administrator) tidak bisa menyetujui transaksinya sendiri", async () => {
  const r = await admin("POST", `/persetujuan/${menunggu.id}/setujui`);
  assert.equal(r.status, 403);
});

test("periode tidak bisa dikunci selama masih ada transaksi yang menunggu persetujuan di dalamnya", async () => {
  const pref = (await admin("GET", "/preferensi")).body.data;
  const r = await admin("PUT", "/preferensi", { ...pref, kunci_sampai: "2027-04-30" });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.match(r.body.error.message, /menunggu persetujuan/);
});

test("menyetujui transaksi yang tanggalnya sudah terkunci ditolak", async () => {
  await kueri("update perusahaan set kunci_sampai = '2027-04-30'");
  try {
    const r = await sebagai(cA)("POST", `/persetujuan/${menunggu.id}/setujui`);
    assert.equal(r.status, 409);
    assert.match(r.body.error.message, /sudah dikunci/);
  } finally {
    await kueri("update perusahaan set kunci_sampai = null");
  }
});

test("penyetuju wajib punya hak Lihat di menu Persetujuan", async () => {
  const tanpaHak = await buatPenggunaUji({ peran: "staf" });
  const r = await admin("PUT", "/penyetuju-transaksi/pencatatan_beban", { aktif: true, nilai_minimal: null, penyetuju: [tanpaHak.id] });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /Persetujuan/);
});

test("bukan penyetuju tidak bisa menyetujui; penyetuju menyetujui dan transaksi mendapat nomor", async () => {
  const olehB = await sebagai(cB)("POST", `/persetujuan/${menunggu.id}/setujui`);
  assert.equal(olehB.status, 403);
  const olehA = await sebagai(cA)("POST", `/persetujuan/${menunggu.id}/setujui`);
  assert.equal(olehA.status, 200, JSON.stringify(olehA.body));
  assert.equal(olehA.body.data.status, "disetujui");
  assert.match(olehA.body.data.nomor, /^JU\.2027\.04\.\d{5}$/);
  assert.equal(olehA.body.data.diputuskan_oleh_nama.startsWith("UJI"), true);
  const lagi = await sebagai(cA)("POST", `/persetujuan/${menunggu.id}/setujui`);
  assert.equal(lagi.status, 409);
});

test("ditolak dengan alasan; diubah pembuatnya lalu menunggu lagi", async () => {
  const r = await admin("POST", "/jurnal-umum", jurnal("15000000", "UJI ditolak"));
  const tanpaAlasan = await sebagai(cA)("POST", `/persetujuan/${r.body.data.id}/tolak`, { alasan: "" });
  assert.equal(tanpaAlasan.status, 400);
  const tolak = await sebagai(cA)("POST", `/persetujuan/${r.body.data.id}/tolak`, { alasan: "UJI bukti belum lengkap" });
  assert.equal(tolak.status, 200, JSON.stringify(tolak.body));
  assert.equal(tolak.body.data.status, "ditolak");
  assert.equal(tolak.body.data.alasan_keputusan, "UJI bukti belum lengkap");
  const ubah = await admin("PUT", `/jurnal-umum/${r.body.data.id}`, jurnal("15000000", "UJI ditolak lalu diperbaiki"));
  assert.equal(ubah.status, 200, JSON.stringify(ubah.body));
  assert.equal(ubah.body.data.status, "diajukan");
  assert.equal(ubah.body.data.alasan_keputusan, "");
});

test("mengubah transaksi disetujui melewati nilai minimal: menunggu lagi dengan nomor tetap", async () => {
  const r = await admin("PUT", `/jurnal-umum/${disetujui.id}`, jurnal("12000000"));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.status, "diajukan");
  assert.equal(r.body.data.nomor, disetujui.nomor);
});

// Keputusan Lutfi 2026-11-20: boleh, karena saat bos sibuk finance yang mengatur semuanya.
test("penyetuju boleh menyetujui transaksi yang ia ajukan sendiri", async () => {
  const sendiri = await sebagai(cA)("POST", "/jurnal-umum", jurnal("25000000", "UJI diajukan penyetuju sendiri"));
  assert.equal(sendiri.status, 201, JSON.stringify(sendiri.body));
  assert.equal(sendiri.body.data.status, "diajukan");
  const id = sendiri.body.data.id;
  const daftar = await sebagai(cA)("GET", "/persetujuan");
  assert.equal(daftar.body.data.find((x) => x.id === id).bisa_putuskan, true);
  const setujui = await sebagai(cA)("POST", `/persetujuan/${id}/setujui`);
  assert.equal(setujui.status, 200, JSON.stringify(setujui.body));
  assert.equal(setujui.body.data.status, "disetujui");
  assert.match(setujui.body.data.nomor, /^JU\.2027\.04\.\d{5}$/);
});

test("aturan dimatikan: transaksi besar langsung disetujui", async () => {
  const r = await admin("PUT", "/penyetuju-transaksi/jurnal_umum", { aktif: false, nilai_minimal: "10000000", penyetuju: [A.id] });
  assert.equal(r.status, 200);
  const j = await admin("POST", "/jurnal-umum", jurnal("30000000"));
  assert.equal(j.body.data.status, "disetujui");
});
