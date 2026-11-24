// Laporan Kas & Bank: Histori Bank, Arus Kas (metode langsung), dan ringkasan saldo rekening.
// Data tes ada di Desember 2034 – Februari 2035, rentang yang tidak dipakai tes lain.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, cookie, kunciAsli, aturanAsli;
const akun = {};
const dep = {};

const api = (method, jalur, body) => panggil(app.url, cookie, method, jalur, body);
const rinci = (kode, nilai, extra = {}) => ({ akun_id: akun[kode], nilai, departemen_id: null, catatan: "", ...extra });

async function wajib(r) {
  assert.ok(r.status === 200 || r.status === 201, JSON.stringify(r.body));
  return r.body.data;
}

before(async () => {
  ({ rows: [{ kunci_sampai: kunciAsli }] } = await kueri("select kunci_sampai from perusahaan"));
  await kueri("update perusahaan set kunci_sampai = null");
  ({ rows: aturanAsli } = await kueri("select tipe_transaksi, aktif from penyetuju_transaksi"));
  await kueri("update penyetuju_transaksi set aktif = false");
  const admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, admin);
  const { rows } = await kueri("select kode, id from akun where kode in ('300003','400001','600006')");
  for (const r of rows) akun[r.kode] = r.id;
  const { rows: d } = await kueri("select nama, id from departemen where nama in ('Maklon','Retail')");
  for (const r of d) dep[r.nama] = r.id;
  const buatRekening = async (kode, nama) =>
    (await wajib(await api("POST", "/akun", { kode, nama, tipe: "kas_bank", induk_id: null, catatan: "", nonaktif: false, saldo_awal: "0", bank_nama: "UJI" }))).id;
  akun.BANK = await buatRekening("UJI-KB-BANK", "UJI Bank Laporan");
  akun.KAS = await buatRekening("UJI-KB-KAS", "UJI Kas Laporan");
  akun.KOSONG = await buatRekening("UJI-KB-KOSONG", "UJI Rekening Kosong");

  await wajib(await api("POST", "/penerimaan", { tanggal: "2034-12-20", keterangan: "UJI KB 1", akun_lawan_id: akun.BANK, baris: [rinci("400001", "1000000", { departemen_id: dep.Retail })] }));
  await wajib(await api("POST", "/pembayaran", { tanggal: "2035-01-05", keterangan: "UJI KB 2", akun_lawan_id: akun.BANK, baris: [rinci("600006", "250000", { departemen_id: dep.Maklon })] }));
  await wajib(await api("POST", "/transfer-bank", { tanggal: "2035-01-10", keterangan: "UJI KB 3", akun_lawan_id: akun.BANK, akun_tujuan_id: akun.KAS, nilai: "100000" }));
  await wajib(await api("POST", "/penerimaan", { tanggal: "2035-02-03", keterangan: "UJI KB 4", akun_lawan_id: akun.KAS, baris: [rinci("300003", "500000")] }));
});

after(async () => {
  await kueri("update perusahaan set kunci_sampai = $1", [kunciAsli]);
  for (const a of aturanAsli) await kueri("update penyetuju_transaksi set aktif = $2 where tipe_transaksi = $1", [a.tipe_transaksi, a.aktif]);
  await app.tutup();
  await selesai();
});

const semuaBaris = (data) => data.bagian.flatMap((b) => b.baris.map((r) => ({ ...r, bagian: b.kunci })));

test("Arus Kas: kolom per bulan terpotong rentang, arus dikelompokkan, transfer tidak muncul, saldo nyambung", async () => {
  const d = await wajib(await api("GET", "/laporan-keuangan/arus-kas?dari=2034-12-15&sampai=2035-02-10"));
  assert.equal(d.judul, "Arus Kas");
  assert.deepEqual(d.kolom.map((k) => k.kunci), ["2034-12", "2035-01", "2035-02", "total"]);
  assert.equal(d.kolom[0].dari, "2034-12-15");
  assert.equal(d.kolom[0].nama, "Desember 2034");
  assert.equal(d.kolom[2].sampai, "2035-02-10");
  assert.deepEqual(d.bagian.map((b) => b.kunci), ["operasi", "investasi", "pendanaan"]);
  const baris = semuaBaris(d);
  const penjualan = baris.find((r) => r.kode === "400001");
  assert.equal(penjualan.bagian, "operasi");
  assert.equal(penjualan.nilai["2034-12"], "1000000.00");
  assert.equal(penjualan.nilai.total, "1000000.00");
  assert.equal(baris.find((r) => r.kode === "600006").nilai.total, "-250000.00");
  const modal = baris.find((r) => r.kode === "300003");
  assert.equal(modal.bagian, "pendanaan");
  assert.equal(modal.nilai["2035-02"], "500000.00");
  assert.equal(d.bagian.find((b) => b.kunci === "investasi").total.total, "0.00");
  assert.equal(d.kenaikan.total, "1250000.00");
  assert.equal(d.kenaikan["2035-01"], "-250000.00");
  assert.ok(!baris.some((r) => r.kode.startsWith("UJI-KB")), "akun rekening tidak boleh muncul sebagai arus");
  assert.equal(d.cocok, true);
  assert.ok(d.saldo_awal && d.saldo_akhir);
});

