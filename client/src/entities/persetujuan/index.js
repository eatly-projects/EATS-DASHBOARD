// Persetujuan transaksi: aturan (Pengaturan › Penyetuju Transaksi) dan antrean
// keputusan (Perusahaan › Persetujuan).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/shared/api/client";

export function useDaftarPersetujuan(status = "diajukan") {
  return useQuery({ queryKey: ["persetujuan", "daftar", status], queryFn: () => apiGet("/persetujuan", { status }) });
}

export function usePersetujuan(id) {
  return useQuery({ queryKey: ["persetujuan", id], queryFn: () => apiGet(`/persetujuan/${id}`), enabled: Boolean(id) });
}

/** Jumlah transaksi yang menunggu keputusan pengguna ini (lencana di sidebar). */
export function useJumlahPersetujuan(nyala = true) {
  return useQuery({ queryKey: ["persetujuan", "jumlah"], queryFn: () => apiGet("/persetujuan/jumlah"), enabled: nyala, refetchInterval: 60_000 });
}

function useSegarkan() {
  const qc = useQueryClient();
  return () => ["persetujuan", "jurnal", "akun", "laporan-keuangan"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useSetujui() {
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: (id) => apiPost(`/persetujuan/${id}/setujui`),
    meta: { pesanMemuat: "Menyetujui…", pesanBerhasil: (j) => `Transaksi disetujui dengan nomor ${j?.nomor ?? ""}.` },
    onSuccess: segarkan,
  });
}

export function useTolak() {
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: ({ id, alasan }) => apiPost(`/persetujuan/${id}/tolak`, { alasan }),
    meta: { pesanMemuat: "Menolak…", pesanBerhasil: "Transaksi ditolak; pembuatnya bisa memperbaiki lalu mengajukan lagi." },
    onSuccess: segarkan,
  });
}

export function useAturanPenyetuju() {
  return useQuery({ queryKey: ["penyetuju-transaksi"], queryFn: () => apiGet("/penyetuju-transaksi") });
}

export function useSimpanAturan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tipe, ...body }) => apiPut(`/penyetuju-transaksi/${tipe}`, body),
    meta: { pesanMemuat: "Menyimpan aturan persetujuan…", pesanBerhasil: (a) => `Aturan persetujuan ${a?.nama ?? ""} tersimpan.` },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penyetuju-transaksi"] });
      qc.invalidateQueries({ queryKey: ["persetujuan"] });
    },
  });
}
