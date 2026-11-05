// Uji rumus laba rugi & penyusun rencana (tanpa database, tanpa AI).
//   npm run uji
import test from "node:test";
import assert from "node:assert/strict";
import { gabungPos, hitungUkuran, jumlah } from "../src/features/laporan/hitung.js";
import { buatPemeriksaan, susunRencana } from "../src/features/unggahan/rencana.js";

const POS = [
  { kode: "pendapatan", kelompok: "pendapatan", urutan: 10, tambah_ebitda: false },
  { kode: "hpp", kelompok: "hpp", urutan: 30, tambah_ebitda: false },
  { kode: "gaji", kelompok: "biaya_maklon", urutan: 120, tambah_ebitda: false },
  { kode: "penyusutan", kelompok: "biaya_maklon", urutan: 180, tambah_ebitda: true },
  { kode: "bunga_leasing", kelompok: "biaya_lainnya", urutan: 295, tambah_ebitda: true },
  { kode: "materai", kelompok: "biaya_lainnya", urutan: 205, tambah_ebitda: false },
  { kode: "dimples_penyusutan", kelompok: "biaya_dimples", urutan: 450, tambah_ebitda: true },
  { kode: "pajak_penghasilan", kelompok: "di_bawah_laba", urutan: 500, tambah_ebitda: true },
];
const REF = { pos: POS, unit: [{ kode: "EATS", urutan: 1 }, { kode: "BOOMBOO", urutan: 2 }] };

test("kosong bukan nol: jumlah dari semua kosong = null", () => {
  assert.equal(jumlah([undefined, null]), null);
  assert.equal(jumlah([0, undefined]), 0);
  assert.equal(jumlah([1.1, 2.2]), 3.3);
});

test("rumus mengikuti berkas contoh PT EATS Januari", () => {
  // Angka asli Rekap_PT-EATS_2026_DUMMY.xlsx, kolom C (PT EATS Jan), disederhanakan:
  const u = hitungUkuran(
    { pendapatan: 57299000, hpp: 37883000, gaji: 19070000, penyusutan: 2091000, materai: 0, dimples_penyusutan: 160000 },
    POS,
  );
  assert.equal(u.laba_kotor, 19416000);
  assert.equal(u.total_biaya_maklon, 21161000);
  assert.equal(u.total_biaya_dimples, 160000);
  assert.equal(u.total_biaya_operasional, 21321000);
  assert.equal(u.laba_bersih, -1905000);
  assert.equal(u.total_penyusutan, 2251000);
  assert.equal(u.ebitda, 346000);
  assert.ok(Math.abs(u.persen_hpp - 0.661145918776942) < 1e-12);
});

test("EBITDA menambahkan kembali bunga leasing", () => {
  const u = hitungUkuran({ pendapatan: 1000, hpp: 400, bunga_leasing: 100 }, POS);
  assert.equal(u.laba_bersih, 500);
  assert.equal(u.ebitda, 600);
});

test("tanpa pendapatan: laba & margin kosong, bukan nol", () => {
  const u = hitungUkuran({ gaji: 500 }, POS);
  assert.equal(u.total_pendapatan, null);
  assert.equal(u.laba_kotor, null);
  assert.equal(u.laba_bersih, null);
  assert.equal(u.margin_laba_bersih, null);
  assert.equal(u.total_biaya_operasional, 500);
});

test("gabungan menjumlah pos semua unit", () => {
  assert.deepEqual(gabungPos([{ pendapatan: 10, hpp: 4 }, { pendapatan: 5 }]), { pendapatan: 15, hpp: 4 });
});

test("rencana menjumlah dua baris yang menuju pos sama & mencatat asalnya", () => {
  const r = susunRencana({
    jenis_berkas: "excel",
    hasilAi: { adalah_laporan_keuangan: true, judul: "x", catatan: "" },
    butir: [
      { peran: "nilai", unit_kode: "EATS", periode: "2026-01", pos_kode: "gaji", nilai: 100, label: "Outlet", letak: "A1", ragu: false, alasan: "" },
      { peran: "nilai", unit_kode: "EATS", periode: "2026-01", pos_kode: "gaji", nilai: 50, label: "CK", letak: "A2", ragu: true, alasan: "tanpa label" },
      { peran: "nilai", unit_kode: "EATS", periode: "2026-01", pos_kode: "pendapatan", nilai: 1000, label: "Revenue", letak: "A3", ragu: false, alasan: "" },
      { peran: "total", unit_kode: "EATS", periode: "2026-01", ukuran: "laba_bersih", nilai: 850, label: "NP", letak: "A9", ragu: false, alasan: "" },
      { peran: "total", unit_kode: "EATS", periode: "2026-01", ukuran: "total_pendapatan", nilai: 999, label: "TR", letak: "A4", ragu: false, alasan: "" },
    ],
    diabaikan: [],
    peringatan: [],
    ref: REF,
  });
  const gaji = r.nilai.find((n) => n.pos_kode === "gaji");
  assert.equal(gaji.nilai, 150);
  assert.equal(gaji.sumber.length, 2);
  assert.equal(gaji.ragu, true);
  const np = r.pemeriksaan.find((p) => p.ukuran === "laba_bersih");
  assert.equal(np.cocok, true);
  const tr = r.pemeriksaan.find((p) => p.ukuran === "total_pendapatan");
  assert.equal(tr.cocok, false);
  assert.equal(tr.selisih, -1);
  assert.match(r.peringatan[0], /1 dari 2 total/);
});

test("cek silang total tahun menjumlah semua bulan", () => {
  const nilai = [
    { unit_kode: "EATS", periode: "2026-01", pos_kode: "pendapatan", nilai: 100 },
    { unit_kode: "EATS", periode: "2026-02", pos_kode: "pendapatan", nilai: 50 },
    { unit_kode: "BOOMBOO", periode: "2026-02", pos_kode: "pendapatan", nilai: 7 },
  ];
  const cek = buatPemeriksaan(
    [
      { unit_kode: "EATS", periode: "2026", ukuran: "total_pendapatan", nilai: 150 },
      { unit_kode: "GABUNGAN", periode: "2026", ukuran: "total_pendapatan", nilai: 157 },
      { unit_kode: "GABUNGAN", periode: "2026-02", ukuran: "total_pendapatan", nilai: 57 },
    ],
    nilai,
    REF,
  );
  assert.deepEqual(cek.map((c) => c.cocok), [true, true, true]);
});
