// Penjualan › Umur Piutang (spec §5.2): susunan per pelanggan dan per dokumen dari §89 Operasional,
// saringan lini bisnis, cek Operasional sebagai syarat tampil, dan hak menu. Memakai server tiruan.
import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, pastikanSkemaUji, selesai } from "./bantu.js";
import { contohPiutang, mulaiTiruan, ringkas } from "./operasional-tiruan.js";
import { susunUmurPiutang } from "../src/features/umur-piutang/umur-piutang.service.js";

const ENV_ASLI = { url: process.env.OPERASIONAL_API_URL, kunci: process.env.OPERASIONAL_API_KEY };
let cadanganAsli;
let app, cookie, tiruan;

before(async () => {
  await pastikanSkemaUji();
  ({ rows: cadanganAsli } = await kueri("select kunci, isi, diambil_pada from operasional_cadangan where kunci = 'piutang'"));
  tiruan = await mulaiTiruan({ kunci: "kunci-uji" });
  process.env.OPERASIONAL_API_URL = tiruan.url;
  process.env.OPERASIONAL_API_KEY = "kunci-uji";
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, await buatPenggunaUji({ peran: "admin" }));
});
after(async () => {
  await tiruan.tutup();
  await app.tutup();
  for (const [k, v] of [["OPERASIONAL_API_URL", ENV_ASLI.url], ["OPERASIONAL_API_KEY", ENV_ASLI.kunci]]) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await kueri("delete from operasional_cadangan where kunci = 'piutang'");
  for (const r of cadanganAsli) {
    await kueri("insert into operasional_cadangan (kunci, isi, diambil_pada) values ($1, $2, $3)", [r.kunci, r.isi, r.diambil_pada]);
  }
  await selesai();
});

const api = (jalur) => panggil(app.url, cookie, "GET", jalur);

/** contohPiutang dengan baris yang diubah, ringkasannya dihitung ulang supaya tetap konsisten. */
function denganBaris(ubah) {
  const d = contohPiutang();
  const baris = ubah(d.baris);
  return { ...d, baris, ...ringkas(baris) };
}

function galatDari(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  assert.fail("seharusnya melempar galat");
}

