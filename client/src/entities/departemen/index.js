// Departemen (lini bisnis): Maklon, Retail, HORECA, Modern Trade, dan lainnya.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/shared/api/client";

/** `aktif`: hanya departemen aktif (untuk pilihan di formulir transaksi; cukup sudah masuk). */
export function useDaftarDepartemen({ aktif = false, nyala = true } = {}) {
  return useQuery({
    queryKey: ["departemen", { aktif }],
    queryFn: () => apiGet("/departemen", aktif ? { aktif: 1 } : undefined),
    enabled: nyala,
  });
}

export function useDepartemen(id) {
  return useQuery({ queryKey: ["departemen", id], queryFn: () => apiGet(`/departemen/${id}`), enabled: Boolean(id) });
}

export function useSimpanDepartemen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => (id ? apiPut(`/departemen/${id}`, body) : apiPost("/departemen", body)),
    meta: { pesanMemuat: "Menyimpan departemen…", pesanBerhasil: (d) => `Departemen ${d?.nama ?? ""} tersimpan.` },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departemen"] }),
  });
}

export function useHapusDepartemen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiDelete(`/departemen/${id}`),
    meta: { pesanMemuat: "Menghapus departemen…", pesanBerhasil: "Departemen dihapus." },
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: ["departemen", id] });
      qc.invalidateQueries({ queryKey: ["departemen"] });
    },
  });
}