test("Arus Kas disaring per lini bisnis: hanya arus departemen itu, tanpa baris saldo", async () => {
  const d = await wajib(await api("GET", `/laporan-keuangan/arus-kas?dari=2034-12-15&sampai=2035-02-10&departemen_id=${dep.Retail}`));
  assert.deepEqual(semuaBaris(d).map((r) => r.kode), ["400001"]);
  assert.equal(d.departemen_nama, "Retail");
  assert.equal(d.saldo_awal, null);
  assert.equal(d.saldo_akhir, null);
  assert.equal(d.cocok, null);
});

test("Arus Kas paling panjang 12 bulan", async () => {
  const r = await api("GET", "/laporan-keuangan/arus-kas?dari=2035-01-01&sampai=2036-01-31");
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /12 bulan/);
});

test("Histori Bank: saldo berjalan rekening, tautan dokumen, dan hanya untuk akun Kas & Bank", async () => {
  const d = await wajib(await api("GET", `/laporan-keuangan/histori-bank?dari=2034-12-01&sampai=2035-01-31&akun_id=${akun.BANK}`));
  assert.equal(d.judul, "Histori Bank");
  const a = d.akun[0];
  assert.equal(a.kode, "UJI-KB-BANK");
  assert.equal(a.baris.length, 3);
  assert.equal(a.saldo_akhir, "650000.00");
  assert.ok(a.baris.every((b) => b.jurnal_id && b.tipe));
  assert.deepEqual(a.baris.map((b) => b.tipe), ["penerimaan", "pembayaran", "transfer_bank"]);
  const bukan = await api("GET", `/laporan-keuangan/histori-bank?dari=2034-12-01&sampai=2035-01-31&akun_id=${akun["600006"]}`);
  assert.equal(bukan.status, 400);
  assert.match(bukan.body.error.message, /Kas & Bank/);
  const utama = await wajib(await api("GET", "/laporan-keuangan/histori-bank?dari=2034-12-01&sampai=2035-01-31"));
  const { rows } = await kueri("select a.kode from perusahaan p join akun a on a.id = p.akun_rekening_utama_id");
  assert.equal(utama.akun[0].kode, rows[0].kode);
});

test("pengguna yang hanya punya hak Histori Bank tidak bisa membuka laporan lain", async () => {
  const { rows: g } = await kueri("insert into akses_grup (nama) values ('UJI Hanya Histori Bank') returning id");
  await kueri("insert into akses_grup_hak (grup_id, menu_kode, lihat) values ($1, 'histori_bank', true)", [g[0].id]);
  const staf = await buatPenggunaUji({ peran: "staf", aksesGrupId: g[0].id });
  const c = await masuk(app.url, staf);
  const q = "dari=2034-12-01&sampai=2035-01-31";
  assert.equal((await panggil(app.url, c, "GET", `/laporan-keuangan/histori-bank?${q}&akun_id=${akun.BANK}`)).status, 200);
  assert.equal((await panggil(app.url, c, "GET", `/laporan-keuangan/histori-bank?${q}&akun_id=${akun["600006"]}`)).status, 400);
  assert.equal((await panggil(app.url, c, "GET", `/laporan-keuangan/buku-besar?${q}&akun_id=${akun["600006"]}`)).status, 403);
  assert.equal((await panggil(app.url, c, "GET", `/laporan-keuangan/arus-kas?${q}`)).status, 403);
  assert.equal((await panggil(app.url, c, "GET", "/laporan-keuangan/ringkasan-kas-bank?per=2035-01-31")).status, 200);
});

