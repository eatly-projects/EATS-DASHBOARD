// Akses Grup: hak per menu untuk Operator (khusus Administrator).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/shared/api/client";
import { KUNCI_NAVIGASI } from "@/entities/navigasi";

export function useDaftarAksesGrup() {
  return useQuery({ queryKey: ["akses-grup"], queryFn: () => apiGet("/akses-grup") });
}

export function useAksesGrup(id) {
  return useQuery({ queryKey: ["akses-grup", id], queryFn: () => apiGet(`/akses-grup/${id}`), enabled: Boolean(id) });
}

/** Modul dan menu yang haknya bisa diatur (tanpa Pengaturan, yang khusus Administrator). */
export function useMenuMatriks() {
  return useQuery({ queryKey: ["akses-grup", "menu"], queryFn: () => apiGet("/akses-grup/menu"), staleTime: Infinity });
}

function useSegarkan() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["akses-grup"] });
    qc.invalidateQueries({ queryKey: ["pengguna"] });
    qc.invalidateQueries({ queryKey: KUNCI_NAVIGASI });
  };
}

export function useSimpanAksesGrup() {
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: ({ id, ...body }) => (id ? apiPut(`/akses-grup/${id}`, body) : apiPost("/akses-grup", body)),
    meta: { pesanMemuat: "Menyimpan akses grup…", pesanBerhasil: (g) => `Akses grup ${g?.nama ?? ""} tersimpan.` },
    onSuccess: segarkan,
  });
}

export function useHapusAksesGrup() {
  const qc = useQueryClient();
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: (id) => apiDelete(`/akses-grup/${id}`),
    meta: { pesanMemuat: "Menghapus akses grup…", pesanBerhasil: "Akses grup dihapus." },
    // Data grup yang baru dihapus dibuang dulu, supaya tidak diambil ulang lalu
    // memunculkan galat "tidak ditemukan" setelah toast berhasil.
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ["akses-grup", id] });
      segarkan();
    },
  });
}
