# EATS Dashboard: Rencana Pembukuan ala Accurate

> Disusun 2026-11-17, diperbarui 2026-11-19 (sumber data). **Status: disetujui Lutfi 2026-11-19.** Tahap 0 selesai
> dibangun 2026-11-19 (migrasi `finance` terpasang, digabung ke `main`; Vercel menunggu push); tahap berikutnya: Tahap 1.
> Tanda: **(keputusan Lutfi)** dari Lutfi, **(usulan Claude)** boleh diubah, **(perlu keputusan)** ditanyakan.

## 1. Tujuan

- Finance cukup mencatat di **satu tempat**, yaitu EATS Dashboard, lalu Accurate tidak dipakai lagi. **(keputusan Lutfi)**
- Seluruh sistem pembukuan dibangun di EATS. **Boomboo Operations tidak boleh diberi fitur pembukuan** (larangan bos,
  disampaikan Lutfi 2026-11-19), jadi kode dan tabel Operations tidak diubah sama sekali.
- Fitur dan modul Accurate ditiru, dengan tampilan yang dibuat mirip supaya pengguna langsung terbiasa. **(keputusan Lutfi)**
- Waktu yang disiapkan Lutfi: 1–2 minggu. Waktu itu cukup untuk Tahap 0–2 (§6). Semua tahap butuh perkiraan
  kasar 2–3 bulan.

Sumber daftar fitur: situs resmi accurate.id dan help.accurate.id, dibaca 2026-11-17. Ringkasannya di §4.

## 2. Sumber data yang sudah ada di database bos

Diperbarui 2026-11-19 dari keterangan Lutfi. Versi 2026-11-17 mengusulkan membaca Boomboo Operations dan POS;
usulan itu gugur.

| Aplikasi | Kondisinya | Dipakai EATS? |
| :--- | :--- | :--- |
| [Marketing Dashboard] (schema `marketing`) | Diperbarui Lutfi **setiap hari**. Angkanya sudah pasti. Isinya penjualan **retail**, yaitu Shopee dan TikTok Shop | **Ya, penjualan retail dibaca otomatis (keputusan Lutfi)** |
| [Boomboo Operations] (schema `operation_v2`) | Masih uji coba, angka pendapatannya belum pasti | **Belum.** Ditinjau lagi setelah dipakai sungguhan |
| Boomboo POS (schema `pos`) | Hanya dipakai saat event, itu pun tidak penuh karena sinyal sering terganggu | **Tidak (keputusan Lutfi)** |

Perusahaan punya **4 lini bisnis**: Maklon, Retail, HORECA, dan Modern Trade **(keterangan Lutfi)**. Retail saat
ini berarti Shopee dan TikTok Shop, dan nanti bisa bertambah marketplace lain. Hanya Retail yang bisa diambil
otomatis. Maklon, HORECA, dan Modern Trade diisi manual di EATS **(keputusan Lutfi)**.

Hasil pemeriksaan kode Marketing Dashboard (`C:\projects\boombo-dashboard`, 2026-11-19):

- Yang tersimpan adalah **angka penjualan versi Seller Centre**. Untuk Shopee, angkanya pesanan Confirmed dan dicatat
  pada tanggal konfirmasi. Untuk TikTok, angkanya GMV, dan pengembalian dana belum dikurangkan. Lihat catatan vault
  "Definisi Angka Penjualan Shopee dan TikTok Shop".
- Yang **tidak** tersimpan: potongan biaya marketplace (biaya admin, layanan, komisi, ongkos kirim) dan uang yang
  benar-benar cair ke rekening.
- Marketing Dashboard juga punya menu **Penjualan Offline**, yang diketik admin. Isinya penjualan HORECA dan
  WhatsApp. Menu ini bersinggungan dengan lini HORECA (§7 no. 2).
- Biaya iklan (Meta Ads, Shopee Ads) juga ada di sana.

## 3. Pendekatan

