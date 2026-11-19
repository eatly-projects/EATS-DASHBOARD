// Preferensi perusahaan: nama, alamat, NPWP, awal periode akuntansi, kunci periode.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/shared/api/client";

export const KUNCI_PREFERENSI = ["preferensi"];

export function usePreferensi() {
  return useQuery({ queryKey: KUNCI_PREFERENSI, queryFn: () => apiGet("/preferensi"), staleTime: 5 * 60_000 });
}

export function useSimpanPreferensi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPut("/preferensi", body),
    meta: { pesanMemuat: "Menyimpan preferensi…", pesanBerhasil: "Preferensi tersimpan." },
    onSuccess: (data) => qc.setQueryData(KUNCI_PREFERENSI, data),
  });
}
