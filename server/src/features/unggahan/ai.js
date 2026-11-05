// Pembaca dokumen dengan AI — pola sama dengan "upload PO" di Operations V2
// (clone-projects/backend/src/features/boomboo-customer-pos/bacaAi.js):
// Claude dulu, kalau gagal Gemini 3.5 Flash, lalu Gemini 3.5 Flash Lite.
//
// Dua mode:
//   petakanExcel  -> AI menerima RINGKASAN teks buku kerja dan hanya memutuskan
//                    arti baris & kolom. Angkanya diambil program dari sel.
//   bacaDokumen   -> PDF/foto: AI membaca angka sekaligus memetakannya.
//
// AI tidak pernah menyimpan apa pun. Hasilnya jadi RENCANA yang harus dicek dan
// disetujui user (keputusan Lutfi, 2026-11-05).
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { env } from "../../config/env.js";
import { DAFTAR_UKURAN } from "../laporan/hitung.js";

const MODEL_CLAUDE = "claude-opus-5-5";
const MODEL_GEMINI = [
  { model: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { model: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
];
// Pemetaan satu buku kerja ±100 baris butuh jawaban beberapa ribu token, jadi
// batasnya lebih longgar daripada PO (45 detik). Claude tidak diulang
// (maxRetries 0): kalau gagal langsung pindah ke cadangan.
const BATAS_CLAUDE_MS = 150_000;
const BATAS_GEMINI_MS = 90_000;
const FOTO_CLAUDE = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const UKURAN_KODE = DAFTAR_UKURAN.map((u) => u.kode);

// ── Skema jawaban ──────────────────────────────────────────────────────────
// Tanpa kolom null: Claude membatasi jumlah kolom yang boleh null. Teks kosong
// "" dipakai untuk "tidak ada".
function skemaPeta(ref) {
  const unit = ref.unit.map((u) => u.kode);
  const pos = ref.pos.map((p) => p.kode);
  return {
    type: "object",
    additionalProperties: false,
    required: ["adalah_laporan_keuangan", "lembar", "judul", "kolom", "baris", "catatan"],
    properties: {
      adalah_laporan_keuangan: { type: "boolean" },
      lembar: { type: "string" },
      judul: { type: "string" },
      catatan: { type: "string" },
      kolom: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["kolom", "peran", "unit_kode", "periode"],
          properties: {
            kolom: { type: "string" },
            peran: { type: "string", enum: ["unit", "gabungan", "total_tahun_unit", "total_tahun_gabungan", "abaikan"] },
            unit_kode: { type: "string", enum: [...unit, ""] },
            periode: { type: "string" },
          },
        },
      },
      baris: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["baris", "peran", "pos_kode", "ukuran", "ragu", "alasan"],
          properties: {
            baris: { type: "integer" },
            peran: { type: "string", enum: ["nilai", "total", "abaikan"] },
            pos_kode: { type: "string", enum: [...pos, ""] },
            ukuran: { type: "string", enum: [...UKURAN_KODE, ""] },
            ragu: { type: "boolean" },
            alasan: { type: "string" },
          },
        },
      },
    },
  };
}

function skemaDokumen(ref) {
  const unit = ref.unit.map((u) => u.kode);
  const pos = ref.pos.map((p) => p.kode);
  return {
    type: "object",
    additionalProperties: false,
    required: ["adalah_laporan_keuangan", "judul", "angka", "catatan"],
    properties: {
      adalah_laporan_keuangan: { type: "boolean" },
      judul: { type: "string" },
      catatan: { type: "string" },
      angka: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label_asli", "letak", "peran", "pos_kode", "ukuran", "unit_kode", "periode", "nilai", "ragu", "alasan"],
          properties: {
            label_asli: { type: "string" },
            letak: { type: "string" },
            peran: { type: "string", enum: ["nilai", "total", "abaikan"] },
            pos_kode: { type: "string", enum: [...pos, ""] },
            ukuran: { type: "string", enum: [...UKURAN_KODE, ""] },
            unit_kode: { type: "string", enum: [...unit, "GABUNGAN"] },
            periode: { type: "string" },
            nilai: { type: "number" },
            ragu: { type: "boolean" },
            alasan: { type: "string" },
          },
        },
      },
    },
  };
}

