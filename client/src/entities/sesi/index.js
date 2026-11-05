// Sesi login. Server menyimpan sesi di cookie httpOnly `eats_sesi`, jadi
// frontend tidak pernah memegang token — cukup tanya "saya siapa".
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/shared/api/client";

export const KUNCI_SESI = ["sesi"];

async function ambilSesi() {
  try {
    const data = await apiGet("/auth/saya");
    return data?.pengguna ?? null;
  } catch (e) {
    if (e.status === 401) return null;
    throw e;
  }
}

/** data: pengguna | null (belum masuk). undefined = masih memeriksa. */
export function useSesi() {
  return useQuery({
    queryKey: KUNCI_SESI,
    queryFn: ambilSesi,
    staleTime: 5 * 60_000,
    retry: 1,
    meta: { diamkanGalat: true },
  });
}

export function useMasuk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, kata_sandi }) => apiPost("/auth/masuk", { email, kata_sandi }),
    meta: {
      pesanMemuat: "Memeriksa akun…",
      pesanBerhasil: (data) => `Selamat datang, ${data?.pengguna?.nama ?? ""}`.trim(),
    },
    onSuccess: (data) => qc.setQueryData(KUNCI_SESI, data?.pengguna ?? null),
  });
}

export function useKeluar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost("/auth/keluar"),
    meta: { pesanMemuat: "Keluar…", pesanBerhasil: "Anda sudah keluar." },
    // Sukses atau gagal, data pengguna sebelumnya tidak boleh tersisa di layar.
    onSettled: () => {
      qc.clear();
      qc.setQueryData(KUNCI_SESI, null);
    },
  });
}

export const NAMA_PERAN = { admin: "Admin", staf: "Staf" };
