// Migrasi 004: tabel Buku Besar, akun bawaan, departemen, dan penjaga jurnal seimbang.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { kueri, pool } from "../src/shared/db/pool.js";
import { pastikanSkemaUji, selesai } from "./bantu.js";

after(selesai);

test("tabel dan kolom Buku Besar tersedia", async () => {
  await pastikanSkemaUji();
  const { rows } = await kueri(
    `select table_name, column_name from information_schema.columns
      where table_schema = current_schema()
        and table_name in ('departemen','akun','jurnal','jurnal_baris','penyetuju_transaksi','penyetuju_transaksi_pengguna','perusahaan')`,
  );
  const ada = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
  for (const k of [
    "departemen.induk_id",
    "akun.kode",
    "akun.tipe",
    "akun.induk_id",
    "jurnal.nomor",
    "jurnal.status",
    "jurnal.akun_lawan_id",
    "jurnal_baris.debit",
    "jurnal_baris.departemen_id",
    "jurnal_baris.otomatis",
    "penyetuju_transaksi.nilai_minimal",
    "penyetuju_transaksi_pengguna.pengguna_id",
    "perusahaan.akun_ekuitas_saldo_awal_id",
    "perusahaan.akun_laba_ditahan_id",
  ]) {
    assert.ok(ada.has(k), `kolom ${k} belum ada`);
  }
});

test("empat lini bisnis tersedia sebagai departemen", async () => {
  const { rows } = await kueri("select nama from departemen where nama in ('Maklon','Retail','HORECA','Modern Trade')");
  assert.equal(rows.length, 4);
});

test("akun Ekuitas Saldo Awal dan Laba Ditahan bertipe Modal dan terpasang di Preferensi", async () => {
  const { rows } = await kueri(
    `select e.kode as ekuitas, e.tipe as tipe_ekuitas, l.kode as laba, l.tipe as tipe_laba
       from perusahaan p join akun e on e.id = p.akun_ekuitas_saldo_awal_id join akun l on l.id = p.akun_laba_ditahan_id`,
  );
  assert.deepEqual(rows[0], { ekuitas: "300001", tipe_ekuitas: "modal", laba: "300002", tipe_laba: "modal" });
});

test("penomoran bawaan Pencatatan Beban tersedia", async () => {
  const { rows } = await kueri("select bawaan from penomoran where tipe_transaksi = 'pencatatan_beban' and bawaan");
  assert.equal(rows.length, 1);
});

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

async function akunDetail(k, kode) {
  const { rows } = await k.query("select id from akun where kode = $1", [kode]);
  return rows[0].id;
}

test("jurnal yang tidak seimbang ditolak saat disimpan", async () => {
  const k = await pool.connect();
  try {
    await k.query("begin");
    const kas = await akunDetail(k, "110101");
    const modal = await akunDetail(k, "300003");
    const { rows } = await k.query("insert into jurnal (tipe, nomor, tanggal, keterangan, total) values ('jurnal_umum', 'UJI-M004-1', '2027-01-05', 'UJI tidak seimbang', 100) returning id");
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, debit) values ($1, 1, $2, 100)", [rows[0].id, kas]);
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, kredit) values ($1, 2, $2, 90)", [rows[0].id, modal]);
    await assert.rejects(() => k.query("commit"), /tidak seimbang/);
  } finally {
    await k.query("rollback").catch(() => {});
    k.release();
  }
});

test("jurnal seimbang bisa disimpan oleh peran aplikasi", async () => {
  await dalamUji(async (k) => {
    const kas = await akunDetail(k, "110101");
    const modal = await akunDetail(k, "300003");
    const { rows } = await k.query("insert into jurnal (tipe, nomor, tanggal, keterangan, total) values ('jurnal_umum', 'UJI-M004-2', '2027-01-05', 'UJI seimbang', 100) returning id");
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, debit) values ($1, 1, $2, 100)", [rows[0].id, kas]);
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, kredit) values ($1, 2, $2, 100)", [rows[0].id, modal]);
    // Penjaga seimbang dijalankan sebelum commit; set constraints memaksanya sekarang.
    await k.query("set constraints all immediate");
  });
});

test("baris jurnal harus berisi tepat satu dari debit atau kredit", async () => {
  await dalamUji(async (k) => {
    const kas = await akunDetail(k, "110101");
    const { rows } = await k.query("insert into jurnal (tipe, nomor, tanggal, total) values ('jurnal_umum', 'UJI-M004-3', '2027-01-05', 0) returning id");
    await assert.rejects(
      () => k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, debit, kredit) values ($1, 1, $2, 0, 0)", [rows[0].id, kas]),
      /check/,
    );
  });
});
