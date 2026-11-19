// Ikon, warna, dan keterangan menu untuk sidebar dan kepala halaman (react-icons/fi).
// Ikon milik Accurate sengaja tidak ditiru; yang diambil hanya pola warnanya.
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

/** Ikon modul: dipakai judul kelompok di matriks Akses Grup. */
export const IKON_MODUL = { pengaturan: FiSettings, perusahaan: FiBriefcase, laporan: FiPieChart };

export const ikonModul = (kode) => IKON_MODUL[kode] ?? FiFile;

export const IKON_MENU = {
  preferensi: FiSliders,
  akses_grup: FiShield,
  pengguna: FiUsers,
  penomoran: FiHash,
  log_aktivitas: FiActivity,
  ringkasan_laba_rugi: FiBarChart2,
  unggah_laporan: FiUploadCloud,
};

export const ikonMenu = (kode) => IKON_MENU[kode] ?? FiFile;

/** Satu kalimat di bawah judul halaman: menjelaskan isi menu dengan bahasa awam. */
export const KETERANGAN_MENU = {
  ringkasan_laba_rugi: "Pendapatan, biaya, dan laba PT EATS per bulan",
  unggah_laporan: "Kirim berkas laporan, AI membacanya, lalu Anda cek dan setujui",
  log_aktivitas: "Siapa mengubah apa dan kapan, beserta isi sebelum dan sesudahnya",
  preferensi: "Data perusahaan, awal periode akuntansi, dan kunci transaksi",
  akses_grup: "Menu apa saja yang boleh dibuka dan diubah setiap kelompok Operator",
  pengguna: "Akun yang boleh masuk, levelnya, dan akses grupnya",
  penomoran: "Susunan nomor otomatis untuk setiap jenis transaksi",
};

/**
 * Kotak ikon kecil berwarna menurut jenis menu, mengikuti pola Accurate:
 * biru data induk, hijau transaksi, oranye pengaturan, ungu laporan.
 * Kelas ditulis utuh supaya terbaca Tailwind.
 */
export const KOTAK_JENIS = {
  data_induk: "bg-[hsl(var(--jenis-data-induk))] text-[hsl(var(--jenis-data-induk-isi))]",
  transaksi: "bg-[hsl(var(--jenis-transaksi))] text-[hsl(var(--jenis-transaksi-isi))]",
  pengaturan: "bg-[hsl(var(--jenis-pengaturan))] text-[hsl(var(--jenis-pengaturan-isi))]",
  laporan: "bg-[hsl(var(--jenis-laporan))] text-[hsl(var(--jenis-laporan-isi))]",
};

// Modul ini selalu paling bawah, berurutan. Modul lain (transaksi, data induk di
// tahap berikutnya) tampil di atasnya, mengikuti urutan dari server.
const MODUL_BAWAH = ["laporan", "perusahaan", "pengaturan"];

/** Modul diurutkan untuk sidebar: pekerjaan harian di atas, Pengaturan paling bawah. */
export function urutkanModul(modul) {
  const peringkat = (m) => MODUL_BAWAH.indexOf(m.kode);
  return [...modul].sort((a, b) => peringkat(a) - peringkat(b));
}
