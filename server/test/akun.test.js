// Akun Perkiraan dan saldo awal ala Accurate: akun bertingkat, saldo awal membuat jurnal
// lawan Ekuitas Saldo Awal, akun yang sudah dipakai terkunci.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { dalamTransaksi, kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, cookie, admin, kunciAsli;
before(async () => {
  ({ rows: [{ kunci_sampai: kunciAsli }] } = await kueri("select kunci_sampai from perusahaan"));
  await kueri("update perusahaan set kunci_sampai = null");
  admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, admin);
});
after(async () => {
  await kueri("update perusahaan set kunci_sampai = $1", [kunciAsli]);
  await app.tutup();
  await selesai();
});

const api = (method, jalur, body) => panggil(app.url, cookie, method, jalur, body);
const buat = (data) => api("POST", "/akun", { catatan: "", nonaktif: false, saldo_awal: "0.00", induk_id: null, ...data });

let induk, anak;

test("membuat akun induk dan anak; kode kembar ditolak", async () => {
  const r1 = await buat({ kode: "UJI1000", nama: "UJI Kas Induk", tipe: "kas_bank" });
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  induk = r1.body.data;
  const r2 = await buat({ kode: "UJI100001", nama: "UJI Kas Kecil", tipe: "kas_bank", induk_id: induk.id });
  assert.equal(r2.status, 201, JSON.stringify(r2.body));
  anak = r2.body.data;
  const kembar = await buat({ kode: "UJI100001", nama: "UJI Lain", tipe: "kas_bank" });
  assert.equal(kembar.status, 409);
  assert.match(kembar.body.error.message, /Kode UJI100001 sudah dipakai/);
});

test("sub akun harus bertipe sama dengan induknya", async () => {
  const r = await buat({ kode: "UJI100002", nama: "UJI Salah Tipe", tipe: "beban", induk_id: induk.id });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /tipe/i);
});

test("saldo awal membuat jurnal seimbang per 31 Desember 2026 melawan Ekuitas Saldo Awal", async () => {
  const r = await api("PUT", `/akun/${anak.id}`, { kode: "UJI100001", nama: "UJI Kas Kecil", tipe: "kas_bank", induk_id: induk.id, catatan: "", nonaktif: false, saldo_awal: "1500000.50" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.saldo_awal, "1500000.50");
  const { rows } = await kueri(
    `select j.tanggal::text, j.nomor, j.status, a.kode, b.debit::text, b.kredit::text
       from jurnal j join jurnal_baris b on b.jurnal_id = j.id join akun a on a.id = b.akun_id
      where j.tipe = 'saldo_awal' and j.akun_lawan_id = $1 order by b.urutan`,
    [anak.id],
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].tanggal, "2026-12-31");
  assert.equal(rows[0].status, "disetujui");
  assert.deepEqual(rows.map((x) => [x.kode, x.debit, x.kredit]), [
    ["UJI100001", "1500000.50", "0.00"],
    ["300001", "0.00", "1500000.50"],
  ]);
});

test("saldo akun induk adalah jumlah akun anaknya", async () => {
  const r = await api("GET", "/akun");
  const i = r.body.data.find((a) => a.id === induk.id);
  const a = r.body.data.find((x) => x.id === anak.id);
  assert.equal(a.saldo, "1500000.50");
  assert.equal(i.saldo, "1500000.50");
  assert.equal(i.punya_anak, true);
  assert.equal(a.tingkat, 1);
});

test("akun induk tidak bisa diberi saldo awal", async () => {
  const r = await api("PUT", `/akun/${induk.id}`, { kode: "UJI1000", nama: "UJI Kas Induk", tipe: "kas_bank", induk_id: null, catatan: "", nonaktif: false, saldo_awal: "5.00" });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /induk/i);
});

test("akun yang sudah dipakai tidak bisa dihapus dan tidak bisa diganti tipenya", async () => {
  const hapus = await api("DELETE", `/akun/${anak.id}`);
  assert.equal(hapus.status, 409);
  assert.match(hapus.body.error.message, /Nonaktifkan saja/);
  const gantiTipe = await api("PUT", `/akun/${anak.id}`, { kode: "UJI100001", nama: "UJI Kas Kecil", tipe: "aset_lainnya", induk_id: null, catatan: "", nonaktif: false, saldo_awal: "1500000.50" });
  assert.equal(gantiTipe.status, 409);
});