describe("susunUmurPiutang", () => {
  test("dokumen lunas dibuang; total dan sisa per umur dalam teks rupiah", () => {
    const r = susunUmurPiutang(contohPiutang());
    assert.equal(r.diperbarui, "2026-11-25T03:00:00.000Z");
    assert.equal(r.hari_ini, "2026-11-25");
    assert.equal(r.total.jumlah_dokumen, 3);
    assert.equal(r.total.jumlah_pelanggan, 2);
    assert.equal(r.total.sisa, "3100000.00");
    assert.deepEqual(r.total.sisa_per_umur, {
      belum_jatuh_tempo: "0.00",
      telat_1_30: "2500000.00",
      telat_31_60: "0.00",
      telat_lebih_60: "0.00",
      tanpa_jatuh_tempo: "600000.00",
    });
    assert.ok(!r.pelanggan.some((p) => p.kode === "C-0002"), "C-0002 sudah lunas");
  });

  test("C-0001 di urutan pertama, dokumennya dari tanggal tertua, CO tanpa jatuh tempo", () => {
    const [c1] = susunUmurPiutang(contohPiutang()).pelanggan;
    assert.equal(c1.kode, "C-0001");
    assert.equal(c1.kunci, "11111111-1111-4111-8111-111111111111");
    assert.equal(c1.jumlah_dokumen, 2);
    assert.equal(c1.sisa, "3100000.00");
    assert.equal(c1.sisa_per_umur.tanpa_jatuh_tempo, "600000.00");
    assert.equal(c1.sisa_per_umur.telat_1_30, "2500000.00");
    assert.deepEqual(c1.dokumen.map((d) => d.nomor_dokumen), ["01-Boomboo-PO/XI/2026", "03/boomboo/XI/2026"]);
    const co = c1.dokumen[1];
    assert.equal(co.jatuh_tempo, null);
    assert.equal(co.umur_piutang, "tanpa_jatuh_tempo");
    assert.equal(co.total_tagihan, "1000000.00");
    assert.equal(co.dibayar, "400000.00");
    assert.match(co.url_operasional, /^https:\/\/boomboo-operations\.vercel\.app\/pesanan-klien\/co\//);
  });

  test("pelanggan tanpa id dikelompokkan menurut nama tanpa beda huruf besar/kecil", () => {
    const data = denganBaris((baris) => [
      ...baris,
      {
        ...baris[3],
        id_dokumen: "aaaaaaaa-0000-4000-8000-000000000005",
        nomor_dokumen: "02/boomboo/X/2026",
        customer: { id: null, kode: null, nama: "toko lama", telepon: null },
        total_tagihan_rp: 50000,
        total_retur_rp: 0,
        dibayar_rp: 0,
        sisa_rp: 50000,
        harus_dikembalikan_rp: 0,
        umur_piutang: "tanpa_jatuh_tempo",
        status: "belum",
      },
    ]);
    const lama = susunUmurPiutang(data).pelanggan.filter((p) => p.nama.toLowerCase() === "toko lama");
    assert.equal(lama.length, 1);
    assert.equal(lama[0].kunci, "nama:toko lama");
    assert.equal(lama[0].jumlah_dokumen, 2);
    assert.equal(lama[0].kode, null);
  });

  test("harus dikembalikan tampil tetapi tidak masuk sisa per umur", () => {
    const r = susunUmurPiutang(contohPiutang());
    assert.equal(r.total.harus_dikembalikan, "150000.00");
    const lama = r.pelanggan.find((p) => p.nama === "Toko Lama");
    assert.equal(lama.harus_dikembalikan, "150000.00");
    assert.equal(lama.sisa, "0.00");
    const jumlah = Object.values(r.total.sisa_per_umur).reduce((a, v) => a + Number(v), 0);
    assert.equal(jumlah.toFixed(2), r.total.sisa);
  });

  test("saringan lini bisnis: maklon dan tanpa lini bisnis", () => {
    const maklon = susunUmurPiutang(contohPiutang(), { segmen: "maklon" });
    assert.deepEqual(maklon.pelanggan.flatMap((p) => p.dokumen.map((d) => d.nomor_dokumen)), ["03/boomboo/XI/2026"]);
    assert.equal(maklon.total.sisa, "600000.00");
    const tanpa = susunUmurPiutang(contohPiutang(), { segmen: "tanpa" });
    assert.deepEqual(tanpa.pelanggan.map((p) => p.nama), ["Toko Lama"]);
  });

  test("tautan selain https dibuang", () => {
    const data = denganBaris((baris) => baris.map((b, i) => (i === 0 ? { ...b, url_operasional: "javascript:alert(1)" } : b)));
    const co = susunUmurPiutang(data).pelanggan[0].dokumen.find((d) => d.jenis_dokumen === "co");
    assert.equal(co.url_operasional, null);
  });

  test("baris bukan objek atau tanpa tanggal → 502 OPERASIONAL_TIDAK_DIKENALI, bukan TypeError", () => {
    const rusak = [
      denganBaris((baris) => [...baris.slice(0, 1), { ...baris[1], tanggal_dokumen: null }, ...baris.slice(2)]),
      { ...contohPiutang(), baris: [null, ...contohPiutang().baris] },
    ];
    for (const data of rusak) {
      const e = galatDari(() => susunUmurPiutang(data));
      assert.equal(e.code, "OPERASIONAL_TIDAK_DIKENALI", e.message);
    }
  });

  test("angka atau kelompok umur yang tidak bisa dibaca → 502 OPERASIONAL_TIDAK_DIKENALI", () => {
    for (const ubah of [{ total_tagihan_rp: "abc" }, { umur_piutang: "telat_entah" }]) {
      const data = denganBaris((baris) => baris.map((b, i) => (i === 0 ? { ...b, ...ubah } : b)));
      const e = galatDari(() => susunUmurPiutang(data));
      assert.equal(e.status, 502, JSON.stringify(ubah));
      assert.equal(e.code, "OPERASIONAL_TIDAK_DIKENALI");
    }
  });
});

describe("GET /api/umur-piutang", () => {
  test("admin melihat data dari Operasional", async () => {
    tiruan.ubah({ status: 200, isi: contohPiutang(), mentah: null });
    const r = await api("/umur-piutang");
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.data.basi, false);
    assert.deepEqual(r.body.data.cek_gagal, []);
    assert.equal(r.body.data.pelanggan[0].kode, "C-0001");
    assert.equal(r.body.data.diperbarui, "2026-11-25T03:00:00.000Z");
  });

  test("saringan tidak dikenal ditolak 400", async () => {
    const r = await api("/umur-piutang?segmen=entah");
    assert.equal(r.status, 400);
    assert.equal(r.body.error.message, "Lini bisnis tidak dikenal.");
  });

  test("kunci salah dijawab 502, bukan 401 (401 berarti sesi EATS habis)", async () => {
    process.env.OPERASIONAL_API_KEY = "kunci-lain";
    try {
      const r = await api("/umur-piutang");
      assert.equal(r.status, 502);
      assert.match(r.body.error.message, /^Kunci sambungan ke Operasional salah/);
    } finally {
      process.env.OPERASIONAL_API_KEY = "kunci-uji";
    }
  });

  test("env kosong → 503", async () => {
    process.env.OPERASIONAL_API_KEY = "";
    try {
      const r = await api("/umur-piutang");
      assert.equal(r.status, 503);
      assert.match(r.body.error.message, /^Kunci sambungan ke Operasional belum dipasang/);
    } finally {
      process.env.OPERASIONAL_API_KEY = "kunci-uji";
    }
  });

  test("cek Operasional gagal → tanpa angka, nama ceknya disebut", async () => {
    tiruan.ubah({ isi: contohPiutang({ cek: [{ nama: "sisa per umur dijumlah = sisa", ok: false }] }) });
    try {
      const r = await api("/umur-piutang");
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.data.total, null);
      assert.deepEqual(r.body.data.pelanggan, []);
      assert.deepEqual(r.body.data.cek_gagal, ["sisa per umur dijumlah = sisa"]);
    } finally {
      tiruan.ubah({ isi: contohPiutang() });
    }
  });

  test("isi baris rusak → data cadangan terakhir, cadangan tidak ditimpa", async () => {
    tiruan.ubah({ isi: contohPiutang() });
    assert.equal((await api("/umur-piutang")).status, 200);
    const rusak = [{ total_tagihan_rp: "abc" }, { umur_piutang: "telat_entah" }];
    try {
      for (const ubah of rusak) {
        const isi = denganBaris((baris) => baris.map((b, i) => (i === 0 ? { ...b, ...ubah } : b)));
        tiruan.ubah({ isi: { ...isi, generated_at: "2026-11-25T09:30:00.000Z" } });
        const r = await api("/umur-piutang");
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.data.basi, true, JSON.stringify(ubah));
        assert.equal(r.body.data.diperbarui, "2026-11-25T03:00:00.000Z");
        const { rows } = await kueri("select isi->>'generated_at' as g from operasional_cadangan where kunci = 'piutang'");
        assert.equal(rows[0].g, "2026-11-25T03:00:00.000Z");
      }
      await kueri("delete from operasional_cadangan where kunci = 'piutang'");
      const tanpa = await api("/umur-piutang");
      assert.equal(tanpa.status, 502);
      assert.equal(tanpa.body.error.code, "OPERASIONAL_TIDAK_DIKENALI");
    } finally {
      tiruan.ubah({ isi: contohPiutang() });
    }
  });

  test("hak menu: Operator tanpa hak 403, dengan hak Lihat 200", async () => {
    const { rows: g } = await kueri("insert into akses_grup (nama) values ('UJI Umur Piutang') returning id");
    await kueri("insert into akses_grup_hak (grup_id, menu_kode, lihat) values ($1, 'umur_piutang', true)", [g[0].id]);
    const tanpa = await masuk(app.url, await buatPenggunaUji({ peran: "staf" }));
    assert.equal((await panggil(app.url, tanpa, "GET", "/umur-piutang")).status, 403);
    const dengan = await masuk(app.url, await buatPenggunaUji({ peran: "staf", aksesGrupId: g[0].id }));
    assert.equal((await panggil(app.url, dengan, "GET", "/umur-piutang")).status, 200);
  });

  test("navigasi admin memuat Penjualan › Umur Piutang", async () => {
    const r = await api("/navigasi");
    const penjualan = r.body.data.modul.find((m) => m.kode === "penjualan");
    assert.ok(penjualan, "modul penjualan belum ada");
    assert.deepEqual(penjualan.menu.map((m) => m.kode), ["umur_piutang"]);
    assert.equal(penjualan.menu[0].path, "/penjualan/umur-piutang");
  });
});
