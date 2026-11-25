// Penjualan › Umur Piutang: piutang klien dibaca dari aplikasi Operasional lewat backend EATS.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiGet } from "@/shared/api/client";

/** Kelompok umur sesuai kontrak Operasional, berurutan. CO selalu "Belum ada jatuh tempo". */
export const KELOMPOK_UMUR = [
  { kode: "belum_jatuh_tempo", nama: "Belum jatuh tempo" },
  { kode: "telat_1_30", nama: "Telat 1–30 hari" },
  { kode: "telat_31_60", nama: "Telat 31–60 hari" },
  { kode: "telat_lebih_60", nama: "Telat lebih dari 60 hari" },
  { kode: "tanpa_jatuh_tempo", nama: "Belum ada jatuh tempo" },
];

export const NAMA_KELOMPOK = Object.fromEntries(KELOMPOK_UMUR.map((k) => [k.kode, k.nama]));

/** Saringan lini bisnis; `tanpa` = dokumen lama tanpa lini bisnis. */
export const LINI_BISNIS = [
  { kode: "maklon", nama: "Maklon" },
  { kode: "retail", nama: "Retail" },
  { kode: "horeca", nama: "HORECA" },
  { kode: "modern_trade", nama: "Modern Trade" },
  { kode: "tanpa", nama: "Tanpa lini bisnis" },
];

export const namaLiniBisnis = (segmen) => LINI_BISNIS.find((l) => l.kode === (segmen ?? "tanpa"))?.nama ?? segmen;

/** segmen: kode LINI_BISNIS, atau null untuk semua lini bisnis. */
export function useUmurPiutang(segmen) {
  return useQuery({
    queryKey: ["umur-piutang", segmen ?? "semua"],
    queryFn: () => apiGet("/umur-piutang", segmen ? { segmen } : undefined),
    placeholderData: keepPreviousData,
  });
}
