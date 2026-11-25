// Migrasi 006: cadangan jawaban terakhir dari aplikasi Operasional (spec §5.1: kalau Operasional
// tidak bisa dihubungi, data terakhir ditampilkan beserta waktunya).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { kueri, pool } from "../src/shared/db/pool.js";
import { pastikanSkemaUji, selesai } from "./bantu.js";

after(selesai);

test("tabel operasional_cadangan punya kolom kunci, isi, dan diambil_pada", async () => {
  await pastikanSkemaUji();
  const { rows } = await kueri(
    `select column_name from information_schema.columns
      where table_schema = current_schema() and table_name = 'operasional_cadangan'`,
  );
  const ada = new Set(rows.map((r) => r.column_name));
  for (const k of ["kunci", "isi", "diambil_pada"]) assert.ok(ada.has(k), `kolom operasional_cadangan.${k} belum ada`);
});

test("kunci adalah primary key: kunci kembar ditolak", async () => {
  const k = await pool.connect();
  try {
    await k.query("begin");
    await k.query("insert into operasional_cadangan (kunci, isi, diambil_pada) values ('uji-kembar', '{}', now())");
    await assert.rejects(
      () => k.query("insert into operasional_cadangan (kunci, isi, diambil_pada) values ('uji-kembar', '{}', now())"),
      (e) => e.code === "23505",
    );
  } finally {
    await k.query("rollback").catch(() => {});
    k.release();
  }
});
