// Meniru Vercel: kolam sambungan hanya 1. Kode yang meminta sambungan kedua
// selagi transaksi masih memegang yang pertama akan menunggu sampai habis waktu.
process.env.DB_POOL_MAX = "1";
const { default: test, after, before } = await import("node:test");
const { default: assert } = await import("node:assert/strict");
const { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } = await import("./bantu.js");

// PNG 1×1 piksel: cukup untuk dikenali sebagai foto, tanpa memanggil AI.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

let app, cookie;
before(async () => {
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, await buatPenggunaUji({ peran: "admin" }));
});
after(async () => {
  await app.tutup();
  await selesai();
});

test("membatalkan unggahan yang tidak ada langsung dijawab 404, tidak menggantung", async () => {
  const mulai = Date.now();
  const r = await panggil(app.url, cookie, "POST", "/unggahan/00000000-0000-4000-8000-000000000000/batalkan");
  assert.equal(r.status, 404);
  assert.ok(Date.now() - mulai < 5000, `butuh ${Date.now() - mulai} ms`);
});

test("membatalkan unggahan yang sudah dibatalkan dijawab 409, tidak menggantung", async () => {
  const form = new FormData();
  form.append("berkas", new Blob([PNG], { type: "image/png" }), "uji-kolam-satu.png");
  const res = await fetch(`${app.url}/api/unggahan`, { method: "POST", headers: { cookie }, body: form });
  assert.equal(res.status, 201);
  const id = (await res.json()).data.unggahan.id;
  assert.equal((await panggil(app.url, cookie, "POST", `/unggahan/${id}/batalkan`)).status, 200);
  const mulai = Date.now();
  const kedua = await panggil(app.url, cookie, "POST", `/unggahan/${id}/batalkan`);
  assert.equal(kedua.status, 409);
  assert.ok(Date.now() - mulai < 5000, `butuh ${Date.now() - mulai} ms`);
});
