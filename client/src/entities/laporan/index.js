import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/shared/api/client";

export { hitungUkuran, ukuranRentang, gabungPos, jumlah, NAMA_UKURAN, UKURAN_BIAYA } from "./lib/hitung";

/** GET /api/laporan?tahun= — tahun kosong = server memilih tahun terbaru yang ada datanya. */
export function useLaporan(tahun) {
  return useQuery({
    queryKey: ["laporan", tahun ?? "terbaru"],
    queryFn: () => apiGet("/laporan", tahun ? { tahun } : undefined),
    placeholderData: (sebelumnya) => sebelumnya,
  });
}
