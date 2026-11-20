// Laporan keuangan dari jurnal: Laba/Rugi, Neraca, Neraca Percobaan, Buku Besar, Jurnal.
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, apiGet } from "@/shared/api/client";

/** jenis: "laba-rugi" | "neraca" | "neraca-percobaan" | "buku-besar" | "jurnal". */
export function useLaporan(jenis, params, nyala = true) {
  return useQuery({
    queryKey: ["laporan-keuangan", jenis, params],
    queryFn: () => apiGet(`/laporan-keuangan/${jenis}`, params),
    enabled: nyala && Boolean(jenis),
    placeholderData: keepPreviousData,
  });
}

function namaDariHeader(header, cadangan) {
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header ?? "");
  if (utf8) return decodeURIComponent(utf8[1]);
  const biasa = /filename="([^"]+)"/i.exec(header ?? "");
  return biasa ? biasa[1] : cadangan;
}

/** Mengunduh laporan sebagai berkas Excel lewat browser. */
export function useUnduhExcel() {
  return useMutation({
    mutationFn: async ({ jenis, params }) => {
      const res = await api.get(`/laporan-keuangan/${jenis}/excel`, { params, responseType: "blob" });
      const nama = namaDariHeader(res.headers["content-disposition"], `Laporan ${jenis}.xlsx`);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = nama;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return nama;
    },
    meta: { pesanMemuat: "Menyiapkan berkas Excel…", pesanBerhasil: (nama) => `${nama} diunduh.` },
  });
}
