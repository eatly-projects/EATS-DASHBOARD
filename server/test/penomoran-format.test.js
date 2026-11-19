// Susunan nomor otomatis (tanpa database).
import test from "node:test";
import assert from "node:assert/strict";
import { kunciPeriode, periksaFormat, susunNomor } from "../src/features/penomoran/format.js";

const JU = {
  format: [{ jenis: "teks", nilai: "JU." }, { jenis: "tahun" }, { jenis: "teks", nilai: "." }, { jenis: "bulan" }, { jenis: "teks", nilai: "." }, { jenis: "counter" }],
  digit_counter: 5,
};

test("nomor disusun dari bagian-bagiannya", () => {
  assert.equal(susunNomor(JU, "2027-01-15", 1), "JU.2027.01.00001");
});

test("bulan Romawi dan tahun singkat", () => {
  const inv = {
    format: [{ jenis: "teks", nilai: "INV/" }, { jenis: "bulan_romawi" }, { jenis: "teks", nilai: "/" }, { jenis: "tahun_singkat" }, { jenis: "teks", nilai: "/" }, { jenis: "counter" }],
    digit_counter: 3,
  };
  assert.equal(susunNomor(inv, "2027-07-21", 42), "INV/VII/27/042");
});

test("nomor urut yang melebihi jumlah digit tidak dipotong", () => {
  assert.equal(susunNomor(JU, "2027-01-15", 123456), "JU.2027.01.123456");
});

test("bagian hari memakai dua angka", () => {
  assert.equal(susunNomor({ format: [{ jenis: "hari" }, { jenis: "counter" }], digit_counter: 1 }, "2027-12-09", 7), "097");
});

test("kunci periode mengikuti kapan nomor urut diulang", () => {
  assert.equal(kunciPeriode("bulan", "2027-01-15"), "2027-01");
  assert.equal(kunciPeriode("tahun", "2027-01-15"), "2027");
  assert.equal(kunciPeriode("hari", "2027-01-15"), "2027-01-15");
  assert.equal(kunciPeriode("tidak", "2027-01-15"), "");
});

test("susunan yang bisa menghasilkan nomor kembar ditolak", () => {
  assert.match(periksaFormat({ format: [{ jenis: "teks", nilai: "JU" }, { jenis: "counter" }], digit_counter: 5, reset: "bulan" }), /Tahun dan Bulan/);
  assert.match(periksaFormat({ format: [{ jenis: "tahun" }], digit_counter: 5, reset: "tidak" }), /tepat satu Nomor urut/);
  assert.match(periksaFormat({ format: [{ jenis: "counter" }, { jenis: "counter" }], digit_counter: 5, reset: "tidak" }), /tepat satu Nomor urut/);
  assert.match(periksaFormat({ format: [{ jenis: "teks", nilai: "  " }, { jenis: "counter" }], digit_counter: 5, reset: "tidak" }), /Teks/);
  assert.match(periksaFormat({ ...JU, digit_counter: 11, reset: "bulan" }), /1 sampai 10/);
  assert.equal(periksaFormat({ ...JU, reset: "bulan" }), null);
});
