// Unggahan berkas: unggah -> dibaca AI -> dicek & disetujui user.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/shared/api/client";

export const BATAS_UKURAN = 4 * 1024 * 1024; // 4 MB (batas Vercel ±4,5 MB per permintaan)
export const EKSTENSI_DITERIMA = [".xlsx", ".pdf", ".png", ".jpg", ".jpeg", ".webp"];
export const ACCEPT_INPUT = EKSTENSI_DITERIMA.join(",");

export const STATUS = {
  diunggah: { label: "Belum dibaca", nada: "netral" },
  menunggu_cek: { label: "Menunggu dicek", nada: "waspada" },
  gagal_dibaca: { label: "Gagal dibaca", nada: "buruk" },
  disetujui: { label: "Disetujui", nada: "baik" },
  dibatalkan: { label: "Dibatalkan", nada: "netral" },
};

export const NAMA_JENIS = { excel: "Excel", pdf: "PDF", gambar: "Foto" };

/** ID model AI -> kata biasa untuk layar (bukan ID mentah). */
export function namaPembaca(sumber) {
  const s = String(sumber ?? "").toLowerCase();
  if (!s) return null;
  if (s.includes("claude")) return "Claude";
  if (s.includes("lite")) return "Gemini Flash Lite (cadangan kedua)";
  if (s.includes("gemini")) return "Gemini (cadangan)";
  if (s.includes("manual") || s.includes("program")) return "program pembaca";
  return "AI";
}

export function periksaBerkas(berkas) {
  if (!berkas) return "Pilih berkas terlebih dahulu.";
  const nama = berkas.name.toLowerCase();
  if (!EKSTENSI_DITERIMA.some((e) => nama.endsWith(e))) {
    return "Jenis berkas belum didukung. Gunakan Excel (.xlsx), PDF, atau foto (.png, .jpg, .jpeg, .webp).";
  }
  if (berkas.size > BATAS_UKURAN) {
    const mb = (berkas.size / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 });
    return `Berkas terlalu besar (${mb} MB). Maksimal 4 MB — kecilkan fotonya atau simpan ulang Excel-nya.`;
  }
  if (berkas.size === 0) return "Berkas kosong.";
  return null;
}

export function useDaftarUnggahan() {
  return useQuery({ queryKey: ["unggahan"], queryFn: () => apiGet("/unggahan") });
}

export function useUnggahan(id) {
  return useQuery({
    queryKey: ["unggahan", id],
    queryFn: () => apiGet(`/unggahan/${id}`),
    enabled: Boolean(id),
  });
}

export function useUnggahBerkas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (berkas) => {
      const form = new FormData();
      form.append("berkas", berkas);
      return apiPost("/unggahan", form);
    },
    meta: { pesanMemuat: "Mengunggah berkas…", pesanBerhasil: "Berkas terunggah." },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unggahan"] }),
  });
}

export function useBacaUnggahan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiPost(`/unggahan/${id}/baca`),
    meta: {
      pesanMemuat: "AI sedang membaca berkas…",
      pesanBerhasil: (u) =>
        u?.status === "menunggu_cek" ? "Berkas selesai dibaca. Silakan dicek." : null,
    },
    onSuccess: (u) => {
      if (u?.id) qc.invalidateQueries({ queryKey: ["unggahan", u.id] });
      qc.invalidateQueries({ queryKey: ["unggahan"], exact: true });
    },
  });
}

export function useSetujuiUnggahan(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nilai) => apiPost(`/unggahan/${id}/setujui`, { nilai }),
    meta: {
      pesanMemuat: "Menyimpan ke database…",
      pesanBerhasil: (data) => kalimatRingkasan(data?.ringkasan),
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unggahan"] });
      qc.invalidateQueries({ queryKey: ["laporan"] });
    },
  });
}

export function useBatalkanUnggahan(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost(`/unggahan/${id}/batalkan`),
    meta: { pesanMemuat: "Membatalkan…", pesanBerhasil: "Unggahan dibatalkan. Tidak ada data yang disimpan." },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unggahan"] }),
  });
}

/** { ditulis, diganti, dihapus } -> "120 angka disimpan, 0 diganti" */
export function kalimatRingkasan(r) {
  if (!r) return "Data tersimpan.";
  const f = (n) => Number(n ?? 0).toLocaleString("id-ID");
  const bagian = [`${f(r.ditulis)} angka disimpan`];
  bagian.push(`${f(r.diganti)} angka lama diganti`);
  if (Number(r.dihapus) > 0) bagian.push(`${f(r.dihapus)} angka lama dihapus`);
  return bagian.join(", ") + ".";
}
