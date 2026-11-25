// Penjualan › Umur Piutang: susunan baca-saja dari data piutang §89 aplikasi Operasional.
// Rancangan: docs/superpowers/specs/2026-11-24-kas-bank-dan-sambungan-operasional-design.md §5.2.
// Kontrak: C:\projects\boomboo-operations\docs\INTEGRASI-EAATS.md bagian 3–5.
//
// Disusun ulang dari `baris` (bukan dari per_customer/total Operasional) supaya saringan lini bisnis
// tetap konsisten: setiap total adalah jumlah dokumennya sendiri, dihitung dalam sen (BigInt).
// Kelompok umur diambil apa adanya dari Operasional; CO selalu `tanpa_jatuh_tempo` (§97).
import { AppError } from "../../shared/http.js";
import { dariSen, keSen } from "../../shared/uang.js";

export const KELOMPOK_UMUR = ["belum_jatuh_tempo", "telat_1_30", "telat_31_60", "telat_lebih_60", "tanpa_jatuh_tempo"];

/** Nilai saringan lini bisnis: segmen Operasional, ditambah `tanpa` untuk segmen kosong. */
export const SEGMEN = ["maklon", "retail", "horeca", "modern_trade", "tanpa"];

const tidakDikenali = () =>
  new AppError(502, "OPERASIONAL_TIDAK_DIKENALI", "Isi data piutang dari Operasional tidak bisa dibaca.");

function sen(v) {
  if (typeof v !== "number" && typeof v !== "string") throw tidakDikenali();
  try {
    return keSen(String(v));
  } catch {
    throw tidakDikenali();
  }
}

const umurKosong = () => Object.fromEntries(KELOMPOK_UMUR.map((k) => [k, 0n]));
const teksUmur = (u) => Object.fromEntries(KELOMPOK_UMUR.map((k) => [k, dariSen(u[k])]));
const tautanAman = (url) => (typeof url === "string" && url.startsWith("https://") ? url : null);

const teks = (v) => typeof v === "string" && v.length > 0;

function bacaDokumen(b) {
  if (!b || typeof b !== "object" || !teks(b.tanggal_dokumen) || !teks(b.nomor_dokumen) || !teks(b.jenis_dokumen)) {
    throw tidakDikenali();
  }
  const uang = {
    total_tagihan: sen(b.total_tagihan_rp),
    total_retur: sen(b.total_retur_rp ?? 0),
    dibayar: sen(b.dibayar_rp ?? 0),
    dikembalikan: sen(b.dikembalikan_rp ?? 0),
    sisa: sen(b.sisa_rp),
    harus_dikembalikan: sen(b.harus_dikembalikan_rp ?? 0),
  };
  const umur = b.umur_piutang ?? null;
  if (umur !== null && !KELOMPOK_UMUR.includes(umur)) throw tidakDikenali();
  if (umur === null && uang.sisa > 0n) throw tidakDikenali();
  return { uang, umur };
}

const cocokSegmen = (b, segmen) => !segmen || (segmen === "tanpa" ? b.segmen == null : b.segmen === segmen);

/**
 * @param {object} data objek `data` §89 apa adanya
 * @param {{ segmen?: string|null }} opsi saringan lini bisnis (lihat SEGMEN)
 */
export function susunUmurPiutang(data, { segmen = null } = {}) {
  const peta = new Map();
  for (const b of data.baris) {
    const { uang, umur } = bacaDokumen(b);
    if (!cocokSegmen(b, segmen)) continue;
    if (uang.sisa <= 0n && uang.harus_dikembalikan <= 0n) continue;

    const c = b.customer ?? {};
    const nama = String(c.nama ?? "").trim() || "Tanpa nama";
    const kunci = c.id ?? `nama:${nama.toLowerCase()}`;
    if (!peta.has(kunci)) {
      peta.set(kunci, { kunci, kode: c.kode ?? null, nama, sisa: 0n, harus_dikembalikan: 0n, sisa_per_umur: umurKosong(), dokumen: [] });
    }
    const p = peta.get(kunci);
    p.sisa += uang.sisa;
    p.harus_dikembalikan += uang.harus_dikembalikan;
    if (umur) p.sisa_per_umur[umur] += uang.sisa;
    p.dokumen.push({
      jenis_dokumen: b.jenis_dokumen,
      id_dokumen: b.id_dokumen,
      nomor_dokumen: b.nomor_dokumen,
      nomor_po_klien: b.nomor_po_klien ?? null,
      segmen: b.segmen ?? null,
      tanggal_dokumen: b.tanggal_dokumen,
      jatuh_tempo: b.jatuh_tempo ?? null,
      ...Object.fromEntries(Object.entries(uang).map(([k, v]) => [k, dariSen(v)])),
      umur_piutang: umur,
      status: b.status,
      url_operasional: tautanAman(b.url_operasional),
    });
  }

  const pelanggan = [...peta.values()].sort(
    (a, b) => (a.sisa === b.sisa ? 0 : a.sisa > b.sisa ? -1 : 1) || a.nama.localeCompare(b.nama, "id"),
  );
  const total = { jumlah_pelanggan: pelanggan.length, jumlah_dokumen: 0, sisa: 0n, harus_dikembalikan: 0n, sisa_per_umur: umurKosong() };
  for (const p of pelanggan) {
    p.dokumen.sort((a, b) => a.tanggal_dokumen.localeCompare(b.tanggal_dokumen) || a.nomor_dokumen.localeCompare(b.nomor_dokumen));
    total.jumlah_dokumen += p.dokumen.length;
    total.sisa += p.sisa;
    total.harus_dikembalikan += p.harus_dikembalikan;
    for (const k of KELOMPOK_UMUR) total.sisa_per_umur[k] += p.sisa_per_umur[k];
  }

  return {
    diperbarui: data.generated_at,
    hari_ini: data.hari_ini_jakarta ?? null,
    total: { ...total, sisa: dariSen(total.sisa), harus_dikembalikan: dariSen(total.harus_dikembalikan), sisa_per_umur: teksUmur(total.sisa_per_umur) },
    pelanggan: pelanggan.map((p) => ({
      ...p,
      jumlah_dokumen: p.dokumen.length,
      sisa: dariSen(p.sisa),
      harus_dikembalikan: dariSen(p.harus_dikembalikan),
      sisa_per_umur: teksUmur(p.sisa_per_umur),
    })),
  };
}
