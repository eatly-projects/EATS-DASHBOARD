// Sidebar desktop terbuka penuh atau ditutup jadi bilah ikon. Pilihan ini milik
// pengguna (bukan data server), disimpan di localStorage supaya tetap sama saat
// halaman dibuka lagi. Di HP sidebar selalu berupa laci, jadi ini tidak berlaku.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LEBAR_SIDEBAR = { terbuka: "16rem", tertutup: "76px" };

export const useSidebar = create(
  persist(
    (set) => ({
      ciut: false,
      alihkan: () => set((s) => ({ ciut: !s.ciut })),
    }),
    { name: "eats.sidebar", version: 1 },
  ),
);
