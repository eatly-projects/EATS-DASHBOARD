// Ikon, warna, dan keterangan menu untuk sidebar dan kepala halaman (react-icons/fi).
// Ikon milik Accurate sengaja tidak ditiru; yang diambil hanya pola warnanya.
import {
  FiActivity,
  FiBarChart2,
  FiBookOpen,
  FiBriefcase,
  FiCheckSquare,
  FiClock,
  FiEdit3,
  FiFile,
  FiFileText,
  FiHash,
  FiLayers,
  FiList,
  FiPieChart,
  FiSettings,
  FiShield,
  FiSliders,
  FiThumbsUp,
  FiUploadCloud,
  FiUsers,
} from "react-icons/fi";

/** Ikon modul: dipakai judul kelompok di matriks Akses Grup. */
export const IKON_MODUL = { pengaturan: FiSettings, perusahaan: FiBriefcase, buku_besar: FiBookOpen, laporan: FiPieChart };

export const ikonModul = (kode) => IKON_MODUL[kode] ?? FiFile;

export const IKON_MENU = {
  preferensi: FiSliders,
  akses_grup: FiShield,
  pengguna: FiUsers,
  penomoran: FiHash,
  penyetuju_transaksi: FiCheckSquare,
  departemen: FiLayers,
  persetujuan: FiThumbsUp,
  log_aktivitas: FiActivity,
  akun_perkiraan: FiList,
  jurnal_umum: FiEdit3,
  pencatatan_beban: FiFileText,
  histori_akun: FiClock,
  ringkasan_laba_rugi: FiBarChart2,
  laporan_keuangan: FiPieChart,
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
  penyetuju_transaksi: "Transaksi mana yang harus disetujui dulu sebelum masuk pembukuan, dan siapa penyetujunya",
  departemen: "Lini bisnis untuk memisahkan laba rugi: Maklon, Retail, HORECA, dan Modern Trade",
  persetujuan: "Transaksi yang menunggu disetujui atau ditolak",
  akun_perkiraan: "Daftar akun pembukuan beserta saldonya; saldo awal diisi di sini",
  jurnal_umum: "Catat transaksi apa pun dengan debit dan kredit yang seimbang",
  pencatatan_beban: "Catat beban yang belum dibayar sebagai utang beban; dibayar nanti lewat Kas & Bank",
  histori_akun: "Semua transaksi satu akun dalam rentang tanggal, beserta saldo berjalannya",
  laporan_keuangan: "Neraca, Laba Rugi, Neraca Percobaan, Buku Besar, dan Jurnal; bisa diunduh Excel atau dicetak",
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
