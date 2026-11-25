// Penghubung ke aplikasi Operasional (spec §5.1): kunci rahasia, pesan galat biasa, cadangan data
// terakhir saat Operasional tidak bisa dihubungi, dan blok cek. Selalu memakai server tiruan.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { kueri } from "../src/shared/db/pool.js";
import { pastikanSkemaUji, selesai } from "./bantu.js";
import { contohPiutang, mulaiTiruan } from "./operasional-tiruan.js";
import { ambilOperasional } from "../src/features/operasional/operasional.klien.js";

const ENV_ASLI = { url: process.env.OPERASIONAL_API_URL, kunci: process.env.OPERASIONAL_API_KEY };
let cadanganAsli;

before(async () => {
  await pastikanSkemaUji();
  ({ rows: cadanganAsli } = await kueri("select kunci, isi, diambil_pada from operasional_cadangan where kunci = 'piutang'"));
});
after(async () => {
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

const arahkan = (url, kunci = "kunci-uji") => {
  process.env.OPERASIONAL_API_URL = url;
  process.env.OPERASIONAL_API_KEY = kunci;
};
const kosongkanCadangan = () => kueri("delete from operasional_cadangan where kunci = 'piutang'");
const isiCadangan = async () => (await kueri("select isi from operasional_cadangan where kunci = 'piutang'")).rows[0]?.isi;

async function pakaiTiruan(opsi, kerja) {
  const t = await mulaiTiruan(opsi);
  try {
    return await kerja(t);
  } finally {
    await t.tutup();
  }
}

async function galatDari(janji) {
  try {
    await janji;
  } catch (e) {
    return e;
  }
  assert.fail("seharusnya melempar galat");
}

test("mengirim X-Api-Key dan mengembalikan data §89", async () => {
  await pakaiTiruan({}, async (t) => {
    arahkan(`${t.url}/`);
    const r = await ambilOperasional("piutang");
    assert.deepEqual(t.kunciDiterima, ["kunci-uji"]);
    assert.equal(r.data.baris.length, 4);
    assert.equal(r.basi, false);
    assert.deepEqual(r.cekGagal, []);
  });
});

test("jawaban sah disimpan sebagai cadangan", async () => {
  await kosongkanCadangan();
  await pakaiTiruan({ isi: contohPiutang({ generated_at: "2026-11-25T04:00:00.000Z" }) }, async (t) => {
    arahkan(t.url);
    await ambilOperasional("piutang");
  });
  assert.equal((await isiCadangan()).generated_at, "2026-11-25T04:00:00.000Z");
});

test("env kosong → 503 Kunci sambungan ke Operasional belum dipasang", async () => {
  process.env.OPERASIONAL_API_URL = "";
  process.env.OPERASIONAL_API_KEY = "";
  const e = await galatDari(ambilOperasional("piutang"));
  assert.equal(e.status, 503);
  assert.equal(e.code, "OPERASIONAL_BELUM_DIPASANG");
  assert.match(e.message, /^Kunci sambungan ke Operasional belum dipasang/);
});

test("Operasional 503 → 503 pesan yang sama", async () => {
  await pakaiTiruan({ status: 503 }, async (t) => {
    arahkan(t.url);
    const e = await galatDari(ambilOperasional("piutang"));
    assert.equal(e.status, 503);
    assert.match(e.message, /^Kunci sambungan ke Operasional belum dipasang/);
  });
});

test("503 yang bukan jawaban Operasional (bukan JSON) → dianggap tidak terhubung, pakai cadangan", async () => {
  await kosongkanCadangan();
  await pakaiTiruan({ isi: contohPiutang({ generated_at: "2026-11-25T05:30:00.000Z" }) }, async (t) => {
    arahkan(t.url);
    await ambilOperasional("piutang");
    t.ubah({ status: 503, mentah: "<html>Service Unavailable</html>" });
    const r = await ambilOperasional("piutang");
    assert.equal(r.basi, true);
    assert.equal(r.data.generated_at, "2026-11-25T05:30:00.000Z");
  });
});

test("Operasional 401 → 502 OPERASIONAL_KUNCI_SALAH, tanpa menyebut kuncinya", async () => {
  await pakaiTiruan({ kunci: "kunci-benar" }, async (t) => {
    arahkan(t.url, "kunci-rahasia-salah");
    const e = await galatDari(ambilOperasional("piutang"));
    assert.equal(e.status, 502);
    assert.equal(e.code, "OPERASIONAL_KUNCI_SALAH");
    assert.match(e.message, /^Kunci sambungan ke Operasional salah/);
    assert.doesNotMatch(e.message, /kunci-rahasia-salah/);
  });
});

test("tidak terhubung dengan cadangan → basi true, data cadangan", async () => {
  await kosongkanCadangan();
  const t = await mulaiTiruan({ isi: contohPiutang({ generated_at: "2026-11-25T05:00:00.000Z" }) });
  arahkan(t.url);
  await ambilOperasional("piutang");
  await t.tutup();
  const r = await ambilOperasional("piutang");
  assert.equal(r.basi, true);
  assert.equal(r.data.generated_at, "2026-11-25T05:00:00.000Z");
  assert.deepEqual(r.cekGagal, []);
});

test("tidak terhubung tanpa cadangan → 502 OPERASIONAL_TIDAK_TERHUBUNG", async () => {
  await kosongkanCadangan();
  const t = await mulaiTiruan();
  await t.tutup();
  arahkan(t.url);
  const e = await galatDari(ambilOperasional("piutang"));
  assert.equal(e.status, 502);
  assert.equal(e.code, "OPERASIONAL_TIDAK_TERHUBUNG");
});

test("menggantung → berhenti sendiri", async () => {
  await kosongkanCadangan();
  await pakaiTiruan({ tunda: 2000 }, async (t) => {
    arahkan(t.url);
    const mulai = Date.now();
    const e = await galatDari(ambilOperasional("piutang", { batasMs: 200 }));
    assert.equal(e.code, "OPERASIONAL_TIDAK_TERHUBUNG");
    assert.ok(Date.now() - mulai < 1500, `butuh ${Date.now() - mulai} ms`);
  });
});

test("200 berisi HTML atau tanpa baris → dianggap tidak terhubung dan tidak menimpa cadangan", async () => {
  await kosongkanCadangan();
  await pakaiTiruan({ isi: contohPiutang({ generated_at: "2026-11-25T06:00:00.000Z" }) }, async (t) => {
    arahkan(t.url);
    await ambilOperasional("piutang");
    t.ubah({ mentah: "<html><body>Galat</body></html>" });
    const html = await ambilOperasional("piutang");
    assert.equal(html.basi, true);
    assert.equal(html.data.generated_at, "2026-11-25T06:00:00.000Z");
    const { baris: _b, ...tanpaBaris } = contohPiutang({ generated_at: "2026-11-25T07:00:00.000Z" });
    t.ubah({ mentah: null, isi: tanpaBaris });
    const rusak = await ambilOperasional("piutang");
    assert.equal(rusak.basi, true);
  });
  assert.equal((await isiCadangan()).generated_at, "2026-11-25T06:00:00.000Z");
});

test("cek gagal → cekGagal berisi namanya dan cadangan tidak ditimpa", async () => {
  await kosongkanCadangan();
  await pakaiTiruan({ isi: contohPiutang({ generated_at: "2026-11-25T08:00:00.000Z" }) }, async (t) => {
    arahkan(t.url);
    await ambilOperasional("piutang");
    t.ubah({
      isi: contohPiutang({
        generated_at: "2026-11-25T09:00:00.000Z",
        cek: [
          { nama: "setiap dokumen muncul satu kali", ok: true },
          { nama: "sisa per umur dijumlah = sisa", ok: false },
        ],
      }),
    });
    const r = await ambilOperasional("piutang");
    assert.equal(r.basi, false);
    assert.deepEqual(r.cekGagal, ["sisa per umur dijumlah = sisa"]);
    assert.equal(r.data.generated_at, "2026-11-25T09:00:00.000Z");
  });
  assert.equal((await isiCadangan()).generated_at, "2026-11-25T08:00:00.000Z");
});
