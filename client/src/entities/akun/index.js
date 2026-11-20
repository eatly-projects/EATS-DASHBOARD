// Akun Perkiraan: daftar akun bertingkat beserta saldonya.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/shared/api/client";

export function useDaftarAkun({ aktif = false, nyala = true } = {}) {
  return useQuery({ queryKey: ["akun", "daftar", { aktif }], queryFn: () => apiGet("/akun", aktif ? { aktif: 1 } : undefined), enabled: nyala });
}

export function useAkun(id) {
  return useQuery({ queryKey: ["akun", id], queryFn: () => apiGet(`/akun/${id}`), enabled: Boolean(id) });
}

export function useTipeAkun() {
  return useQuery({ queryKey: ["akun", "tipe"], queryFn: () => apiGet("/akun/tipe"), staleTime: Infinity });
}

/** Saldo akun dan laporan ikut berubah setiap kali akun, saldo awal, atau transaksi disimpan. */
export function useSegarkanPembukuan() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laporan-keuangan"] });
    qc.invalidateQueries({ queryKey: ["jurnal"] });
  };
}

export function useSimpanAkun() {
  const segarkan = useSegarkanPembukuan();
  return useMutation({
    mutationFn: ({ id, ...body }) => (id ? apiPut(`/akun/${id}`, body) : apiPost("/akun", body)),
    meta: { pesanMemuat: "Menyimpan akun…", pesanBerhasil: (a) => `Akun ${a?.kode ?? ""} ${a?.nama ?? ""} tersimpan.` },
    onSuccess: segarkan,
  });
}

export function useHapusAkun() {
  const qc = useQueryClient();
  const segarkan = useSegarkanPembukuan();
  return useMutation({
    mutationFn: (id) => apiDelete(`/akun/${id}`),
    meta: { pesanMemuat: "Menghapus akun…", pesanBerhasil: "Akun dihapus." },
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: ["akun", id] });
      segarkan();
    },
  });
}
