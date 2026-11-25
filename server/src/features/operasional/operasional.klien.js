// Penghubung ke API aplikasi Operasional (Boomboo Operations). Hanya membaca; data mengalir satu arah
// Operasional → EATS. Kontrak: C:\projects\boomboo-operations\docs\INTEGRASI-EAATS.md bagian 2–6.
// Rancangan: docs/superpowers/specs/2026-11-24-kas-bank-dan-sambungan-operasional-design.md §5.1.
//
// - Env dibaca setiap kali dipanggil (bukan saat modul dimuat), jadi tes bisa mengarahkannya ke tiruan.
// - Kunci hanya dikirim sebagai header X-Api-Key ke Operasional: tidak pernah ke browser, log, atau pesan.
// - Jawaban sah yang lolos semua cek disimpan di operasional_cadangan. Kalau Operasional tidak bisa
//   dihubungi (koneksi gagal, waktu habis, 5xx, atau isi rusak), cadangan itu yang dipakai (basi = true).
// - Galat kunci tidak pernah dijawab 401, karena browser EATS menganggap 401 sebagai sesi habis.
import { kueri } from "../../shared/db/pool.js";
import { AppError } from "../../shared/http.js";

const JALUR = { piutang: "/api/eaats/piutang" };

const belumDipasang = () =>
  new AppError(503, "OPERASIONAL_BELUM_DIPASANG", "Kunci sambungan ke Operasional belum dipasang. Laporkan ke Lutfi.");
const kunciSalah = () =>
  new AppError(502, "OPERASIONAL_KUNCI_SALAH", "Kunci sambungan ke Operasional salah. Laporkan ke Lutfi.");
const tidakTerhubung = () =>
  new AppError(502, "OPERASIONAL_TIDAK_TERHUBUNG", "Aplikasi Operasional tidak bisa dihubungi. Coba lagi beberapa saat lagi.");

/** Alamat dan kunci Operasional dari env. Garis miring di ujung alamat dibuang. */
export function aturanOperasional() {
  return {
    url: (process.env.OPERASIONAL_API_URL || "").trim().replace(/\/+$/, ""),
    kunci: (process.env.OPERASIONAL_API_KEY || "").trim(),
  };
}

/** Bentuk minimal kontrak bagian 3: { ok: true, data: { generated_at, baris: [], cek: [] } }. */
const bentukSah = (j) =>
  j?.ok === true && typeof j.data?.generated_at === "string" && Array.isArray(j.data.baris) && Array.isArray(j.data.cek);

/** Data terakhir dari cadangan; tanpa cadangan, lempar `galat` (bawaan: tidak terhubung). */
async function cadanganAtauGalat(jenis, galat = tidakTerhubung()) {
  const { rows } = await kueri("select isi from operasional_cadangan where kunci = $1", [jenis]);
  if (!rows.length) throw galat;
  return { data: rows[0].isi, basi: true, cekGagal: [] };
}

async function simpanCadangan(jenis, isi) {
  await kueri(
    `insert into operasional_cadangan (kunci, isi, diambil_pada) values ($1, $2, now())
     on conflict (kunci) do update set isi = excluded.isi, diambil_pada = excluded.diambil_pada`,
    [jenis, isi],
  );
}

/**
 * Mengambil satu jenis data dari Operasional.
 * `periksa(data)` (opsional) membaca seluruh isi sebelum disimpan sebagai cadangan. Kalau melempar, isi
 * itu tidak dipakai dan tidak menimpa cadangan: yang dipakai cadangan terakhir, atau galat dari periksa.
 * @returns {Promise<{ data: object, basi: boolean, cekGagal: string[] }>}
 *   data = objek `data` kontrak apa adanya; basi = diambil dari cadangan; cekGagal = nama cek yang tidak lolos.
 */
export async function ambilOperasional(jenis, { batasMs = 20000, periksa = null } = {}) {
  const jalur = JALUR[jenis];
  if (!jalur) throw new Error(`Jenis data Operasional tidak dikenal: ${jenis}`);
  const { url, kunci } = aturanOperasional();
  if (!url || !kunci) throw belumDipasang();

  let json = null;
  try {
    const res = await fetch(`${url}${jalur}`, {
      headers: { "X-Api-Key": kunci, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(batasMs),
    });
    // 503 berarti "kunci belum diatur" hanya kalau itu jawaban Operasional sendiri ({ ok: false }).
    // 503 lain (misalnya dari platform Vercel) diperlakukan sebagai tidak terhubung.
    if (res.status === 503 && (await res.json().catch(() => null))?.ok === false) throw belumDipasang();
    if (res.status === 401) throw kunciSalah();
    if (res.ok) json = await res.json().catch(() => null);
  } catch (e) {
    if (e instanceof AppError) throw e;
    json = null; // koneksi gagal atau waktu habis
  }
  if (!bentukSah(json)) return cadanganAtauGalat(jenis);

  const cekGagal = json.data.cek.filter((c) => c?.ok !== true).map((c) => String(c?.nama ?? "Cek tanpa nama"));
  if (cekGagal.length) return { data: json.data, basi: false, cekGagal };
  if (periksa) {
    try {
      periksa(json.data);
    } catch (e) {
      return cadanganAtauGalat(jenis, e instanceof AppError ? e : tidakTerhubung());
    }
  }
  await simpanCadangan(jenis, json.data);
  return { data: json.data, basi: false, cekGagal };
}
