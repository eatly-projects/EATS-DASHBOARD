// Jurnal Umum dan Pencatatan Beban: daftar, rincian, simpan, hapus.
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/shared/api/client";

export const JALUR = { jurnal_umum: "/jurnal-umum", pencatatan_beban: "/pencatatan-beban" };
export const NAMA_TIPE = { jurnal_umum: "Jurnal Umum", pencatatan_beban: "Pencatatan Beban", saldo_awal: "Saldo Awal" };
export const NAMA_STATUS = { disetujui: "Disetujui", diajukan: "Menunggu persetujuan", ditolak: "Ditolak" };

/** filter: { dari, sampai, status, cari } — nilai kosong tidak dikirim. */
export function useDaftarJurnal(tipe, filter) {
  const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v));
  return useInfiniteQuery({
    queryKey: ["jurnal", tipe, "daftar", params],
    queryFn: ({ pageParam }) => apiGet(JALUR[tipe], { ...params, halaman: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (akhir) => (akhir.halaman * akhir.ukuran < akhir.jumlah ? akhir.halaman + 1 : undefined),
  });
}

export function useJurnal(tipe, id) {
  return useQuery({ queryKey: ["jurnal", tipe, id], queryFn: () => apiGet(`${JALUR[tipe]}/${id}`), enabled: Boolean(id) });
}

function useSegarkan() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["jurnal"] });
    qc.invalidateQueries({ queryKey: ["akun"] });
    qc.invalidateQueries({ queryKey: ["laporan-keuangan"] });
    qc.invalidateQueries({ queryKey: ["persetujuan"] });
  };
}

const pesanSimpan = (j) =>
  j?.status === "diajukan" ? `${NAMA_TIPE[j.tipe]} tersimpan dan menunggu persetujuan.` : `${NAMA_TIPE[j?.tipe] ?? "Transaksi"} ${j?.nomor ?? ""} tersimpan.`;

export function useSimpanJurnal(tipe) {
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: ({ id, ...body }) => (id ? apiPut(`${JALUR[tipe]}/${id}`, body) : apiPost(JALUR[tipe], body)),
    meta: { pesanMemuat: `Menyimpan ${NAMA_TIPE[tipe]}…`, pesanBerhasil: pesanSimpan },
    onSuccess: segarkan,
  });
}

export function useHapusJurnal(tipe) {
  const qc = useQueryClient();
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: (id) => apiDelete(`${JALUR[tipe]}/${id}`),
    meta: { pesanMemuat: `Menghapus ${NAMA_TIPE[tipe]}…`, pesanBerhasil: `${NAMA_TIPE[tipe]} dihapus.` },
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: ["jurnal", tipe, id] });
      segarkan();
    },
  });
}
