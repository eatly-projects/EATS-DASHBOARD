// Pilihan tampilan dashboard milik pengguna (bukan data server): unit, bulan,
// tahun. Disimpan di localStorage supaya saat halaman dibuka lagi pilihannya sama.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePilihanLaporan = create(
  persist(
    (set) => ({
      unit: "GABUNGAN",
      periode: null, // "2026-10"; null = bulan terbaru yang ada datanya
      tahun: null, // null = tahun terbaru yang ada datanya
      aturUnit: (unit) => set({ unit }),
      aturPeriode: (periode) => set({ periode }),
      aturTahun: (tahun) => set({ tahun, periode: null }),
      reset: () => set({ unit: "GABUNGAN", periode: null, tahun: null }),
    }),
    { name: "eats.pilihan-laporan", version: 1 },
  ),
);