Semua 13 menu Accurate ada di EATS dan diisi manual seperti di Accurate. Pengecualiannya **satu sambungan
otomatis: penjualan Retail dari Marketing Dashboard** **(keputusan Lutfi)**.

Cara penjualan retail masuk pembukuan **(usulan Claude)**:

1. **Penjualan masuk otomatis** per marketplace per hari. Jurnalnya mencatat penjualan Retail dan menambah
   *Piutang Marketplace* (uang yang masih ditahan Shopee/TikTok). Karena data marketing berubah setiap hari, jurnal
   satu bulan ditulis ulang utuh setiap kali disinkronkan, jadi tidak pernah dobel. Bulan yang sudah ditutup tidak
   ikut ditulis ulang.
2. **Saat dana cair**, finance mencatat penerimaannya di Kas & Bank dari laporan pencairan Seller Centre. Satu
   penerimaan dipecah menjadi uang yang masuk ke bank dan biaya marketplace, lalu Piutang Marketplace berkurang.
3. **Cek silang**: Piutang Marketplace yang tidak kunjung habis menandakan ada selisih antara penjualan dan uang
   yang cair, misalnya karena pesanan batal atau pengembalian dana.
4. **Biaya iklan tidak dijurnal otomatis.** Finance mencatatnya dari tagihan atau bukti bayar, dan angka di
   Marketing Dashboard hanya dipakai untuk mencocokkan. Kalau keduanya dijurnal, biaya iklan akan tercatat dua kali.

Setiap transaksi diberi **lini bisnis** (di Accurate namanya "Departemen"), sehingga Laba Rugi bisa dilihat per
lini maupun gabungan.

## 4. Tampilan, meniru Accurate

**Yang ditiru (usulan Claude):**
- Susunan menu utama Accurate (dari help.accurate.id): Dashboard, Pengaturan, Perusahaan, Buku Besar, Kas & Bank,
  Penjualan, Pembelian, Persediaan, Aset Tetap, Manufaktur, Proyek, Pajak, Laporan.
- Pengelompokan submenu menurut jenisnya, seperti di Accurate:

  | Jenis | Warna penanda di Accurate | Contoh |
  | :--- | :--- | :--- |
  | Data induk | Biru | Akun Perkiraan, Pelanggan, Barang |
  | Pencatatan transaksi | Hijau | Jurnal Umum, Faktur Penjualan |
  | Pengaturan fitur | Oranye | Anggaran |
  | Laporan dan pantauan | Ungu | Histori Akun, Monitor Anggaran |

- Pola layar: daftar dengan filter dan kolom, lalu formulir transaksi. Formulir berisi kepala (tanggal, nomor,
  pelanggan), tabel rincian, dan total di bawah. Beberapa formulir bisa dibuka sebagai tab di dalam aplikasi.
- Nama menu dan istilah memakai istilah Accurate (istilah akuntansi umum Indonesia).
- Dashboard berisi widget seperti Accurate: laba rugi, saldo kas & bank, arus kas, beban, faktur terlewat,
  piutang pelanggan, pesanan penjualan, HPP & margin, laba per cabang.

**Yang tidak ditiru:** logo, nama "Accurate", ikon, dan gambar milik Accurate. Warna merek tetap merah cabai EATS.
**(usulan Claude)**

**Perlu dicocokkan:** pola layar di atas dirangkum dari panduan tertulis, belum dari layar aslinya. Supaya
benar-benar mirip, Claude perlu melihat layar Accurate yang dipakai finance (§7 butir 4).

## 5. Prinsip pembukuan (usulan Claude)

- **Semua dari jurnal.** Setiap transaksi (faktur, pembayaran, beban, penyusutan) otomatis membuat jurnal yang
  seimbang (debit = kredit). Pengguna tidak perlu paham debit-kredit, kecuali di menu Jurnal Umum. Laporan
  dihitung dari jurnal, dan angka total tidak disimpan, supaya tidak ada dua versi angka.
