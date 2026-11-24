// Kas & Bank: Penerimaan (debit rekening), Pembayaran (kredit rekening), dan Transfer Bank
// (debit tujuan, kredit asal), lewat modul jurnal bersama. Semua tanggal di Juli 2033.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, cookie, kunciAsli, aturanAsli, penyetujuAsli;
const akun = {};
const dep = {};
before(async () => {
  ({ rows: [{ kunci_sampai: kunciAsli }] } = await kueri("select kunci_sampai from perusahaan"));
  await kueri("update perusahaan set kunci_sampai = null");
  ({ rows: aturanAsli } = await kueri("select tipe_transaksi, aktif, nilai_minimal from penyetuju_transaksi"));
  ({ rows: penyetujuAsli } = await kueri("select tipe_transaksi, pengguna_id from penyetuju_transaksi_pengguna"));
  await kueri("update penyetuju_transaksi set aktif = false");
  const admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, admin);
  const { rows } = await kueri(
    "select kode, id from akun where kode in ('110101','110102','110201','110401','210101','300003','400001','600005','600006','700002')",
  );
  for (const r of rows) akun[r.kode] = r.id;
  const { rows: d } = await kueri("select nama, id from departemen where nama in ('Maklon','Retail')");
  for (const r of d) dep[r.nama] = r.id;
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

const api = (method, jalur, body) => panggil(app.url, cookie, method, jalur, body);
const TGL = "2033-07-15";
const rinci = (kode, nilai, extra = {}) => ({ akun_id: akun[kode], nilai, departemen_id: null, catatan: "", ...extra });
const isiKas = (rekening, baris, keterangan) => ({ tanggal: TGL, keterangan, akun_lawan_id: akun[rekening] ?? rekening, baris });
const terima = (rekening, baris) => api("POST", "/penerimaan", isiKas(rekening, baris, "UJI penerimaan"));
const bayar = (rekening, baris) => api("POST", "/pembayaran", isiKas(rekening, baris, "UJI pembayaran"));
const isiTransfer = (dari, ke, nilai) => ({ tanggal: TGL, keterangan: "UJI transfer", akun_lawan_id: akun[dari] ?? dari, akun_tujuan_id: akun[ke] ?? ke, nilai });

async function barisDb(jurnalId) {
  const { rows } = await kueri(
    `select a.kode, b.debit::text as debit, b.kredit::text as kredit, b.otomatis
       from jurnal_baris b join akun a on a.id = b.akun_id where b.jurnal_id = $1 order by b.urutan`,
    [jurnalId],
  );
  return rows;
}

test("Penerimaan menulis debit rekening dan kredit setiap rincian", async () => {
  const r = await terima("110102", [rinci("400001", "1000000", { departemen_id: dep.Retail }), rinci("700002", "0.30")]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.status, "disetujui");
  assert.match(r.body.data.nomor, /^BM\.2033\.07\.\d{5}$/);
  assert.equal(r.body.data.total, "1000000.30");
  assert.equal(r.body.data.baris.length, 2);
  assert.equal(r.body.data.baris[1].nilai, "0.30");
  assert.deepEqual(await barisDb(r.body.data.id), [
    { kode: "400001", debit: "0.00", kredit: "1000000.00", otomatis: false },
    { kode: "700002", debit: "0.00", kredit: "0.30", otomatis: false },
    { kode: "110102", debit: "1000000.30", kredit: "0.00", otomatis: true },
  ]);
});

test("Pembayaran menulis kredit rekening", async () => {
  const r = await bayar("110101", [rinci("600006", "250000", { departemen_id: dep.Maklon })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.data.nomor, /^BK\.2033\.07\.\d{5}$/);
  assert.equal(r.body.data.akun_lawan_nama, "110101 Kas");
  assert.deepEqual(await barisDb(r.body.data.id), [
    { kode: "600006", debit: "250000.00", kredit: "0.00", otomatis: false },
    { kode: "110101", debit: "0.00", kredit: "250000.00", otomatis: true },
  ]);
});

test("Transfer Bank: debit tujuan, kredit asal; diubah dan ditukar mengikuti isian terbaru", async () => {
  const r = await api("POST", "/transfer-bank", isiTransfer("110102", "110101", "100000"));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.data.nomor, /^TB\.2033\.07\.\d{5}$/);
  assert.equal(r.body.data.akun_tujuan_id, akun["110101"]);
  assert.equal(r.body.data.nilai, "100000.00");
  assert.deepEqual(await barisDb(r.body.data.id), [
    { kode: "110101", debit: "100000.00", kredit: "0.00", otomatis: false },
    { kode: "110102", debit: "0.00", kredit: "100000.00", otomatis: true },
  ]);
  const ubah = await api("PUT", `/transfer-bank/${r.body.data.id}`, isiTransfer("110101", "110102", "100000"));
  assert.equal(ubah.status, 200, JSON.stringify(ubah.body));
  assert.equal(ubah.body.data.nomor, r.body.data.nomor);
  assert.deepEqual(await barisDb(r.body.data.id), [
    { kode: "110102", debit: "100000.00", kredit: "0.00", otomatis: false },
    { kode: "110101", debit: "0.00", kredit: "100000.00", otomatis: true },
  ]);
  const daftar = await api("GET", "/transfer-bank?cari=UJI%20transfer");
  const baris = daftar.body.data.baris.find((x) => x.id === r.body.data.id);
  assert.equal(baris.akun_lawan_nama, "110101 Kas");
  assert.equal(baris.akun_tujuan_nama, "110102 Bank");
});

test("rekening harus Kas & Bank, dan asal ≠ tujuan", async () => {
  const kepala = await terima("600005", [rinci("400001", "1000")]);
  assert.equal(kepala.status, 400);
  assert.match(kepala.body.error.message, /Kas & Bank/);
  const tujuan = await api("POST", "/transfer-bank", isiTransfer("110102", "600005", "1000"));
  assert.equal(tujuan.status, 400);
  assert.match(tujuan.body.error.message, /Kas & Bank/);
  const sama = await api("POST", "/transfer-bank", isiTransfer("110102", "110102", "1000"));
  assert.equal(sama.status, 400);
  assert.match(sama.body.error.message, /tidak boleh sama/);
});

test("rincian akun rekening diarahkan ke Transfer Bank", async () => {
  const r = await bayar("110102", [rinci("110101", "1000")]);
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /Transfer Bank/);
});

