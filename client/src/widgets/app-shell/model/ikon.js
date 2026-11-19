// Ikon modul dan menu (react-icons/fi). Ikon milik Accurate sengaja tidak ditiru.
import {
  FiActivity,
  FiBarChart2,
  FiBriefcase,
  FiFile,
  FiHash,
  FiPieChart,
  FiSettings,
  FiShield,
  FiSliders,
  FiUploadCloud,
  FiUsers,
} from "react-icons/fi";

export const IKON_MODUL = { pengaturan: FiSettings, perusahaan: FiBriefcase, laporan: FiPieChart };

export const IKON_MENU = {
  preferensi: FiSliders,
  akses_grup: FiShield,
  pengguna: FiUsers,
  penomoran: FiHash,
  log_aktivitas: FiActivity,
  ringkasan_laba_rugi: FiBarChart2,
  unggah_laporan: FiUploadCloud,
};

export const ikonModul = (kode) => IKON_MODUL[kode] ?? FiFile;
export const ikonMenu = (kode) => IKON_MENU[kode] ?? FiFile;

/** Kelas warna kotak menu per jenis (ditulis utuh supaya terbaca Tailwind). */
export const WARNA_JENIS = {
  data_induk:
    "border-[hsl(var(--jenis-data-induk-garis))] bg-[hsl(var(--jenis-data-induk))] text-[hsl(var(--jenis-data-induk-isi))]",
  transaksi:
    "border-[hsl(var(--jenis-transaksi-garis))] bg-[hsl(var(--jenis-transaksi))] text-[hsl(var(--jenis-transaksi-isi))]",
  pengaturan:
    "border-[hsl(var(--jenis-pengaturan-garis))] bg-[hsl(var(--jenis-pengaturan))] text-[hsl(var(--jenis-pengaturan-isi))]",
  laporan: "border-[hsl(var(--jenis-laporan-garis))] bg-[hsl(var(--jenis-laporan))] text-[hsl(var(--jenis-laporan-isi))]",
};
