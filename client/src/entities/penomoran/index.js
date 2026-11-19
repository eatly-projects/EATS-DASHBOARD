// Penomoran otomatis per tipe transaksi (khusus Administrator).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/shared/api/client";

export const NAMA_RESET = { tidak: "Tidak pernah", hari: "Setiap hari", bulan: "Setiap bulan", tahun: "Setiap tahun" };

export const BAGIAN = [
  { jenis: "teks", nama: "Teks" },
  { jenis: "tahun", nama: "Tahun", contoh: "2027" },
  { jenis: "tahun_singkat", nama: "Tahun singkat", contoh: "27" },
  { jenis: "bulan", nama: "Bulan", contoh: "01" },
  { jenis: "bulan_romawi", nama: "Bulan Romawi", contoh: "I" },
  { jenis: "hari", nama: "Hari", contoh: "15" },
  { jenis: "counter", nama: "Nomor urut", contoh: "00001" },
];

export function useDaftarPenomoran() {
  return useQuery({ queryKey: ["penomoran"], queryFn: () => apiGet("/penomoran") });
}

export function useTipeTransaksi() {
  return useQuery({ queryKey: ["penomoran", "tipe"], queryFn: () => apiGet("/penomoran/tipe"), staleTime: Infinity });
}

/** Contoh nomor pertama untuk susunan yang sedang diisi. body sudah ditunda oleh pemanggil. */
export function usePratinjauPenomoran(body, aktif = true) {
  return useQuery({
    queryKey: ["penomoran", "pratinjau", body],
    queryFn: () => apiPost("/penomoran/pratinjau", body),
    enabled: aktif,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });
}

export function useSimpanPenomoran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => (id ? apiPut(`/penomoran/${id}`, body) : apiPost("/penomoran", body)),
    meta: { pesanMemuat: "Menyimpan penomoran…", pesanBerhasil: (p) => `Penomoran ${p?.nama ?? ""} tersimpan.` },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["penomoran"] }),
  });
}

export function useHapusPenomoran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiDelete(`/penomoran/${id}`),
    meta: { pesanMemuat: "Menghapus penomoran…", pesanBerhasil: "Penomoran dihapus." },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["penomoran"] }),
  });
}