// ── Instruksi ──────────────────────────────────────────────────────────────
function daftarAcuan(ref) {
  const unit = ref.unit.map((u) => `- ${u.kode}: ${u.nama} (${u.keterangan})`).join("\n");
  const kelompok = Object.fromEntries(ref.kelompok.map((k) => [k.kode, k.nama]));
  const pos = ref.pos
    .map((p) => `- ${p.kode}: ${p.nama} [${kelompok[p.kelompok]}]${p.nama_di_berkas ? ` — di berkas contoh: "${p.nama_di_berkas}"` : ""}`)
    .join("\n");
  const ukuran = [
    "- total_pendapatan: jumlah semua pos pendapatan (mis. TOTAL REVENUE)",
    "- total_hpp: jumlah harga pokok penjualan (mis. TOTAL COGS)",
    "- laba_kotor: pendapatan − harga pokok (mis. Gross Profit)",
    "- biaya_lainnya: jumlah rincian biaya lain-lain maklon (mis. baris 'j - Lainnya' atau jumlah 'breakdown lainnya')",
    "- total_biaya_maklon: jumlah biaya operasional maklon termasuk lain-lain (mis. OPEX MAKLON)",
    "- total_biaya_dimples: jumlah biaya operasional Dimples (mis. Opex DIMPLES)",
    "- total_biaya_operasional: biaya maklon + biaya Dimples (mis. TOTAL OPEX)",
    "- laba_bersih: laba kotor − total biaya operasional (mis. NET PROFIT(LOSS))",
    "- total_penyusutan: penyusutan maklon + penyusutan Dimples (mis. baris 'Accumulated')",
    "- ebitda: laba bersih + bunga + pajak + penyusutan + amortisasi (mis. EBITDA)",
  ].join("\n");
  return `UNIT USAHA (kode):\n${unit}\n\nPOS RINCI (kode: nama [kelompok]):\n${pos}\n\nUKURAN TOTAL (untuk baris total):\n${ukuran}`;
}

const ATURAN_UMUM = `ATURAN:
1. Angka yang dipetakan sebagai "nilai" akan DIJUMLAH untuk membentuk total. Karena itu hanya baris RINCIAN yang boleh berperan "nilai". Baris yang merupakan jumlah, salinan, atau persentase dari baris lain TIDAK boleh "nilai" — kalau tidak, angkanya dihitung dua kali.
2. Baris jumlah yang cocok dengan salah satu UKURAN TOTAL berperan "total" dengan kode ukurannya. Program akan mencocokkan hasil hitungannya sendiri dengan angka total ini (cek silang).
3. "abaikan" untuk: persentase/rasio; baris pengecekan (crosscheck); baris berumus yang hanya menyalin satu sel lain (mis. =L98) karena angkanya sudah ada di baris aslinya; rincian di bawah sebuah baris yang sudah dijumlah ke baris induknya (kalau induknya sudah "nilai"); blok tanpa judul yang tidak ikut dijumlah ke total mana pun.
4. Pos "j - Lainnya" yang merupakan jumlah rinciannya: baris itu "total" (biaya_lainnya), rinciannya "nilai" dengan pos rincian biaya lain-lain yang paling cocok.
5. Rincian biaya lain-lain yang tidak cocok dengan pos mana pun: pos lainnya_tanpa_kategori, ragu=true, alasan berisi nama aslinya.
6. Biaya Dimples (outlet) dipetakan ke pos dimples_*, bukan pos maklon, walaupun namanya mirip (mis. "- Marketing" di bawah judul Opex DIMPLES = dimples_marketing). Beberapa baris gaji Dimples (outlet, CK, THR) boleh dipetakan ke pos yang sama; angkanya dijumlah.
7. "Other Income"/pendapatan lain di dalam rincian biaya lain-lain = pendapatan_lain_lain (nilainya mengurangi biaya, jangan diubah tandanya).
8. Baris/kolom/lembar tersembunyi tetap data yang sah.
9. Isi ragu=true dengan alasan singkat bila tidak yakin. Isi alasan juga untuk setiap "abaikan". Selain itu alasan boleh "".
10. Kalau berkas bukan laporan laba rugi, isi adalah_laporan_keuangan=false dan biarkan daftar kosong.`;

