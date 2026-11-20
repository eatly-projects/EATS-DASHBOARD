// Jurnal Umum dan Pencatatan Beban: seimbang, sen tepat, akun detail aktif, periode
// terbuka, nomor tidak kembar, dan Pencatatan Beban menulis kredit Hutang Beban otomatis.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, cookie, admin, kunciAsli, aturanAsli;
const akun = {};
const dep = {};
before(async () => {
  ({ rows: [{ kunci_sampai: kunciAsli }] } = await kueri("select kunci_sampai from perusahaan"));
  await kueri("update perusahaan set kunci_sampai = null");
  // Tes ini tidak boleh terpengaruh aturan persetujuan yang mungkin sedang aktif di data uji.
  ({ rows: aturanAsli } = await kueri("select tipe_transaksi, aktif from penyetuju_transaksi"));
  await kueri("update penyetuju_transaksi set aktif = false");
  admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, admin);
  const { rows } = await kueri("select kode, id from akun where kode in ('110101','110102','300003','400001','600005','600006','210204','6000','110201')");
  for (const r of rows) akun[r.kode] = r.id;
  const { rows: d } = await kueri("select nama, id from departemen where nama in ('Maklon','Retail')");
  for (const r of d) dep[r.nama] = r.id;
  const nonaktif = (await api("POST", "/departemen", { nama: "UJI Dep Nonaktif", nonaktif: true })).body.data;
  dep.nonaktif = nonaktif.id;
});
after(async () => {
  await kueri("update perusahaan set kunci_sampai = $1", [kunciAsli]);
  for (const a of aturanAsli) await kueri("update penyetuju_transaksi set aktif = $2 where tipe_transaksi = $1", [a.tipe_transaksi, a.aktif]);
  await app.tutup();
  await selesai();
});

const api = (method, jalur, body) => panggil(app.url, cookie, method, jalur, body);
const ju = (baris, extra = {}) => api("POST", "/jurnal-umum", { tanggal: "2027-02-10", keterangan: "UJI jurnal", baris, ...extra });
const d = (kode, nilai, extra = {}) => ({ akun_id: akun[kode], debit: nilai, kredit: "0", ...extra });
const k = (kode, nilai, extra = {}) => ({ akun_id: akun[kode], debit: "0", kredit: nilai, ...extra });

let jurnalPertama;

test("jurnal seimbang tersimpan dengan nomor otomatis dan status disetujui", async () => {
  const r = await ju([d("110101", "1000000", { departemen_id: dep.Retail }), k("400001", "1000000", { departemen_id: dep.Retail })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.status, "disetujui");
  assert.match(r.body.data.nomor, /^JU\.2027\.02\.\d{5}$/);
  jurnalPertama = r.body.data;
  const detail = await api("GET", `/jurnal-umum/${jurnalPertama.id}`);
  assert.equal(detail.body.data.total, "1000000.00");
  assert.equal(detail.body.data.baris.length, 2);
  assert.equal(detail.body.data.baris[0].departemen_nama, "Retail");
});

test("jurnal tidak seimbang ditolak dengan pesan berisi kedua total", async () => {
  const r = await ju([d("110101", "1000000"), k("400001", "900000")]);
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /Total debit Rp 1\.000\.000 belum sama dengan total kredit Rp 900\.000/);
});

test("satu baris berisi debit dan kredit sekaligus ditolak", async () => {
  const r = await ju([{ akun_id: akun["110101"], debit: "100", kredit: "100" }, k("400001", "100")]);
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /salah satu/);
});

test("akun induk dan departemen nonaktif tidak bisa dipakai", async () => {
  const induk = await ju([d("6000", "100"), k("110101", "100")]);
  assert.equal(induk.status, 400);
  assert.match(induk.body.error.message, /akun induk/i);
  const nonaktif = await ju([d("600005", "100", { departemen_id: dep.nonaktif }), k("110101", "100")]);
  assert.equal(nonaktif.status, 400);
  assert.match(nonaktif.body.error.message, /nonaktif/);
});

test("angka sen dijumlah tepat: 3 × 33.333,33 = 99.999,99 dan 0,10 + 0,20 = 0,30", async () => {
  const r1 = await ju([d("600005", "33333.33"), d("600006", "33333.33"), d("600005", "33333.33"), k("110101", "99999.99")]);
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  const r2 = await ju([d("600005", "0.10"), d("600006", "0.20"), k("110101", "0.30")]);
  assert.equal(r2.status, 201, JSON.stringify(r2.body));
  const detail = await api("GET", `/jurnal-umum/${r2.body.data.id}`);
  assert.equal(detail.body.data.total, "0.30");
});

test("tanggal sebelum periode akuntansi ditolak", async () => {
  const r = await ju([d("110101", "100"), k("400001", "100")], { tanggal: "2026-12-15" });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /sebelum periode akuntansi dimulai/);
});

test("memindahkan jurnal ke periode terkunci, atau mengubah jurnal di periode terkunci, ditolak", async () => {
  await kueri("update perusahaan set kunci_sampai = '2027-01-31'");
  try {
    const pindah = await api("PUT", `/jurnal-umum/${jurnalPertama.id}`, {
      tanggal: "2027-01-20",
      keterangan: "UJI pindah",
      baris: [d("110101", "1000000"), k("400001", "1000000")],
    });
    assert.equal(pindah.status, 409);
    await kueri("update perusahaan set kunci_sampai = '2027-02-28'");
    const ubah = await api("PUT", `/jurnal-umum/${jurnalPertama.id}`, {
      tanggal: "2027-03-01",
      keterangan: "UJI keluar dari periode terkunci",
      baris: [d("110101", "1000000"), k("400001", "1000000")],
    });
    assert.equal(ubah.status, 409);
    const hapus = await api("DELETE", `/jurnal-umum/${jurnalPertama.id}`);
    assert.equal(hapus.status, 409);
  } finally {
    await kueri("update perusahaan set kunci_sampai = null");
  }
});

