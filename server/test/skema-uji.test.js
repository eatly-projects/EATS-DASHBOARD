// Tes boleh jalan hanya di schema finance_uji, dan alat bantunya bekerja.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { kueri, pool } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, pastikanSkemaUji, selesai } from "./bantu.js";

after(selesai);

test("tes berjalan di finance_uji, bukan finance", async () => {
  await pastikanSkemaUji();
  const { rows } = await kueri("select current_schema() as s");
  assert.equal(rows[0].s, "finance_uji");
});

test("pastikanSkemaUji menolak schema lain", async () => {
  // SET LOCAL di dalam transaksi yang lalu dibatalkan: lewat pooler mode transaksi,
  // SET biasa bisa tertinggal di sambungan server yang kemudian dipakai klien lain.
  const k = await pool.connect();
  try {
    await k.query("begin");
    await k.query("set local search_path to finance");
    await assert.rejects(() => pastikanSkemaUji(k), /hanya boleh di schema finance_uji/);
  } finally {
    await k.query("rollback");
    k.release();
  }
});

test("pengguna uji bisa masuk lewat API", async () => {
  const p = await buatPenggunaUji({ peran: "admin" });
  const app = await jalankanAplikasi();
  try {
    const cookie = await masuk(app.url, p);
    assert.match(cookie, /eats_sesi=/);
  } finally {
    await app.tutup();
  }
});
