// TanStack Query + toast global (pola Operations): setiap permintaan ke server
// diberi tahu lewat react-hot-toast.
// - Perubahan (mutation): toast "memuat…" -> berhasil / gagal dengan pesan server.
//   Atur lewat meta: { pesanMemuat, pesanBerhasil (teks atau fungsi(data)) }.
// - Pengambilan data (query): toast hanya saat GAGAL; saat memuat, layar
//   memakai skeleton. Toast memuat di setiap halaman akan terlalu berisik.
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const idToast = (mutation) => `mutasi-${mutation.mutationId}`;

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error?.status === 401 || query.meta?.diamkanGalat) return;
      toast.error(error.message, { id: `kueri-${query.queryHash}` });
    },
  }),
  mutationCache: new MutationCache({
    onMutate: (_vars, mutation) => {
      const pesan = mutation.meta?.pesanMemuat;
      if (pesan) toast.loading(pesan, { id: idToast(mutation) });
    },
    onSuccess: (data, _vars, _ctx, mutation) => {
      const p = mutation.meta?.pesanBerhasil;
      const pesan = typeof p === "function" ? p(data) : p;
      if (pesan) toast.success(pesan, { id: idToast(mutation) });
      else toast.dismiss(idToast(mutation));
    },
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.diamkanGalat) {
        toast.dismiss(idToast(mutation));
        return;
      }
      toast.error(error.message, { id: idToast(mutation), duration: 6000 });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: (jumlah, error) => ![401, 403, 404].includes(error?.status) && jumlah < 1,
    },
    mutations: { retry: false },
  },
});