// Catatan dibaca staf keuangan awam di layar pengecekan: tanpa kode, tanpa istilah teknis.
const ATURAN_CATATAN = `"catatan": 2–4 kalimat bahasa Indonesia sederhana untuk staf yang akan mengecek: isi berkas (unit, rentang bulan) dan hal yang perlu mereka periksa. JANGAN menulis kode pos/ukuran (seperti biaya_lainnya), nama kolom huruf (seperti AJ), atau istilah teknis; sebut nama pos dalam bahasa biasa dan nomor baris bila perlu. Hanya tulis hal yang benar-benar Anda lihat di berkas.`;

function instruksiExcel(ref) {
  return `Anda membantu bagian keuangan PT EATS memasukkan laporan laba rugi ke dashboard.
Anda menerima RINGKASAN sebuah buku kerja Excel: label setiap baris, judul kolom, dan contoh angka beserta rumusnya.
Tugas Anda HANYA memetakan: setiap baris berangka itu pos apa (atau total apa), dan setiap kolom berangka itu unit apa dan bulan apa.
Anda TIDAK menyalin angka; program mengambil angka langsung dari sel berdasarkan peta Anda.

${daftarAcuan(ref)}

PETA KOLOM — cantumkan SETIAP kolom yang berisi angka:
- "unit": angka satu unit untuk satu bulan → unit_kode + periode "YYYY-MM".
- "gabungan": jumlah semua unit untuk satu bulan (mis. "PT.EATS+Boomboo") → periode "YYYY-MM", unit_kode "".
- "total_tahun_unit": total beberapa bulan untuk satu unit (mis. TOTAL KONSOLIDASI per unit) → unit_kode, periode "YYYY" (tahun).
- "total_tahun_gabungan": total beberapa bulan semua unit → periode "YYYY", unit_kode "".
- "abaikan": kolom pengecekan dan sejenisnya.
Bulan diambil dari judul kolom; judul pada sel digabung berlaku untuk semua kolom dalam rentangnya. Tahun diambil dari judul laporan. Nama bulan bisa Indonesia/Inggris/singkatan (MAY=Mei, AUG=Agustus, SEPT=September, OKT=Oktober).

PETA BARIS — cantumkan SETIAP baris yang berisi angka (nomor baris sesuai ringkasan), dengan peran "nilai", "total", atau "abaikan".

${ATURAN_UMUM}

Isi "lembar" dengan nama lembar yang dipetakan (kalau ada beberapa lembar, pilih yang berisi laporan laba rugi; kalau lebih dari satu, pilih satu dan jelaskan di catatan).

${ATURAN_CATATAN}`;
}

function instruksiDokumen(ref) {
  return `Anda membantu bagian keuangan PT EATS memasukkan laporan laba rugi ke dashboard.
Anda menerima sebuah dokumen (PDF atau foto) laporan laba rugi. Baca SETIAP angka pada tabel laba rugi dan petakan.

${daftarAcuan(ref)}

Untuk setiap angka di tabel: label_asli (teks baris persis), letak (mis. "halaman 1, baris Revenue, kolom JAN PT.EATS"), peran, pos_kode atau ukuran, unit_kode (atau "GABUNGAN" untuk kolom jumlah semua unit), periode "YYYY-MM", nilai.
Salin angka PERSIS seperti tertulis; jangan menghitung atau membulatkan. Pemisah ribuan titik/koma dibuang (13.500.000 → 13500000; 13,500.00 → 13500). Angka dalam kurung atau bertanda minus = negatif. Sel kosong atau "-" jangan dicantumkan.
Kalau satu kolom adalah total beberapa bulan, cantumkan sebagai peran "total" dengan periode "YYYY" (tahun) — hanya untuk baris total.

${ATURAN_UMUM}

${ATURAN_CATATAN}`;
}