- **Tidak ada yang hilang diam-diam.** Transaksi yang diubah atau dihapus tercatat di Log Aktivitas. Bulan yang
  sudah ditutup buku terkunci.
- **Aturan lama tetap berlaku.** Kosong bukan nol, rupiah ditulis penuh, tanpa singkatan, tampil baik di HP,
  tablet, dan desktop, ada toast di setiap simpan, dan skeleton saat memuat.
- **Data uji terpisah.** Saat dikembangkan, laptop memakai schema `finance_uji` (salinan susunan `finance`),
  jadi Bu Inge dan Pak Martin tidak melihat data uji di production.
- **Halaman lama tetap ada.** Unggah laporan + AI tetap dipakai untuk bulan sebelum tanggal mulai. Mulai tanggal
  mulai, Ringkasan membaca dari jurnal. Setiap akun diberi pasangan "pos" (46 pos yang ada sekarang). Satu bulan
  hanya punya satu sumber, tidak dicampur.

## 6. Tahapan

Perkiraan waktu kasar, sudah termasuk pengujian. Setiap tahap dicek di browser (HP, tablet, desktop) dan
di-push hanya dengan izin Lutfi.

| Tahap | Isi (nama menu mengikuti Accurate) | Perkiraan |
| :--- | :--- | :--- |
| **0. Fondasi** | Kerangka tampilan ala Accurate (menu, tab, daftar, formulir). **Pengaturan:** Preferensi, Akses Grup (hak akses per menu), Pengguna, Penomoran otomatis. **Perusahaan:** data usaha, periode dan kunci periode, Log Aktivitas. Penyetuju Transaksi pindah ke Tahap 1 karena butuh transaksi. Rincian kerja: `docs/superpowers/plans/2026-11-19-tahap-0-fondasi.md` | 3–4 hari |
| **1. Buku Besar + laporan inti** | Akun Perkiraan (daftar akun baku Indonesia, bisa ditambah), Saldo Awal, Jurnal Umum, Pencatatan Beban, Histori Akun, Log Aktivitas Jurnal, **Departemen = 4 lini bisnis** (dipindah dari Tahap 7 karena Laba Rugi per lini dibutuhkan sejak awal). **Laporan:** Neraca, Laba Rugi, Neraca Percobaan, Buku Besar, Jurnal, plus ekspor Excel/PDF. **Dashboard:** widget laba rugi. Ringkasan lama tersambung ke jurnal | 3–4 hari |
| **2. Kas & Bank** | Penerimaan, Pembayaran, Transfer Bank, Rekening Koran (impor berkas mutasi dari internet banking), Rekonsiliasi Bank, Histori Bank. **Laporan:** Arus Kas. **Widget:** saldo kas & bank, arus kas | 2–3 hari |
| | *Selesai Tahap 2 (sekitar 2 minggu): finance sudah bisa mencatat semua uang masuk dan keluar di sini, dan laporan keuangan utama keluar otomatis.* | |
| **3. Penjualan & piutang** | Pelanggan dan kategori, Syarat Pembayaran, Penawaran, Pesanan, Pengiriman, Uang Muka, Faktur, Penerimaan Penjualan, Retur, Penyesuaian Harga/Diskon, Komisi Penjual, Target Penjualan, cetak faktur PDF. **Laporan:** piutang, umur piutang, penjualan. Maklon, HORECA, dan Modern Trade diisi lewat Faktur Penjualan. **Sambungan Retail** dari Marketing Dashboard dan pencatatan dana cair (§3) | 4–6 hari |
| **4. Pembelian & utang** | Pemasok dan kategori, Harga Pemasok, Pesanan Pembelian, Penerimaan Barang, Uang Muka, Faktur Pembelian, Pembayaran, Retur, Klaim Pemasok, Perintah Pembayaran, Transfer Pemasok. **Laporan:** utang, pembelian | 4–5 hari |
| **5. Persediaan & HPP** | Barang & Jasa, kategori, merek, satuan bertingkat, Gudang, Permintaan, Pemindahan, Penyesuaian, Stok Opname, stok minimum, HPP otomatis. **Laporan:** persediaan, kartu stok, HPP & margin. Diisi di EATS. Jumlah terjual per produk untuk HPP Retail dicek di data Marketing Dashboard | 4–6 hari |
| **6. Aset Tetap** | Aset Tetap, Kategori Aset (versi komersial dan pajak), penyusutan otomatis tiap akhir bulan, Perubahan, Disposisi, Pindah Aset, Aset per Lokasi | 2–3 hari |
| **7. Perusahaan lanjutan** | Multi Mata Uang, Cabang, Proyek (untung-rugi per proyek), Karyawan, Gaji/Tunjangan, Pinjaman Karyawan, Transaksi Berulang, Transaksi Favorit, Kalender pengingat, Anggaran, Transfer Anggaran, Monitor Anggaran | 5–7 hari |
| **8. Pajak** | PPN keluaran dan masukan, penomoran faktur pajak, PPh 21/23/15, laporan SPT Masa PPN dan PPh. Diserahkan sebagai berkas untuk diunggah sendiri ke sistem pajak (bentuk berkasnya dicek dulu) | 4–6 hari |
| **9. Manufaktur** | Formula produksi, pekerjaan pesanan, bahan baku, penyelesaian pesanan, HPP produksi. Diisi di EATS; Resep/COGS Operations ditinjau lagi setelah Operations dipakai sungguhan | 4–6 hari |
| **10. Lainnya** | Desain Cetakan (template faktur dan laporan), Proyek Kontraktor, portal pemesanan agen (seperti Trade Portal), asisten AI pembaca laporan (seperti Ailita) | 4–6 hari |

