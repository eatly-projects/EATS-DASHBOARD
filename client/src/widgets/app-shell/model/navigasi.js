import { FiBarChart2, FiUploadCloud, FiUsers } from "react-icons/fi";

export const MENU = [
  { to: "/", label: "Ringkasan laba rugi", ikon: FiBarChart2, akhir: true },
  { to: "/unggah", label: "Unggah laporan", ikon: FiUploadCloud, lencanaMenunggu: true },
  { to: "/pengguna", label: "Pengguna", ikon: FiUsers, khususAdmin: true },
];

/** Judul halaman untuk header & tab browser. */
export function judulHalaman(pathname) {
  if (pathname === "/") return { judul: "Ringkasan laba rugi", sub: "Pendapatan, biaya, dan laba PT EATS per bulan" };
  if (pathname.startsWith("/unggah") && !pathname.startsWith("/unggahan")) {
    return { judul: "Unggah laporan", sub: "Kirim berkas laporan, AI membacanya, Anda yang mengecek" };
  }
  if (pathname.startsWith("/unggahan/")) return { judul: "Cek dan setujui", sub: "Periksa hasil bacaan AI sebelum masuk ke database" };
  if (pathname.startsWith("/pengguna")) return { judul: "Pengguna", sub: "Akun yang boleh masuk ke EATS Dashboard" };
  return { judul: "Halaman tidak ditemukan", sub: "" };
}