// ── Pemanggil model ────────────────────────────────────────────────────────
async function tanyaClaude({ sistem, konten, skema }) {
  if (!env.anthropicKey) throw new Error("kunci Claude belum diisi");
  const klien = new Anthropic({ apiKey: env.anthropicKey, timeout: BATAS_CLAUDE_MS, maxRetries: 0 });
  const mulai = Date.now();
  const jawab = await klien.beta.messages.parse({
    model: MODEL_CLAUDE,
    max_tokens: 32000,
    // Kalau Claude menolak karena aturan keamanannya, API mencoba model lain sendiri.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: jsonSchemaOutputFormat(skema) },
    system: sistem,
    messages: [{ role: "user", content: konten }],
  });
  if (jawab.stop_reason === "refusal") throw new Error("Claude menolak membaca berkas ini");
  if (jawab.stop_reason === "max_tokens") throw new Error("jawaban Claude terpotong karena terlalu panjang");
  if (!jawab.parsed_output) throw new Error(`jawaban Claude tidak terbaca (${jawab.stop_reason})`);
  return {
    hasil: jawab.parsed_output,
    pemakaian: {
      model: jawab.model ?? MODEL_CLAUDE,
      token_masuk: jawab.usage?.input_tokens ?? null,
      token_keluar: jawab.usage?.output_tokens ?? null,
      detik: Math.round((Date.now() - mulai) / 100) / 10,
    },
  };
}

async function tanyaGemini(model, { sistem, bagianGemini, skema }) {
  if (!env.geminiKey) throw new Error("kunci Gemini belum diisi");
  const mulai = Date.now();
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    signal: AbortSignal.timeout(BATAS_GEMINI_MS),
    headers: { "x-goog-api-key": env.geminiKey, "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistem }] },
      contents: [{ role: "user", parts: bagianGemini }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: skema },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${j.error?.status ?? ""} ${j.error?.message ?? ""}`.trim());
  const kandidat = j.candidates?.[0];
  const isi = (kandidat?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  if (!isi) throw new Error(`jawaban kosong (${kandidat?.finishReason ?? "tanpa alasan"})`);
  return {
    hasil: JSON.parse(isi),
    pemakaian: {
      model,
      token_masuk: j.usageMetadata?.promptTokenCount ?? null,
      token_keluar: j.usageMetadata?.candidatesTokenCount ?? null,
      detik: Math.round((Date.now() - mulai) / 100) / 10,
    },
  };
}

async function cobaBerurutan(bahan) {
  const percobaan = [
    ...(bahan.konten ? [{ label: "Claude", baca: () => tanyaClaude(bahan) }] : []),
    ...MODEL_GEMINI.map(({ model, label }) => ({ label: `${label} (cadangan)`, baca: () => tanyaGemini(model, bahan) })),
  ];
  const gagal = [];
  for (const p of percobaan) {
    try {
      const { hasil, pemakaian } = await p.baca();
      return { hasil, sumber: p.label, pemakaian: { ...pemakaian, percobaan_gagal: gagal } };
    } catch (e) {
      const sebab = e.name === "TimeoutError" || e instanceof Anthropic.APIConnectionTimeoutError
        ? "tidak menjawab tepat waktu"
        : e.message;
      gagal.push(`${p.label}: ${sebab}`);
    }
  }
  const err = new Error(gagal.join(" | "));
  err.semuaAiGagal = true;
  throw err;
}

/** Excel: AI memetakan ringkasan buku kerja. */
export function petakanExcel(ringkasan, ref) {
  const skema = skemaPeta(ref);
  const sistem = instruksiExcel(ref);
  const teks = `RINGKASAN BUKU KERJA:\n\n${ringkasan}\n\nBuat peta kolom dan peta baris untuk buku kerja di atas.`;
  return cobaBerurutan({
    sistem,
    skema,
    konten: [{ type: "text", text: teks }],
    bagianGemini: [{ text: teks }],
  });
}

/** PDF / foto: AI membaca angka dan memetakannya. */
export function bacaDokumen({ data, mime }, ref) {
  const skema = skemaDokumen(ref);
  const sistem = instruksiDokumen(ref);
  const base64 = data.toString("base64");
  const teks = "Baca seluruh tabel laba rugi pada dokumen di atas.";
  const bisaClaude = mime === "application/pdf" || FOTO_CLAUDE.includes(mime);
  const berkas = mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mime, data: base64 } };
  return cobaBerurutan({
    sistem,
    skema,
    konten: bisaClaude ? [berkas, { type: "text", text: teks }] : null,
    bagianGemini: [{ inlineData: { mimeType: mime, data: base64 } }, { text: teks }],
  });
}