test("ringkasan kas & bank: saldo per rekening, rekening tanpa transaksi kosong, dan arus bulan berjalan", async () => {
  const d = await wajib(await api("GET", "/laporan-keuangan/ringkasan-kas-bank?per=2035-01-31"));
  const cari = (kode) => d.rekening.find((r) => r.kode === kode);
  assert.equal(cari("UJI-KB-BANK").saldo, "650000.00");
  assert.equal(cari("UJI-KB-BANK").bank_nama, "UJI");
  assert.equal(cari("UJI-KB-KAS").saldo, "100000.00");
  assert.equal(cari("UJI-KB-KOSONG").saldo, null);
  assert.equal(d.bulan.dari, "2035-01-01");
  assert.equal(d.bulan.sampai, "2035-01-31");
  assert.equal(d.bulan.keluar, "250000.00");
  assert.equal(d.bulan.masuk, "0.00");
  assert.equal(d.bulan.bersih, "-250000.00");
  assert.ok(d.rekening.some((r) => r.utama));
});

test("Arus Kas bisa diunduh Excel; ringkasan tidak punya unduhan", async () => {
  const res = await fetch(`${app.url}/api/laporan-keuangan/arus-kas/excel?dari=2034-12-15&sampai=2035-02-10`, { headers: { cookie } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /spreadsheetml/);
  const tidak = await fetch(`${app.url}/api/laporan-keuangan/ringkasan-kas-bank/excel?per=2035-01-31`, { headers: { cookie } });
  assert.equal(tidak.status, 404);
});

// ── Perbaikan setelah tinjauan akhir ─────────────────────────────────────
test("Arus Kas: saldo awal (31 Desember) menjadi Saldo Kas Awal, bukan selisih yang memicu peringatan", async () => {
  const { rows: [{ mulai }] } = await kueri("select to_char(mulai_periode, 'YYYY-MM-DD') as mulai from perusahaan");
  const sa = await api("POST", "/akun", { kode: "UJI-KB-SA", nama: "UJI Kas Saldo Awal", tipe: "kas_bank", induk_id: null, catatan: "", nonaktif: false, saldo_awal: "500000" });
  assert.equal(sa.status, 201, JSON.stringify(sa.body));
  const tahunLalu = Number(mulai.slice(0, 4)) - 1;
  const d = await wajib(await api("GET", `/laporan-keuangan/arus-kas?dari=${tahunLalu}-12-01&sampai=${mulai.slice(0, 4)}-01-31`));
  assert.equal(d.cocok, true, JSON.stringify({ awal: d.saldo_awal, naik: d.kenaikan, akhir: d.saldo_akhir }));
  // Kesinambungan: saldo akhir Desember = saldo awal Januari.
  assert.equal(d.saldo_akhir[d.kolom[0].kunci], d.saldo_awal[d.kolom[1].kunci]);
});

test("ringkasan kas & bank: sebelum periode akuntansi dimulai, uang masuk/keluar bulan ini kosong (bukan Rp 0)", async () => {
  const { rows: [{ sebelum }] } = await kueri("select to_char(mulai_periode - 10, 'YYYY-MM-DD') as sebelum from perusahaan");
  const d = await wajib(await api("GET", `/laporan-keuangan/ringkasan-kas-bank?per=${sebelum}`));
  assert.equal(d.bulan.masuk, null);
  assert.equal(d.bulan.keluar, null);
  assert.equal(d.bulan.bersih, null);
});

test("pengguna yang hanya punya hak Histori Bank hanya melihat akun Kas & Bank di daftar akun", async () => {
  const { rows: g } = await kueri("insert into akses_grup (nama) values ('UJI Hanya Histori Bank 2') returning id");
  await kueri("insert into akses_grup_hak (grup_id, menu_kode, lihat) values ($1, 'histori_bank', true)", [g[0].id]);
  const staf = await buatPenggunaUji({ peran: "staf", aksesGrupId: g[0].id });
  const c = await masuk(app.url, staf);
  const r = await panggil(app.url, c, "GET", "/akun?aktif=1");
  assert.equal(r.status, 200);
  assert.ok(r.body.data.length > 0);
  assert.deepEqual([...new Set(r.body.data.map((a) => a.tipe))], ["kas_bank"]);
});
