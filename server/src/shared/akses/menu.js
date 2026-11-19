// Satu-satunya daftar menu aplikasi. Dipakai untuk:
//   - hak akses per menu yang diperiksa server (hak.js)
//   - isi navigasi yang dikirim ke browser (GET /api/navigasi)
//   - isi matriks di Pengaturan > Akses Grup
// Urutan modul = urutan ikon di bilah kiri. Modul yang belum dibangun belum
// dicantumkan. Tahap berikutnya menambah modul dan menu di sini.
//
// jenis menentukan warna kotak menu, mengikuti Accurate:
//   data_induk biru · transaksi hijau · pengaturan oranye · laporan ungu
export const JENIS = ["data_induk", "transaksi", "pengaturan", "laporan"];

export const SEMUA_AKSI = ["lihat", "buat", "ubah", "hapus"];

export const MODUL = [
  {
    kode: "pengaturan",
    nama: "Pengaturan",
    khususAdministrator: true,
    menu: [
      { kode: "preferensi", nama: "Preferensi", jenis: "pengaturan", path: "/pengaturan/preferensi" },
      { kode: "akses_grup", nama: "Akses Grup", jenis: "pengaturan", path: "/pengaturan/akses-grup" },
      { kode: "pengguna", nama: "Pengguna", jenis: "pengaturan", path: "/pengaturan/pengguna" },
      { kode: "penomoran", nama: "Penomoran", jenis: "pengaturan", path: "/pengaturan/penomoran" },
    ],
  },
  {
    kode: "perusahaan",
    nama: "Perusahaan",
    menu: [{ kode: "log_aktivitas", nama: "Log Aktivitas", jenis: "laporan", path: "/perusahaan/log-aktivitas", aksi: ["lihat"] }],
  },
  {
    kode: "laporan",
    nama: "Laporan",
    menu: [
      { kode: "ringkasan_laba_rugi", nama: "Ringkasan Laba Rugi", jenis: "laporan", path: "/", aksi: ["lihat"] },
      {
        kode: "unggah_laporan",
        nama: "Unggah Laporan",
        jenis: "transaksi",
        path: "/laporan/unggah",
        aksi: ["lihat", "buat", "ubah", "hapus"],
        keteranganAksi: {
          buat: "Mengunggah berkas dan meminta AI membacanya",
          ubah: "Menyetujui hasil bacaan AI",
          hapus: "Membatalkan unggahan",
        },
      },
    ],
  },
];

/** Aksi yang dimiliki sebuah menu. Menu tanpa daftar aksi memakai keempatnya. */
export const aksiMenu = (menu) => menu.aksi ?? SEMUA_AKSI;

const PETA = new Map(MODUL.flatMap((modul) => modul.menu.map((menu) => [menu.kode, { ...menu, modul }])));

export const cariMenu = (kode) => PETA.get(kode);

export const semuaMenu = () => [...PETA.values()];

/** Modul dan menu yang hak aksesnya bisa diatur lewat Akses Grup (bukan khusus Administrator). */
export function menuMatriks() {
  return MODUL.filter((m) => !m.khususAdministrator).map((m) => ({
    kode: m.kode,
    nama: m.nama,
    menu: m.menu.map((menu) => ({ kode: menu.kode, nama: menu.nama, aksi: aksiMenu(menu), keteranganAksi: menu.keteranganAksi ?? {} })),
  }));
}
