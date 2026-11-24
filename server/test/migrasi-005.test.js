// Migrasi 005: tipe jurnal Kas & Bank, kolom rekening, rekening utama, dan penomoran bawaan.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { kueri, pool } from "../src/shared/db/pool.js";
import { pastikanSkemaUji, selesai } from "./bantu.js";

after(selesai);

async function dalamUji(kerja) {
  const k = await pool.connect();
  try {
    await k.query("begin");
    return await kerja(k);
  } finally {
    await k.query("rollback").catch(() => {});
    k.release();
  }
}

test("kolom rekening dan rekening utama tersedia", async () => {
  await pastikanSkemaUji();
  const { rows } = await kueri(
    `select table_name, column_name from information_schema.columns
      where table_schema = current_schema() and table_name in ('akun', 'perusahaan')`,
  );
  const ada = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
  for (const k of ["akun.bank_nama", "akun.nomor_rekening_akhir", "perusahaan.akun_rekening_utama_id"]) {
    assert.ok(ada.has(k), `kolom ${k} belum ada`);
  }
});

test("rekening utama bawaan adalah 110102 Bank dengan nama bank BCA", async () => {
  const { rows } = await kueri("select a.kode, a.bank_nama from perusahaan p join akun a on a.id = p.akun_rekening_utama_id");
  assert.deepEqual(rows[0], { kode: "110102", bank_nama: "BCA" });
});

test("penomoran bawaan Penerimaan, Pembayaran, dan Transfer Bank tersedia", async () => {
  const { rows } = await kueri(
    "select tipe_transaksi, count(*)::int as n from penomoran where bawaan and tipe_transaksi in ('penerimaan','pembayaran','transfer_bank') group by tipe_transaksi",
  );
  assert.deepEqual(Object.fromEntries(rows.map((r) => [r.tipe_transaksi, r.n])), { penerimaan: 1, pembayaran: 1, transfer_bank: 1 });
});

test("tipe jurnal transfer_bank diterima dan tipe asing ditolak", async () => {
  await dalamUji(async (k) => {
    await k.query("insert into jurnal (tipe, tanggal, status, total) values ('transfer_bank', '2027-01-05', 'diajukan', 0)");
    await assert.rejects(
      () => k.query("insert into jurnal (tipe, tanggal, status, total) values ('asal', '2027-01-05', 'diajukan', 0)"),
      (e) => e.code === "23514",
    );
  });
});

test("nomor rekening hanya boleh kosong atau tepat 4 angka", async () => {
  await dalamUji(async (k) => {
    await assert.rejects(() => k.query("update akun set nomor_rekening_akhir = '12a4' where kode = '110102'"), (e) => e.code === "23514");
  });
});