**Tidak bisa dibuat sendiri** karena butuh kerja sama resmi. Penggantinya sebagai berikut:

| Fitur Accurate | Butuh kerja sama dengan | Pengganti |
| :--- | :--- | :--- |
| SmartLink e-Banking (mutasi bank otomatis) | Tiap bank | Unggah berkas mutasi dari internet banking (Tahap 2) |
| SmartLink e-Commerce | Marketplace | Penjualan dibaca dari Marketing Dashboard; dana cair dicatat dari laporan Seller Centre (§3) |
| SmartLink e-Payment, Virtual Account | Penyedia pembayaran | Dicatat sebagai penerimaan biasa |
| SmartLink Tax (e-Faktur langsung) | Ditjen Pajak, lewat penyedia jasa aplikasi perpajakan resmi | Berkas untuk diunggah manual (Tahap 8) |
| e-Meterai | Peruri dan distributornya | Meterai ditempel di luar aplikasi |
| Accurate POS | Bukan masalah kerja sama | Tidak dibuat. Penjualan event dicatat manual sebagai penjualan tunai **(usulan Claude)** |

## 7. Keputusan yang dibutuhkan sebelum mulai

| No | Pertanyaan | Usulan Claude |
| :--- | :--- | :--- |
| 1 | ~~Pendekatan A atau B?~~ | **Terjawab 2026-11-19:** sambungan otomatis hanya untuk Retail dari Marketing Dashboard; lini lain diisi manual (§2–3) |
| 2 | ~~HORECA dari menu Penjualan Offline Marketing atau diisi di EATS?~~ | **Terjawab 2026-11-19:** untuk sekarang HORECA diisi manual di EATS. Caranya yang lebih enak diputuskan Lutfi nanti |
| 3 | Siapa yang menyediakan laporan pencairan dana Shopee dan TikTok Shop tiap bulan? | Baru dibutuhkan di Tahap 3. Ditanyakan ke finance setelah kembali dari cuti |
| 4 | ~~Satu PT dengan 4 lini bisnis?~~ | **Terjawab 2026-11-19: ya.** Satu pembukuan dengan 4 departemen |
| 5 | ~~Mulai dipakai sungguhan kapan?~~ | **Terjawab 2026-11-19: 1 Januari 2027, dipakai utuh.** Saldo awal diambil dari Neraca Accurate per 31 Desember 2026. Langganan Accurate dipertahankan 1–2 bulan sesudahnya hanya untuk dibaca dan dibandingkan, tanpa input |
| 6 | ~~Contoh layar Accurate untuk ditiru~~ | **Terjawab 2026-11-19:** memakai gambar dari halaman bantuan resmi help.accurate.id. Ringkasannya ada di rencana kerja Tahap 0, bagian "Acuan tampilan". Usulan awal: | Lutfi atau finance mengirim tangkapan layar Accurate yang sering dipakai: menu, dashboard, satu faktur, satu daftar, satu laporan. Kalau tidak ada akses, Lutfi mendaftar uji coba gratis 30 hari sendiri, lalu Claude melihatnya lewat browser Lutfi yang sudah masuk |

