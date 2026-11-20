// Jalankan: node --test client/src/shared/lib/uang.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { bacaRupiah, formatRupiah, jumlahkan, teksInput } from "./uang.js";

test("bacaRupiah membaca ketikan gaya Indonesia menjadi teks desimal", () => {
  assert.equal(bacaRupiah("1.250.000,50"), "1250000.50");
  assert.equal(bacaRupiah("1250000"), "1250000.00");
  assert.equal(bacaRupiah("Rp 2.000"), "2000.00");
  assert.equal(bacaRupiah("-500,5"), "-500.50");
  assert.equal(bacaRupiah(""), "");
  assert.equal(bacaRupiah("abc"), null);
  assert.equal(bacaRupiah("1,234"), null);
});

test("formatRupiah menulis penuh, sen hanya kalau ada, kosong jadi tanda pisah", () => {
  assert.equal(formatRupiah("1250000.00"), "Rp 1.250.000");
  assert.equal(formatRupiah("-500.5"), "−Rp 500,50");
  assert.equal(formatRupiah("0.30"), "Rp 0,30");
  assert.equal(formatRupiah(""), "—");
  assert.equal(formatRupiah(null), "—");
});

test("teksInput dan jumlahkan tepat sampai sen", () => {
  assert.equal(teksInput("1250000.50"), "1.250.000,50");
  assert.equal(teksInput("1250000.00"), "1.250.000");
  assert.equal(jumlahkan(["0.10", "0.20"]), "0.30");
  assert.equal(jumlahkan(["33333.33", "33333.33", "33333.33"]), "99999.99");
  assert.equal(jumlahkan(["", null, "5"]), "5.00");
});
