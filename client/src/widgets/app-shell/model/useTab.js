// Tab menu yang sedang terbuka, seperti di Accurate. Disimpan di localStorage
// (kenyamanan per browser), jadi tab yang sama terbuka lagi setelah halaman dimuat ulang.
// Tab Dashboard selalu ada di urutan pertama dan tidak bisa ditutup.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const KODE_DASHBOARD = "ringkasan_laba_rugi";
const DASHBOARD = { kode: KODE_DASHBOARD, path: "/" };

export const useTab = create(
  persist(
    (set, get) => ({
      tab: [DASHBOARD],

      /** Menambah tab, atau memperbarui alamat tab yang sudah ada. */
      buka: (kode, path) =>
        set((s) => {
          const ada = s.tab.find((t) => t.kode === kode);
          if (ada) return ada.path === path ? s : { tab: s.tab.map((t) => (t.kode === kode ? { ...t, path } : t)) };
          return { tab: [...s.tab, { kode, path }] };
        }),

      /** Menutup tab dan mengembalikan alamat tab tetangga (kanan, kalau tidak ada: kiri). */
      tutup: (kode) => {
        if (kode === KODE_DASHBOARD) return null;
        const { tab } = get();
        const i = tab.findIndex((t) => t.kode === kode);
        if (i < 0) return null;
        const sisa = tab.filter((t) => t.kode !== kode);
        set({ tab: sisa });
        return (sisa[i] ?? sisa[i - 1] ?? DASHBOARD).path;
      },

      tutupSemua: () => set({ tab: [DASHBOARD] }),

      /** Membuang tab menu yang tidak lagi boleh dibuka (hak dicabut, atau ganti akun). */
      saring: (kodeBoleh) =>
        set((s) => {
          const tab = s.tab.filter((t) => t.kode === KODE_DASHBOARD || kodeBoleh.has(t.kode));
          return tab.length === s.tab.length ? s : { tab };
        }),
    }),
    {
      name: "eats.tab",
      version: 1,
      // Tab Dashboard selalu ada dan selalu pertama, apa pun isi penyimpanan.
      merge: (simpanan, awal) => {
        const lain = (simpanan?.tab ?? []).filter((t) => t?.kode && t?.path && t.kode !== KODE_DASHBOARD);
        const dashboard = (simpanan?.tab ?? []).find((t) => t?.kode === KODE_DASHBOARD) ?? DASHBOARD;
        return { ...awal, tab: [dashboard, ...lain] };
      },
    },
  ),
);