Keputusan yang bisa menunggu sampai tahapnya tiba:
- metode HPP (usulan: rata-rata, seperti bawaan Accurate);
- status PKP untuk PPN;
- aturan gaji dan PPh 21;
- definisi EBITDA dan arti "MGM", yang masih terbuka sejak 5 November;
- izin baca schema `marketing` untuk peran `finance_app` (Tahap 3). Ini perubahan hak akses di database bos, jadi
  dijalankan hanya dengan izin Lutfi;
- apakah pengembalian dana TikTok dikurangkan dari penjualan. Usulan: ya, dicatat sebagai retur penjualan. Dicek
  dulu apakah datanya tersimpan di Marketing Dashboard;
- lini bisnis untuk penjualan event. Usulan: Retail.

## 8. Untuk pembangun (catatan teknis awal)

- Tabel baru di schema `finance` lewat migrasi bernomor (003 dan seterusnya, peran `postgres`). Aplikasi tetap
  memakai `finance_app`.
- Inti data:
  - `akun` (kode, nama, jenis, induk, pasangan pos);
  - `jurnal` (data usaha, tanggal, nomor, sumber transaksi, keterangan);
  - `jurnal_baris` (akun, debit, kredit, departemen, proyek);
  - `periode_tutup`;
  - `log_aktivitas`.
- Setiap modul transaksi menulis dokumennya **dan** jurnalnya dalam satu transaksi database.
- Jenis akun mengikuti Accurate (dicocokkan lagi dengan layar aslinya): Kas & Bank, Piutang Usaha, Persediaan, Aset
  Lancar Lainnya, Aset Tetap, Akumulasi Penyusutan, Aset Lainnya, Utang Usaha, Utang Lancar Lainnya, Utang Jangka
  Panjang, Ekuitas, Pendapatan, Beban Pokok Penjualan, Beban, Pendapatan Lainnya, Beban Lainnya.
- Uji otomatis wajib:
  - setiap jurnal seimbang;
  - Neraca selalu seimbang (aset = kewajiban + modal);
  - Laba Rugi sama dengan perubahan laba di Neraca;
  - bulan tertutup tidak bisa diubah.
- Pindah data dari Accurate: saldo awal dan data induk (akun, pelanggan, pemasok, barang) lewat berkas ekspor
  Accurate. API Accurate (OAuth 2.0) bisa jadi cadangan.
- Setiap tahap dirinci dulu menjadi rencana kerja sendiri sebelum dibangun.
- **Wajib mulai Tahap 1** (dari review Tahap 0):
  - setiap tabel dokumen punya indeks unik (tipe transaksi, nomor), dan `ambilNomorBerikut` melompati nomor yang
    sudah terpakai. Penguncian di Tahap 0 hanya mencegah nomor kembar di dalam satu penomoran, belum antar-penomoran
    dengan susunan yang sama;
  - nomor diambil di akhir transaksi, supaya kunci baris nomor urut ditahan sesingkat mungkin;
  - `pastikanTanggalTerbuka` membaca baris perusahaan dengan `for share`.

[Boomboo Operations]: C:\projects\boomboo-operations
[Marketing Dashboard]: C:\projects\boombo-dashboard