test("saldo awal 0 menghapus jurnal saldo awalnya", async () => {
  const r = await api("PUT", `/akun/${anak.id}`, { kode: "UJI100001", nama: "UJI Kas Kecil", tipe: "kas_bank", induk_id: induk.id, catatan: "", nonaktif: false, saldo_awal: "0" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const { rows } = await kueri("select 1 from jurnal where tipe = 'saldo_awal' and akun_lawan_id = $1", [anak.id]);
  assert.equal(rows.length, 0);
});

test("saldo awal negatif dicatat di sisi kebalikannya", async () => {
  const r = await buat({ kode: "UJI2101", nama: "UJI Utang", tipe: "liabilitas_jangka_pendek", saldo_awal: "-250000" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const { rows } = await kueri(
    `select a.kode, b.debit::text, b.kredit::text from jurnal j join jurnal_baris b on b.jurnal_id = j.id join akun a on a.id = b.akun_id
      where j.tipe = 'saldo_awal' and j.akun_lawan_id = $1 order by b.urutan`,
    [r.body.data.id],
  );
  // Utang bersaldo normal kredit; saldo awal negatif berarti debit, dan Ekuitas Saldo Awal di kredit.
  assert.deepEqual(rows.map((x) => [x.kode, x.debit, x.kredit]), [
    ["UJI2101", "250000.00", "0.00"],
    ["300001", "0.00", "250000.00"],
  ]);
});

test("saldo awal ditolak kalau periodenya sudah dikunci", async () => {
  await kueri("update perusahaan set kunci_sampai = '2026-12-31'");
  try {
    const r = await buat({ kode: "UJI1105", nama: "UJI Terkunci", tipe: "aset_lancar_lainnya", saldo_awal: "1000" });
    assert.equal(r.status, 409);
    assert.match(r.body.error.message, /sudah dikunci/);
  } finally {
    await kueri("update perusahaan set kunci_sampai = null");
  }
});

test("akun yang dipakai di Preferensi tidak bisa dihapus", async () => {
  const { rows } = await kueri("select akun_ekuitas_saldo_awal_id as id from perusahaan");
  const r = await api("DELETE", `/akun/${rows[0].id}`);
  assert.equal(r.status, 409);
});

test("akun bebas bisa dihapus, setiap perubahan tercatat di log", async () => {
  const r = await buat({ kode: "UJI9999", nama: "UJI Hapus Saya", tipe: "beban" });
  const hapus = await api("DELETE", `/akun/${r.body.data.id}`);
  assert.equal(hapus.status, 200);
  const log = await kueri("select tindakan from log_aktivitas where menu_kode = 'akun_perkiraan' and referensi like 'UJI9999%' and pengguna_email = $1 order by id", [admin.email]);
  assert.deepEqual(log.rows.map((x) => x.tindakan), ["buat", "hapus"]);
});

test("akun yang sudah punya transaksi tidak bisa dijadikan induk", async () => {
  const pakai = (await buat({ kode: "UJI6001", nama: "UJI Beban Terpakai", tipe: "beban" })).body.data;
  await dalamTransaksi(async (k) => {
    const kas = (await k.query("select id from akun where kode = '110101'")).rows[0].id;
    const { rows } = await k.query(
      "insert into jurnal (tipe, nomor, tanggal, keterangan, total, dibuat_oleh) values ('jurnal_umum', 'UJI-AKUN-1', '2027-01-10', 'UJI akun terpakai', 10, $1) returning id",
      [admin.id],
    );
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, debit) values ($1, 1, $2, 10)", [rows[0].id, pakai.id]);
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, kredit) values ($1, 2, $2, 10)", [rows[0].id, kas]);
  });
  const r = await buat({ kode: "UJI600101", nama: "UJI Anak Baru", tipe: "beban", induk_id: pakai.id });
  assert.equal(r.status, 409);
  assert.match(r.body.error.message, /tidak bisa dijadikan induk/);
});

test("Preferensi: akun Ekuitas Saldo Awal harus bertipe Modal", async () => {
  const { rows } = await kueri("select id from akun where kode = '110101'");
  const pref = (await api("GET", "/preferensi")).body.data;
  const r = await api("PUT", "/preferensi", { ...pref, akun_ekuitas_saldo_awal_id: rows[0].id });
  assert.equal(r.status, 400);
  assert.match(r.body.error.message, /Modal/);
});

// ── Rekening (Tahap 2a) ──────────────────────────────────────────────────
let bank1;

test("akun Kas & Bank menyimpan nama bank dan 4 angka terakhir nomor rekening", async () => {
  const r = await buat({ kode: "UJI-BANK1", nama: "UJI Bank Mandiri", tipe: "kas_bank", bank_nama: "Mandiri", nomor_rekening_akhir: "1234" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.bank_nama, "Mandiri");
  assert.equal(r.body.data.nomor_rekening_akhir, "1234");
  assert.equal(r.body.data.rekening_utama, false);
  bank1 = r.body.data;
  const salah = await buat({ kode: "UJI-BANK9", nama: "UJI Bank Salah", tipe: "kas_bank", nomor_rekening_akhir: "12345" });
  assert.equal(salah.status, 400);
  assert.match(salah.body.error.message, /4 angka terakhir/);
});

test("akun selain Kas & Bank selalu disimpan tanpa nama bank", async () => {
  const r = await buat({ kode: "UJI-BEBAN1", nama: "UJI Beban Bank", tipe: "beban", bank_nama: "BCA", nomor_rekening_akhir: "9999" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.bank_nama, "");
  assert.equal(r.body.data.nomor_rekening_akhir, "");
});

test("rekening utama tidak bisa dinonaktifkan, dihapus, atau diganti tipenya", async () => {
  const { rows: [{ id: utamaAsli }] } = await kueri("select akun_rekening_utama_id as id from perusahaan");
  await kueri("update perusahaan set akun_rekening_utama_id = $1", [bank1.id]);
  try {
    const isi = { kode: bank1.kode, nama: bank1.nama, tipe: "kas_bank", induk_id: null, catatan: "", saldo_awal: "0", bank_nama: "Mandiri", nomor_rekening_akhir: "1234" };
    assert.equal((await api("GET", `/akun/${bank1.id}`)).body.data.rekening_utama, true);
    const nonaktif = await api("PUT", `/akun/${bank1.id}`, { ...isi, nonaktif: true });
    assert.equal(nonaktif.status, 409, JSON.stringify(nonaktif.body));
    assert.match(nonaktif.body.error.message, /Rekening utama/);
    const tipe = await api("PUT", `/akun/${bank1.id}`, { ...isi, tipe: "beban", nonaktif: false });
    assert.equal(tipe.status, 409, JSON.stringify(tipe.body));
    assert.match(tipe.body.error.message, /Rekening utama/);
    const hapus = await api("DELETE", `/akun/${bank1.id}`);
    assert.equal(hapus.status, 409);
    assert.match(hapus.body.error.message, /Rekening utama/);
  } finally {
    await kueri("update perusahaan set akun_rekening_utama_id = $1", [utamaAsli]);
  }
});

test("akun yang dipasang di Preferensi (rekening utama) tidak bisa dijadikan induk", async () => {
  const { rows: [{ id: utamaAsli }] } = await kueri("select akun_rekening_utama_id as id from perusahaan");
  await kueri("update perusahaan set akun_rekening_utama_id = $1", [bank1.id]);
  try {
    const r = await buat({ kode: "UJI-BANK1-1", nama: "UJI Sub Bank", tipe: "kas_bank", induk_id: bank1.id });
    assert.equal(r.status, 409, JSON.stringify(r.body));
    assert.match(r.body.error.message, /Rekening utama/);
  } finally {
    await kueri("update perusahaan set akun_rekening_utama_id = $1", [utamaAsli]);
  }
});