test("piutang, utang usaha, dan persediaan dicatat di Operasional", async () => {
  for (const kode of ["110201", "210101", "110401"]) {
    const r = await terima("110102", [rinci(kode, "1000")]);
    assert.equal(r.status, 400, kode);
    assert.match(r.body.error.message, /aplikasi Operasional/, kode);
  }
});

test("rekening nonaktif ditolak untuk transaksi baru, tetapi transaksi lama tetap bisa diubah", async () => {
  const bank = await api("POST", "/akun", { kode: "UJI-BANK2", nama: "UJI Bank Dua", tipe: "kas_bank", induk_id: null, catatan: "", nonaktif: false, saldo_awal: "0" });
  assert.equal(bank.status, 201, JSON.stringify(bank.body));
  const lama = await terima(bank.body.data.id, [rinci("400001", "5000")]);
  assert.equal(lama.status, 201, JSON.stringify(lama.body));
  const isiAkun = { kode: "UJI-BANK2", nama: "UJI Bank Dua", tipe: "kas_bank", induk_id: null, catatan: "", saldo_awal: "0" };
  assert.equal((await api("PUT", `/akun/${bank.body.data.id}`, { ...isiAkun, nonaktif: true })).status, 200);
  const baru = await terima(bank.body.data.id, [rinci("400001", "5000")]);
  assert.equal(baru.status, 400);
  assert.match(baru.body.error.message, /nonaktif/);
  const ubah = await api("PUT", `/penerimaan/${lama.body.data.id}`, { ...isiKas(bank.body.data.id, [rinci("400001", "5000")], "UJI penerimaan diubah") });
  assert.equal(ubah.status, 200, JSON.stringify(ubah.body));
});

test("aturan Penyetuju berlaku per tipe", async () => {
  const { rows: g } = await kueri("insert into akses_grup (nama) values ('UJI Penyetuju Kas') returning id");
  await kueri("insert into akses_grup_hak (grup_id, menu_kode, lihat) values ($1, 'persetujuan', true), ($1, 'pembayaran', true)", [g[0].id]);
  const penyetuju = await buatPenggunaUji({ peran: "staf", aksesGrupId: g[0].id });
  const atur = await api("PUT", "/penyetuju-transaksi/pembayaran", { aktif: true, nilai_minimal: null, penyetuju: [penyetuju.id] });
  assert.equal(atur.status, 200, JSON.stringify(atur.body));
  const r = await bayar("110102", [rinci("600005", "750000")]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.status, "diajukan");
  assert.equal(r.body.data.nomor, null);
  const terimaLangsung = await terima("110102", [rinci("400001", "750000")]);
  assert.equal(terimaLangsung.body.data.status, "disetujui");
  const cookiePenyetuju = await masuk(app.url, penyetuju);
  const setujui = await panggil(app.url, cookiePenyetuju, "POST", `/persetujuan/${r.body.data.id}/setujui`);
  assert.equal(setujui.status, 200, JSON.stringify(setujui.body));
  assert.match(setujui.body.data.nomor, /^BK\.2033\.07\.\d{5}$/);
  await api("PUT", "/penyetuju-transaksi/pembayaran", { aktif: false, nilai_minimal: null, penyetuju: [penyetuju.id] });
});

test("hak per menu: hanya Penerimaan tidak bisa membuat Pembayaran, tetapi bisa memilih akun", async () => {
  const { rows: g } = await kueri("insert into akses_grup (nama) values ('UJI Hanya Penerimaan') returning id");
  await kueri("insert into akses_grup_hak (grup_id, menu_kode, lihat, buat) values ($1, 'penerimaan', true, true)", [g[0].id]);
  const staf = await buatPenggunaUji({ peran: "staf", aksesGrupId: g[0].id });
  const c = await masuk(app.url, staf);
  const r = await panggil(app.url, c, "POST", "/pembayaran", isiKas("110102", [rinci("600005", "1000")], "UJI tanpa hak"));
  assert.equal(r.status, 403);
  assert.equal((await panggil(app.url, c, "GET", "/akun?aktif=1")).status, 200);
});
