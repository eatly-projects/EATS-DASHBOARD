// Log Aktivitas: siapa mengubah apa, kapan. Hanya bisa dibaca.
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiGet } from "@/shared/api/client";

export const NAMA_TINDAKAN = { buat: "Buat", ubah: "Ubah", hapus: "Hapus" };

/** filter: { menu, pengguna_id, tindakan, dari, sampai, cari } — nilai kosong tidak dikirim. */
export function useDaftarLog(filter) {
  const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v));
  return useInfiniteQuery({
    queryKey: ["log-aktivitas", params],
    queryFn: ({ pageParam }) => apiGet("/log-aktivitas", { ...params, halaman: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (akhir) => (akhir.halaman * akhir.ukuran < akhir.jumlah ? akhir.halaman + 1 : undefined),
  });
}

export function usePilihanLog() {
  return useQuery({ queryKey: ["log-aktivitas", "pilihan"], queryFn: () => apiGet("/log-aktivitas/pilihan") });
}

export function useDetailLog(id) {
  return useQuery({ queryKey: ["log-aktivitas", "detail", id], queryFn: () => apiGet(`/log-aktivitas/${id}`), enabled: Boolean(id), staleTime: Infinity });
}
