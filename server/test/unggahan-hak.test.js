// Hak akses di menu lama (Unggah Laporan, Ringkasan) dan jejak unggahan di log.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

// PNG 1×1 piksel: cukup untuk dikenali sebagai foto, tanpa memanggil AI.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

let app, admin, cookieAdmin;
before(async () => {
  admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookieAdmin = await masuk(app.url, admin);
});
after(async () => {
  await app.tutup();
  await selesai();
});

test("Operator tanpa akses grup tidak bisa membuka unggahan maupun ringkasan", async () => {
  const cookie = await masuk(app.url, await buatPenggunaUji({ peran: "staf" }));
  const unggahan = await panggil(app.url, cookie, "GET", "/unggahan");
  assert.equal(unggahan.status, 403);
  assert.equal(unggahan.body.error.code, "TANPA_HAK");
  const laporan = await panggil(app.url, cookie, "GET", "/laporan");
  assert.equal(laporan.status, 403);
});

test("Operator yang hanya boleh melihat tidak bisa menyetujui", async () => {
  const { rows } = await kueri("insert into akses_grup (nama) values ('UJI Lihat Unggahan') returning id");
  await kueri("insert into akses_grup_hak (grup_id, menu_kode, lihat) values ($1, 'unggah_laporan', true)", [rows[0].id]);
  const cookie = await masuk(app.url, await buatPenggunaUji({ peran: "staf", aksesGrupId: rows[0].id }));
  assert.equal((await panggil(app.url, cookie, "GET", "/unggahan")).status, 200);
  const setujui = await panggil(app.url, cookie, "POST", "/unggahan/00000000-0000-4000-8000-000000000000/setujui", { nilai: [] });
  assert.equal(setujui.status, 403);
});

test("Administrator tetap bisa membuka ringkasan", async () => {
  assert.equal((await panggil(app.url, cookieAdmin, "GET", "/laporan")).status, 200);
});

test("mengunggah dan membatalkan unggahan tercatat di log", async () => {
  const form = new FormData();
  form.append("berkas", new Blob([PNG], { type: "image/png" }), "uji-log.png");
  const res = await fetch(`${app.url}/api/unggahan`, { method: "POST", headers: { cookie: cookieAdmin }, body: form });
  assert.equal(res.status, 201);
  const id = (await res.json()).data.unggahan.id;
  const batal = await panggil(app.url, cookieAdmin, "POST", `/unggahan/${id}/batalkan`);
  assert.equal(batal.status, 200);

  const { rows } = await kueri(
    "select tindakan, referensi, sesudah from log_aktivitas where menu_kode = 'unggah_laporan' and pengguna_email = $1 order by id",
    [admin.email],
  );
  assert.deepEqual(rows.map((r) => r.tindakan), ["buat", "ubah"]);
  assert.equal(rows[0].referensi, "uji-log.png");
  assert.equal(rows[1].sesudah.Status, "Dibatalkan");
});
