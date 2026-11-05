// Akun pengguna aplikasi (khusus admin).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/shared/api/client";

export function useDaftarPengguna(aktif = true) {
  return useQuery({ queryKey: ["pengguna"], queryFn: () => apiGet("/pengguna"), enabled: aktif });
}

export function useTambahPengguna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPost("/pengguna", body),
    meta: { pesanMemuat: "Membuat akun…", pesanBerhasil: (p) => `Akun ${p?.nama ?? ""} dibuat.`.replace("  ", " ") },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pengguna"] }),
  });
}

export function useUbahPengguna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => apiPatch(`/pengguna/${id}`, body),
    meta: { pesanMemuat: "Menyimpan perubahan…", pesanBerhasil: "Perubahan akun tersimpan." },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pengguna"] }),
  });
}

/** Kata sandi acak 14 karakter, tanpa huruf yang mirip (l/1, O/0). */
export function buatKataSandiAcak() {
  const huruf = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const acak = new Uint32Array(14);
  crypto.getRandomValues(acak);
  return Array.from(acak, (n) => huruf[n % huruf.length]).join("");
}