test("mengubah jurnal mempertahankan nomornya; menghapus mencatat log", async () => {
  const ubah = await api("PUT", `/jurnal-umum/${jurnalPertama.id}`, {
    tanggal: "2027-02-11",
    keterangan: "UJI jurnal diubah",
    baris: [d("110101", "1200000"), k("400001", "1200000")],
  });
  assert.equal(ubah.status, 200, JSON.stringify(ubah.body));
  assert.equal(ubah.body.data.nomor, jurnalPertama.nomor);
  const hapus = await api("DELETE", `/jurnal-umum/${jurnalPertama.id}`);
  assert.equal(hapus.status, 200);
  const { rows } = await kueri(
    "select tindakan from log_aktivitas where menu_kode = 'jurnal_umum' and referensi = $1 and pengguna_email = $2 order by id",
    [jurnalPertama.nomor, admin.email],
  );
  assert.deepEqual(rows.map((x) => x.tindakan), ["buat", "ubah", "hapus"]);
});

test("Pencatatan Beban menulis debit setiap beban dan kredit Hutang Beban otomatis", async () => {
  const r = await api("POST", "/pencatatan-beban", {
    tanggal: "2027-02-15",
    jatuh_tempo: "2027-03-15",
    keterangan: "UJI beban Februari",
    akun_lawan_id: akun["210204"],
    baris: [
      { akun_id: akun["600005"], nilai: "2000000", departemen_id: dep.Maklon, catatan: "Sewa gudang" },
      { akun_id: akun["600006"], nilai: "500000", departemen_id: dep.Retail, catatan: "Listrik" },
    ],
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.data.nomor, /^PB\.2027\.02\.\d{5}$/);
  const { rows } = await kueri(
    `select a.kode, b.debit::text, b.kredit::text, b.otomatis from jurnal_baris b join akun a on a.id = b.akun_id
      where b.jurnal_id = $1 order by b.urutan`,
    [r.body.data.id],
  );
  assert.deepEqual(rows.map((x) => [x.kode, x.debit, x.kredit, x.otomatis]), [
    ["600005", "2000000.00", "0.00", false],
    ["600006", "500000.00", "0.00", false],
    ["210204", "0.00", "2500000.00", true],
  ]);
  const detail = await api("GET", `/pencatatan-beban/${r.body.data.id}`);
  assert.equal(detail.body.data.baris.length, 2);
  assert.equal(detail.body.data.baris[0].nilai, "2000000.00");
  assert.equal(detail.body.data.akun_lawan_nama, "210204 Hutang Biaya");
});

test("Pencatatan Beban: Hutang Beban harus liabilitas jangka pendek dan rincian harus akun beban", async () => {
  const bukanUtang = await api("POST", "/pencatatan-beban", {
    tanggal: "2027-02-15",
    akun_lawan_id: akun["110101"],
    baris: [{ akun_id: akun["600005"], nilai: "1000" }],
  });
  assert.equal(bukanUtang.status, 400);
  assert.match(bukanUtang.body.error.message, /Liabilitas Jangka Pendek/);
  const bukanBeban = await api("POST", "/pencatatan-beban", {
    tanggal: "2027-02-15",
    akun_lawan_id: akun["210204"],
    baris: [{ akun_id: akun["110102"], nilai: "1000" }],
  });
  assert.equal(bukanBeban.status, 400);
  assert.match(bukanBeban.body.error.message, /akun beban/);
});

test("jurnal yang menyimpan bersamaan dengan dua penomoran bersusunan sama tidak mendapat nomor kembar", async () => {
  const format = [{ jenis: "teks", nilai: "JU." }, { jenis: "tahun" }, { jenis: "teks", nilai: "." }, { jenis: "bulan" }, { jenis: "teks", nilai: "." }, { jenis: "counter" }];
  const p2 = await api("POST", "/penomoran", { nama: "UJI JU Kembar", tipe_transaksi: "jurnal_umum", format, digit_counter: 5, reset: "bulan", bawaan: false });
  assert.equal(p2.status, 201, JSON.stringify(p2.body));
  const simpan = (penomoran_id) =>
    api("POST", "/jurnal-umum", { tanggal: "2027-06-10", keterangan: "UJI paralel", penomoran_id, baris: [d("600005", "100"), k("110101", "100")] });
  const hasil = await Promise.all(Array.from({ length: 6 }, (_, i) => simpan(i % 2 ? p2.body.data.id : null)));
  for (const h of hasil) assert.equal(h.status, 201, JSON.stringify(h.body));
  const nomor = hasil.map((h) => h.body.data.nomor);
  assert.equal(new Set(nomor).size, nomor.length, `nomor kembar: ${nomor.join(", ")}`);
});

test("daftar jurnal bisa disaring tanggal dan memuat total", async () => {
  const r = await api("GET", "/jurnal-umum?dari=2027-02-01&sampai=2027-02-28&cari=UJI");
  assert.equal(r.status, 200);
  assert.ok(r.body.data.jumlah >= 2);
  assert.ok(r.body.data.baris.every((b) => b.tanggal >= "2027-02-01" && b.tanggal <= "2027-02-28"));
});

test("Operator tanpa hak Jurnal Umum ditolak", async () => {
  const operator = await buatPenggunaUji({ peran: "staf" });
  const r = await panggil(app.url, await masuk(app.url, operator), "GET", "/jurnal-umum");
  assert.equal(r.status, 403);
});
