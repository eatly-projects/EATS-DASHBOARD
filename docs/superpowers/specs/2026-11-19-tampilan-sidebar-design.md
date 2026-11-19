# Tampilan: sidebar modern yang bisa dibuka-tutup, dengan cara kerja Accurate

Disetujui Lutfi 2026-11-19 ("ya saya setuju saja, kalau salah nanti saya minta revisi").

## Kenapa

Hasil Tahap 0 meniru tampilan Accurate terlalu harfiah: bilah ikon merah tua tanpa tulisan, kotak hijau tanpa
tulisan, kepala tabel cokelat, dan isi yang mengambang di tengah layar. Lutfi menilainya "jelek banget", dan Lutfi
maupun bosnya tidak terbiasa dengan tampilan itu.

Sasarannya: tampilan yang mudah dipakai finance (yang terbiasa Accurate), bos, dan Lutfi. Bentuknya perpaduan
Accurate dengan desain modern.

## Pendekatan

| Pilihan | Hasil |
| :--- | :--- |
| Tampilan Accurate yang dirapikan | Ditolak: Lutfi dan bos tidak terbiasa |
| Halaman biasa tanpa tab | Tidak dipilih: kehilangan cara kerja Accurate yang berguna untuk finance |
| **Sidebar modern bertulisan yang bisa dibuka-tutup, plus tab dan pola daftar-formulir ala Accurate** | **Dipilih Lutfi** |

Isi menu per orang sudah diatur Akses Grup: bos cukup diberi hak Dashboard dan Laporan.

## Rancangan

### Sidebar
- **Desktop dan tablet:**
  - Lebarnya `w-64` saat terbuka dan `76px` saat ditutup.
  - Tombol « / » di kepala sidebar membuka dan menutupnya.
  - Pilihan buka atau tutup diingat per browser di `eats.sidebar`.
- **Isi, dari atas ke bawah:**
  1. Logo dan "EATS Dashboard", dengan nama perusahaan di bawahnya.
  2. "Dashboard".
  3. Kelompok modul berurutan Laporan, Perusahaan, lalu Pengaturan paling bawah. Judul kelompok ditulis kecil dan
     abu-abu.
  4. Akun di bagian bawah: inisial, nama, level, dan tombol Keluar.
- **Setiap menu** memakai kotak ikon kecil berwarna menurut jenisnya, mengikuti pola Accurate: biru data induk, hijau
  transaksi, oranye pengaturan, ungu laporan.
  - Menu aktif berlatar merah muda dengan garis merah di kiri.
  - Lencana jumlah unggahan yang menunggu dicek tetap ada.
- **Saat ditutup:** hanya kotak ikon yang tampil, dan nama menu muncul sebagai keterangan saat ditunjuk.
- **HP:** sidebar jadi laci yang dibuka lewat ☰ di bilah atas khusus HP. Isinya sama dengan sidebar desktop.

### Bilah kanan
- **Baris tab** paling atas, menempel.
  - Tab aktif ditandai garis merah di bawah, bukan blok merah penuh.
  - Tombol "N tab ⌄" di ujung kanan.
- **Kepala halaman:** nama menu sebagai judul, ditambah satu kalimat keterangan yang disimpan di client.
- **Lebar isi:** rata kiri, selebar layar, maksimal `1600px`.

### Daftar dan formulir
- **Sub-tab "Daftar"** bertulisan menggantikan kotak hijau. Tombol "Data baru" menjadi "Tambah {nama data}", dan sub-tab
  barunya bernama "{Nama data} baru".
- **Tabel daftar:**
  - Kepala tabel abu muda dengan tulisan gelap.
  - Tombol "Muat ulang" bertulisan; di HP hanya ikonnya.
  - Jumlah ditulis dengan satuannya, misalnya "3 pengguna".
  - Petunjuk di kolom cari bisa diatur per halaman.
- **Formulir:**
  - Semua bagian disusun bertumpuk di semua ukuran layar, tanpa tab di dalam formulir.
  - Tombol aksi tetap di kolom kanan di desktop, dan di bilah bawah di HP.

### Yang dihapus
- Bilah ikon merah tua (`RelModul`) dan panel kotak menu (`PanelModul`).
- Token `--rel*` dan `--kepala-tabel`.
- Bilah atas desktop.

### Keputusan saat membangun
- **Lencana "Aktif" tetap biru.** Biru adalah warna "baik" di tema Merah cabai dan juga dipakai untuk angka laba di
  Ringkasan, jadi tidak diganti hijau.
- **Di bawah lebar laptop (1024 px), daftar tampil sebagai kartu, bukan tabel.** Dengan sidebar terbuka, tabel di
  tablet terlalu sempit dan kolom kanannya harus digeser.
- **Akun di bawah sidebar ditulis dua baris** (nama dan level, lalu tombol Keluar), supaya nama panjang tidak terpotong
  di tengah kata.

## Batas
- Hanya client yang berubah. Server, data, hak akses, dan alamat menu tetap sama.
- Bilah setujui di Cek Unggahan mengikuti lebar sidebar lewat variabel CSS `--lebar-sidebar`.

## Cara membuktikan
- Build dan lint bersih.
- Cek di browser laptop (dev server lokal, data `finance_uji`) pada 1440 px, 820 px, dan 390 px:
  - sidebar terbuka dan tertutup;
  - laci di HP;
  - daftar, formulir, Ringkasan, dan Unggah;
  - akun Operator dengan menu terbatas.
- Screenshot dikirim ke Lutfi sebelum ada commit.
