# EATS Dashboard — Progres

> Catatan kronologis. Yang terbaru di atas.

## 2026-11-25 — Tahap 3a: penghubung Operasional dan Umur Piutang (di-push ke `main`)

Permintaan Lutfi lewat sesi Operasional: "tolong konsultasikan dan langsung kerjakan saja". Ini langkah 3 rancangan
`docs/superpowers/specs/2026-11-24-kas-bank-dan-sambungan-operasional-design.md` §5.1–5.2. Rencana kerjanya
`docs/superpowers/plans/2026-11-25-tahap-3a-penghubung-umur-piutang.md` (cara Native), di branch
`tahap-3a-umur-piutang`.

- **Penghubung ke Operasional:**
  - Backend EATS membaca `GET /api/eaats/piutang` dengan env `OPERASIONAL_API_URL` dan `OPERASIONAL_API_KEY`
    (= `EAATS_API_KEY` di Operasional). Kunci tidak pernah ke browser.
  - Pesan galat:
    - "Kunci sambungan ke Operasional belum dipasang" (503);
    - "Kunci sambungan ke Operasional salah" (502; sengaja bukan 401, karena 401 membuat pengguna EATS keluar).
  - Kalau Operasional tidak bisa dihubungi, yang tampil data terakhir dari tabel `operasional_cadangan` beserta
    waktunya. Ini mencakup waktu habis 20 detik, 5xx, dan isi yang bukan bentuk kontrak.
  - Kalau ada cek Operasional yang gagal, angkanya tidak ditampilkan dan nama ceknya disebut.
- **Penjualan › Umur Piutang** (menu baru, hak diatur lewat Akses Grup):
  - Ringkasan per kelompok umur.
  - Daftar per pelanggan yang bisa dibuka per dokumen.
  - Saringan lini bisnis, termasuk "Tanpa lini bisnis".
  - CO selalu "Belum ada jatuh tempo" (§97).
  - Tulisan "Data ini hanya bisa diubah di aplikasi Operasional", tombol "Buka di Operasional" per dokumen, dan
    "Diperbarui terakhir …".
  - Dokumen lunas tidak ditampilkan; uang yang harus dikembalikan ke klien ditulis terpisah.
- **Migrasi `006_operasional_cadangan.sql`:** terpasang di `finance_uji` dan `finance` (2026-11-25, izin Lutfi "silahkan push
  dan lain sebagainya"). Schema lain tidak berubah, `finance_app` bisa menulis ke tabel baru, dan `uji:isolasi` lulus.
  Migrasi dipasang sebelum push.

**Diverifikasi:**
- `npm run uji`: 177 tes lulus (sebelumnya 148). Tes baru `migrasi-006`, `operasional-klien`, dan `umur-piutang`
  memakai server tiruan Operasional, tidak pernah Operasional sungguhan.
- Tinjauan akhir oleh pemeriksa terpisah: tidak ada masalah kritis. Dua temuan diperbaiki, masing-masing dengan tes
  yang gagal dulu:
  - isi Operasional yang barisnya rusak sempat menimpa cadangan dan tidak jatuh ke data terakhir;
  - jawaban 503 dari platform (bukan dari Operasional) terbaca sebagai "kunci belum dipasang".
- Konsultasi dengan sesi Operasional: angka `*_rp` selalu rupiah bulat, jadi batas 2 desimal di EATS aman.
- Lint berkas baru bersih, dan build client berhasil.
- Di browser lokal (server tiruan 4921, server 4910, client 5178, akun uji sekali pakai yang sudah dihapus):
  - angka sama dengan data tiruan;
  - rincian dokumen tampil;
  - tautan "Buka di Operasional" terbuka di tab baru;
  - saringan Maklon berfungsi;
  - 390 dan 820 px tidak melebar (diukur dengan skrip);
  - pita "data terakhir" muncul setelah tiruan dimatikan.

**Belum diverifikasi:**
- Panggilan ke Operasional sungguhan: Lutfi membuka halamannya sendiri di Vercel (Claude tidak masuk dengan akun asli).
- Tampilan dilihat langsung di HP sungguhan.

**Kekurangan kecil yang ditunda:**
- Kalau menyimpan cadangan gagal (gangguan database), halaman galat walau data langsung sudah ada. Cadangan juga
  menyimpan seluruh jawaban setiap halaman dibuka.
- Dua penyimpanan cadangan yang bersamaan bisa tertimpa jawaban yang lebih lama.
- Kalau Operasional menggantung, menunggu 20 detik sebelum data terakhir tampil (tanpa cadangan sekitar 40 detik).
- Saat saringan diganti, angka saringan lama tampil sebentar di bawah label baru selama memuat.
- Permintaan ke Operasional mengikuti pengalihan alamat dan menerima `http://`.
- Lini bisnis baru dari Operasional yang belum dikenal tampil sebagai kode mentah.
- Teks kosong "di lini bisnis ini" juga muncul saat memilih Semua lini bisnis.
- Setelah cek gagal lalu Operasional tidak terhubung, data lama dari sebelum cek gagal tampil lagi (dengan tanggalnya).

## 2026-11-24 — Tahap 2a: Kas & Bank dasar (di-push ke `main`, commit 044fdf2)

Rancangan Tahap 2 dan 3 disetujui Lutfi 2026-11-24 ("rancangan Tahap 2 dan 3 disetujui, dengan perbaikan dari sesi
Operasional"): `docs/superpowers/specs/2026-11-24-kas-bank-dan-sambungan-operasional-design.md`. Ini langkah 1 dari
urutan §6. Rencana kerjanya ada di `docs/superpowers/plans/2026-11-24-tahap-2a-kas-bank-dasar.md` dan dikerjakan
dengan cara Native (pilihan Lutfi).

**Migrasi `005_kas_bank.sql` terpasang di `finance_uji` dan `finance` (2026-11-24, izin Lutfi "ya dua duanya").**
Schema lain tidak berubah. Di `finance`: rekening utama 110102 BCA, penomoran BM./BK./TB. ada, `finance_app` bisa
membaca kolom baru, `uji:isolasi` lulus. Migrasi dipasang sebelum push supaya layar lama tidak error.

- **Rekening:**
  - Akun bertipe Kas & Bank punya kolom "Nama bank" dan "Nomor rekening, 4 angka terakhir".
  - Rekening utama diatur di Preferensi. Bawaannya 110102 Bank (BCA). Rekening utama tidak bisa dinonaktifkan,
    dihapus, atau diganti tipenya.
  - Kas kecil memakai akun 110101 Kas yang sudah ada.
- **Penerimaan** (nomor `BM.`), **Pembayaran** (`BK.`), dan **Transfer Bank** (`TB.`) di modul baru Kas & Bank:
  - Penerimaan: debit rekening, kredit setiap rincian. Pembayaran sebaliknya. Transfer: debit tujuan, kredit asal.
  - Mengikuti Penomoran, Penyetuju Transaksi, kunci periode, dan Log Aktivitas seperti transaksi lain.
  - Rincian menolak akun Kas & Bank (diarahkan ke Transfer Bank), serta Piutang Usaha, Utang Usaha, dan Persediaan.
    Pesannya "Transaksi ini dicatat di aplikasi Operasional", dan formulirnya punya tombol "Buka aplikasi
    Operasional".
- **Histori Bank:**
  - Saldo awal, saldo berjalan, dan saldo akhir satu rekening. Tanpa pilihan, rekening utama yang dipakai.
  - Nomor setiap baris membuka dokumen asalnya lewat alamat `?buka=…&judul=…`, yang sekarang dikenali semua halaman
    daftar.
- **Arus Kas** (metode langsung) di Laporan Keuangan:
  - Satu kolom per bulan (paling banyak 12), dikelompokkan ke Operasi, Investasi, dan Pendanaan.
  - Ada saringan per lini bisnis, unduhan Excel, dan cek "saldo awal + kenaikan = saldo akhir".
- **Halaman utama:** kartu Kas & Bank berisi saldo setiap rekening hari ini (tanpa transaksi ditulis "—") dan uang
  masuk/keluar bulan berjalan. Hanya tampil untuk yang punya hak Histori Bank.

**Diverifikasi:**
- `npm run uji`: 148 tes lulus (sebelumnya 118). Tes baru: `migrasi-005`, `kas-bank`, dan `kas-bank-laporan`;
  `akun` dan `preferensi` diperluas.
- Tinjauan akhir oleh pemeriksa terpisah: tidak ada masalah kritis. Enam temuan sudah diperbaiki, masing-masing
  dengan tes yang gagal dulu:
  - Arus Kas memberi peringatan palsu kalau rentangnya memuat saldo awal 31 Desember;
  - tautan nomor di Histori Bank hanya bisa dipakai sekali (diperbaiki dan dibuktikan di browser);
  - pengguna yang hanya punya hak Histori Bank bisa melihat saldo semua akun lewat API;
  - kartu "Bulan ini" menulis Rp 0 sebelum buku dimulai, sekarang "—";
  - rekening utama bisa dijadikan akun induk;
  - Preferensi menolak semua simpan kalau rekening utama kosong.
- `npm run build` client berhasil.
- Di dev server lokal (4910/5178), dengan akun uji sekali pakai yang sudah dihapus:
  - Penerimaan diisi dan disimpan lewat layar, dengan nomor BM.2027.01.00001 dan toast;
  - pilihan akun rincian tidak memuat Kas & Bank, Piutang, Utang Usaha, atau Persediaan;
  - Histori Bank: saldo berjalan benar, dan tautan nomor membuka dokumen di tab Pembayaran;
  - Arus Kas tiga bulan dengan dan tanpa saringan Maklon;
  - kartu saldo, kolom bank di formulir akun, dan pilihan rekening utama di Preferensi;
  - 16 halaman di lebar 390 dan 820 px tidak ada yang melebar ke samping. Ini diukur dengan skrip.

**Belum diverifikasi:**
- Tampilan formulir dilihat langsung di HP dan tablet. Tangkapan layar alat browser selalu gagal selama ada formulir
  terbuka, termasuk formulir Pencatatan Beban lama, jadi ini masalah alat, bukan kode baru.
- HP sungguhan dan Vercel.

**Kekurangan kecil yang ditunda:**
- Pesan "Isi paling sedikit satu rincian beban." juga muncul di formulir Penerimaan dan Pembayaran.
- Nomor di Histori Bank tetap bertautan walau pengguna tidak punya hak membuka menu tujuannya.
- Pilihan rekening di Histori Bank tidak menampilkan nama rekening nonaktif yang dibuka dari kartu saldo.
- Arus Kas yang disaring per lini bisnis tetap menampilkan baris Kenaikan/Penurunan. Rencana kerja bilang disembunyikan,
  tapi baris ini berguna.
- Keterangan menu Laporan Keuangan belum menyebut Arus Kas; Excel menulis "Kenaikan/Penurunan", layar "Kenaikan atau
  Penurunan".
- Tes kesinambungan saldo antar-bulan untuk semua kasus, dan Transfer dari rekening nonaktif.
- Daftar API di `docs/PLANNING.md` §6 belum memuat rute Tahap 1 maupun 2a.

## 2026-11-20 — Tahap 1: Buku Besar dan laporan inti (di-push ke `main`)

Arahan Lutfi: "lanjut kerjakan, ingat ya seperti accurate". Rencana kerja ada di
`docs/superpowers/plans/2026-11-19-tahap-1-buku-besar.md`, termasuk ringkasan perilaku Accurate dari help.accurate.id.
Lutfi menyetujui semuanya 2026-11-20, termasuk rancangan database.

**Migrasi `004_buku_besar.sql` terpasang di `finance_uji` dan `finance` (2026-11-20).**
- Schema lain tidak berubah.
- Isi di `finance`: 73 akun (16 induk), 4 departemen, 0 jurnal. Ekuitas Saldo Awal 300001, Laba Ditahan 300002.
- `finance_app` bisa membaca, menambah, mengubah, dan menghapus di 6 tabel baru. `uji:isolasi` lulus.

- **Akun Perkiraan:**
  - 16 tipe akun dengan nama persis Accurate.
  - Akun bertingkat (Sub Akun dari); saldo induk adalah jumlah anaknya.
  - Akun bawaan berpola kode Accurate (73 akun), boleh diubah finance.
  - Akun yang sudah dipakai terkunci tipenya dan tidak bisa dihapus.
- **Saldo awal:** diisi di formulir akun dan otomatis menjadi jurnal "Saldo Awal akun X" per 31 Desember 2026, melawan
  Ekuitas Saldo Awal. Akun lawan ini dan Laba Ditahan diatur di Preferensi.
- **Jurnal Umum:**
  - Tanggal, nomor otomatis, keterangan; rincian Akun, Debit, Kredit, Departemen, Catatan.
  - Debit harus sama dengan kredit, dan database ikut menolak jurnal yang tidak seimbang.
  - Nomor tidak kembar walau disimpan bersamaan.
- **Pencatatan Beban:** akrual seperti Accurate. Beban dicatat sebagai Hutang Beban; dibayar nanti lewat Kas & Bank
  (Tahap 2).
- **Departemen** berisi 4 lini bisnis (Maklon, Retail, HORECA, Modern Trade).
- **Penyetuju Transaksi (Pengaturan) dan Persetujuan (Perusahaan):**
  - Aturan per tipe transaksi dengan nilai minimal dan penyetuju.
  - Transaksi yang kena aturan menunggu tanpa nomor dan belum masuk laporan.
  - Penyetuju menyetujui atau menolak dengan alasan, dan ada lencana jumlah yang menunggu di sidebar.
  - Keputusan Lutfi 2026-11-20:
    - Daftar Persetujuan terlihat oleh semua yang punya hak menu itu.
    - Penyetuju boleh menyetujui transaksi buatannya sendiri, karena saat bos sibuk finance yang mengatur semuanya.
      Aturan ini dikunci dengan tes.
- **Laporan Keuangan:**
  - Laba/Rugi, Laba/Rugi per Lini Bisnis, Neraca (dengan Laba Ditahan dan Laba Tahun Ini), Neraca Percobaan, Rincian
    Buku Besar, Keseluruhan Jurnal.
  - Bisa diunduh Excel dan dicetak atau disimpan PDF.
- **Histori Akun:** satu akun, satu rentang, dengan saldo berjalan.
- Semua perubahan tercatat di Log Aktivitas.

**Sudah diverifikasi:**
- 112 tes server lulus, termasuk:
  - jurnal seimbang dan hitungan sen tepat;
  - kunci periode;
  - nomor tidak kembar saat disimpan bersamaan;
  - persetujuan;
  - Neraca seimbang, termasuk perpindahan laba antar-tahun.
- Tes uang di client lulus, build dan lint bersih.
- Dicek di browser laptop (data uji), lalu datanya dihapus lagi:
  - saldo awal bank;
  - Jurnal Umum lewat layar;
  - Pencatatan Beban;
  - Laba/Rugi per Lini Bisnis Januari 2027;
  - Neraca seimbang;
  - unduh Excel;
  - persetujuan lewat layar;
  - Histori Akun;
  - tampilan HP dan tablet.

**Sebelum rilis (2026-11-20):** 118 tes server lulus, tes uang di client lulus, lint dan build bersih.

**Belum diverifikasi:** HP sungguhan, dan pemakaian langsung di Vercel oleh Lutfi.

**Review independen:**
- Tidak ada temuan kritis.
- Diperbaiki, masing-masing dengan tes yang gagal dulu lalu lulus (total 117 tes):
  1. Akun pendapatan dan beban sekarang mulai dari nol setiap 1 Januari di Neraca Percobaan dan Histori Akun. Laba
     tahun lalu masuk Laba Ditahan.
  2. Periode tidak bisa dikunci selama masih ada transaksi yang menunggu persetujuan di dalamnya.
  3. Penyetuju wajib punya hak Lihat di menu Persetujuan.

**Kekurangan kecil yang ditunda (Tahap 1):**
- Akun bisa dijadikan induk tepat saat jurnal memakainya. Sangat jarang terjadi.
- Neraca bisa sesaat menampilkan peringatan "tidak seimbang" palsu kalau ada jurnal tersimpan tepat saat dihitung.
- Jurnal saldo awal di periode terkunci ditulis ulang saat kode atau nama akun diganti. Nilainya tetap.
- Pemilih akun di formulir transaksi memperlihatkan saldo semua akun.
- Pita "Menunggu persetujuan" menyebut "belum punya nomor", padahal transaksi yang diubah ulang tetap bernomor.
- Histori Akun tidak bisa memilih akun nonaktif.
- Tes memakan nomor urut penomoran bawaan di data uji.
- Daftar Akun Perkiraan menampilkan saldo pendapatan dan beban sepanjang masa, bukan tahun berjalan. Laporannya sudah
  benar.

**Ditunda** (alasan di rencana kerja, Keputusan Claude):
- Dari Accurate:
  - lampiran berkas, impor Excel, Hapus Massal;
  - Proyek;
  - Pelanggan/Pemasok di baris jurnal;
  - mata uang asing;
  - persetujuan "minimal dua" atau "semua harus setuju";
  - subtotal akun induk di laporan.
- Widget Dashboard dan sambungan Ringkasan lama ke jurnal. Keduanya butuh finance memasangkan akun ke 46 pos dan lini
  bisnis ke unit usaha.

## 2026-11-19 — Tampilan baru: sidebar modern yang bisa dibuka-tutup (di-push ke `main`)

Lutfi menilai tampilan Tahap 0 (tiruan Accurate) "jelek banget", dan Lutfi maupun bosnya tidak terbiasa dengan tampilan
itu. Arah yang disetujui adalah perpaduan Accurate dengan desain modern. Rancangannya ada di
`docs/superpowers/specs/2026-11-19-tampilan-sidebar-design.md`.

- **Sidebar:**
  - Putih, nama menu ditulis lengkap, dikelompokkan Laporan, Perusahaan, lalu Pengaturan.
  - Setiap menu punya kotak ikon kecil berwarna menurut jenisnya, mengikuti pola Accurate.
  - Bisa ditutup jadi bilah ikon, dan pilihannya diingat.
  - Di HP sidebar jadi laci.
- **Tab ala Accurate tetap ada.** Tab aktif ditandai garis merah, dan tombol "N tab ⌄" ada di ujung kanan.
- **Setiap halaman** punya judul dan satu kalimat keterangan.
- **Daftar:**
  - Sub-tab "Daftar" bertulisan dan tombol "Tambah …".
  - Kepala tabel abu muda, jumlah ditulis dengan satuannya ("5 pengguna"), dan tombol "Muat ulang" bertulisan.
  - Di HP dan tablet daftar tampil sebagai kartu.
- **Formulir:** bagiannya disusun bertumpuk, dengan tombol Simpan di kanan (di HP menempel di bawah).
- **Dihapus:** bilah ikon merah tua, panel kotak menu, dan bilah atas desktop.
- **Server, data, dan hak akses tidak berubah.**

**Sudah diverifikasi:**
- Build dan lint bersih.
- Dicek di browser laptop (dev server lokal, data `finance_uji`):
  - desktop dengan sidebar terbuka dan tertutup, termasuk keterangan saat ikon ditunjuk;
  - formulir Pengguna dan Akses Grup;
  - tablet (820 px) dan HP (390 px) lewat bingkai, termasuk laci menu;
  - Operator yang hanya diberi hak Dashboard dan Unggah Laporan, yang sidebarnya hanya berisi dua menu itu.
- Akun dan grup uji yang dibuat untuk pengecekan sudah dihapus lagi.

**Belum diverifikasi:** HP sungguhan dan Vercel. Dashboard berisi angka belum dilihat, karena data uji belum punya
laporan yang disetujui.

## 2026-11-19 — Tahap 0 pembukuan ala Accurate: fondasi (dirilis ke Vercel)

Rencana kerja: `docs/superpowers/plans/2026-11-19-tahap-0-fondasi.md`.

- **Migrasi `003_fondasi_akuntansi.sql` sudah terpasang di schema production `finance`.** Schema lain tidak berubah.
- Hasil `npm run uji:isolasi` ke `finance`: semua lulus.
- Hak `finance_app` di tabel baru sesuai rencana: Log Aktivitas tidak bisa diubah atau dihapus, dan baris Perusahaan
  tidak bisa ditambah atau dihapus.
- Tiga akun admin tetap utuh.
- Commit `8f0978e` di-push ke `main`; Vercel sudah deploy (backend menjawab menu baru, berkas frontend sama dengan build yang dites). Masuk dengan akun asli di Vercel belum dicek Claude.

Yang dibangun:

- **Kerangka tampilan ala Accurate.**
  - Bilah ikon modul (merah cabai gelap) dengan panel kotak menu berwarna: biru data induk, hijau transaksi,
    oranye pengaturan, ungu laporan.
  - Setiap menu jadi tab dengan tombol tutup. Tab tetap hidup saat tidak dibuka, jadi isiannya tidak hilang, dan
    tab yang sama terbuka lagi setelah halaman dimuat ulang.
  - Di HP, menu dibuka lewat laci.
  - Sidebar lama yang bisa dibuka-tutup diganti bilah ikon ini.
- **Pola daftar lalu formulir:**
  - Daftar: chip filter, cari, jumlah data, dan tabel berkepala gelap.
  - Formulir: tab Umum dan lainnya, serta tombol Simpan dan Hapus di kanan. Di HP isinya bertumpuk dan tombolnya
    pindah ke bawah.
- **Pengaturan (khusus Administrator):**
  - **Preferensi:** data perusahaan, awal periode akuntansi (1 Januari 2027), dan kunci transaksi.
  - **Akses Grup:** hak Lihat/Buat/Ubah/Hapus per menu untuk Operator.
  - **Pengguna:** level Administrator atau Operator, plus akses grup.
  - **Penomoran:** nomor otomatis, misalnya JU.2027.01.00001. Nomor tidak kembar walau disimpan bersamaan, dan
    susunannya terkunci setelah dipakai.
- **Perusahaan, Log Aktivitas:**
  - Setiap perubahan tercatat: siapa, kapan, alamat IP, serta isi sebelum dan sesudah.
  - Catatan tidak bisa diubah atau dihapus aplikasi.
  - Filter tanggal ditulis eksplisit, misalnya "13–19 Nov 2026".
- **Hak akses di menu lama:** Ringkasan dan Unggah Laporan sekarang dicek per hak. Alamat lama (`/unggah`,
  `/unggahan/…`, `/pengguna`) dialihkan otomatis.
- **Schema uji `finance_uji`** di database bos. Tes otomatis dan dev server laptop memakai schema ini;
  `.env` laptop sudah `DB_SCHEMA=finance_uji`, sedangkan Vercel tetap `finance`. Tiga akun admin disalin ke sana.
- **Penyetuju Transaksi dipindah ke Tahap 1**, karena butuh transaksi untuk disetujui.

**Sudah diverifikasi:**
- 55 tes server lulus: hak akses, nomor paralel, kunci periode, log tidak bisa dihapus, tes hanya jalan di
  `finance_uji`, dan Vercel dengan satu sambungan database.
- Build dan lint client bersih.
- Dicek di browser laptop Lutfi, port 5178 dengan data uji: semua halaman baru; Operator tanpa grup dan Operator
  dengan grup; tampilan HP (390 px) dan tablet (820 px) lewat bingkai, karena jendela browser tidak bisa diubah
  ukurannya.
- Alur lama penuh (unggah Excel contoh, AI membaca, setujui, Dashboard) tetap jalan dan tercatat di log.

**Belum diverifikasi:** HP sungguhan dan Vercel.

**Diperbaiki setelah review:**
1. Mencabut akses grup Operator tidak berpengaruh.
2. Membatalkan unggahan menggantung di Vercel.
3. Tes keamanan bisa mengarahkan sambungan ke `finance`.
4. Menu gagal dimuat tampil sebagai "belum punya akses".
5. Toast galat palsu setelah menghapus grup.
6. Bilah Setujui bergeser.

Masing-masing punya tes yang gagal dulu, lalu lulus.

**Syarat wajib Tahap 1** (tertulis di `RENCANA-AKUNTANSI.md` §8):
- Nomor dokumen tidak boleh kembar antar-penomoran.
- `pastikanTanggalTerbuka` memakai `for share`.

**Kekurangan kecil yang ditunda** (belum dikerjakan kecuali Lutfi minta):
- Penomoran:
  - Kunci susunan nomor bisa terlewat kalau dua orang menyimpan bersamaan.
  - Pesan bentrok selalu "nama sudah dipakai", walau yang bentrok penomoran bawaan.
- Akses Grup:
  - `Promise.all` pada satu sambungan transaksi memberi peringatan `pg` dan akan rusak di `pg` 9.
  - Menghapus grup bersamaan dengan menambah anggotanya berakhir galat 500.
- Unggah Laporan:
  - Tombol Batalkan di kotak unggah tidak cek hak Hapus (berakhir toast 403).
  - Operator dengan hak Hapus tanpa Ubah tidak bisa membatalkan unggahan yang menunggu dicek.
  - Tab Unggah yang tersembunyi bisa memindahkan layar saat AI selesai membaca.
- Tab menu: menutup tab atau "Tutup semua" membuang formulir yang belum disimpan tanpa konfirmasi.
- Log Aktivitas: daftarnya tidak segar sendiri setelah perubahan lain; perlu tombol muat ulang.
- Tes: penjaga schema dicek per tes, belum per berkas.
- Preferensi: `PUT /preferensi` mengosongkan kolom yang tidak dikirim (halaman selalu mengirim semua).
- Ringkasan: tautan berkas sumber tampil untuk pengguna tanpa hak Unggah.
- Database:
  - Pool production belum punya batas waktu query di sisi klien.
  - Saran (perlu izin): `ALTER ROLE finance_app SET idle_in_transaction_session_timeout = '60s'` dan
    `statement_timeout = '25s'`, supaya sambungan yang menggantung tidak mengunci data selamanya.

## 2026-11-11 — Unggahan Bu Inge dihapus

Permintaan Lutfi. Bu Inge mengunggah dan menyetujui `Rekap_PT-EATS_2026_DUMMY.xlsx` (447 angka, Januari–Oktober
2026, PT EATS dan Boomboo). Dihapus dalam satu transaksi: 447 angka laporan dan 1 unggahan beserta berkasnya.
Tiga akun admin dan pengaturan (46 pos laporan, 2 unit usaha) tetap. Terbukti di database: angka dan unggahan 0.

## 2026-11-11 — Semua data dikosongkan lagi, 3 akun admin baru

Permintaan Lutfi: kosongkan benar-benar semua data, lalu buat akun admin untuk Lutfi, Martin, dan Inge.
Dihapus dalam satu transaksi: 447 angka laporan, 1 unggahan (Excel dummy) beserta berkasnya, dan 2 akun lama
(`boomboo.eatly@gmail.com` dan `martin@eats.com` yang nonaktif). Pengaturan (46 pos laporan, 2 unit usaha) tetap,
karena tanpa itu aplikasi tidak bisa membaca laporan. Akun baru, semuanya admin: `lutfi@boomboo.id`,
`martin@boomboo.id`, `inge@boomboo.id`. Kata sandinya di berkas `env-akun` di akar project (masuk `.gitignore`).
Terbukti di database: tiga akun aktif dan kata sandinya cocok dengan hash. Belum dicoba masuk lewat Vercel.
Catatan: kata sandi Inge 7 karakter, lebih pendek dari aturan halaman Pengguna (minimal 8). Masuk tetap bisa;
kalau kata sandinya diganti lewat halaman Pengguna, yang baru harus minimal 8 karakter.

## 2026-11-06 — Sidebar bisa dibuka-tutup

Permintaan Lutfi. Di laptop, tombol ☰ di kiri judul halaman menciutkan sidebar jadi bilah ikon selebar 76 px.
Nama menu muncul sebagai keterangan saat ikon disentuh kursor, dan pilihannya diingat browser (`eats.sidebar`).
Di HP tidak berubah: tetap laci penuh. Dicek di browser lokal: ciut → buka, tetap ciut setelah dimuat ulang,
menu aktif tetap bersorot, laci HP 390 px tetap penuh. Saat menguji ketemu dan diperbaiki: keterangan melayang
yang langsung membungkus NavLink menghapus gaya menu aktif.

## 2026-11-06 — Tombol keluar, login awet, tampilan "Merah cabai", data dikosongkan

Permintaan Lutfi setelah berhasil login di Vercel:
1. **Tombol Keluar hanya memunculkan toast.** Sebabnya `qc.clear()` ikut membuang kueri sesi yang dipantau
   ProtectedRoute, jadi halaman tidak tahu sesinya sudah kosong. Sekarang sesi dikosongkan dulu, data lain dibuang,
   lalu pindah ke /masuk. Terbukti di browser lokal: klik Keluar → halaman login.
   **Login awet sampai Keluar:** cookie 365 hari dan diperpanjang otomatis saat dipakai (`wajibMasuk`). Terbukti:
   Max-Age 365 hari; token berumur 2 hari diperpanjang, token berumur 1 jam tidak.
2. **Tampilan lebih ramah, hijau → merah cabai.** Latar putih, sidebar putih, huruf Plus Jakarta Sans, kartu utama
   "Untung/Rugi" + "Dari setiap Rp100 penjualan", kartu angka berikon, tanpa label huruf kapital dan nomor bagian.
   "Membaik" kini biru (merah sudah dipakai merek dan "memburuk"). Dicek di browser lokal: desktop, HP 390 px,
   tablet 820 px (tidak ada yang melebar ke samping); halaman Masuk, Ringkasan, Unggah, Cek dan setujui, Pengguna,
   dan keadaan kosong.
3. **Semua data dihapus, akun Lutfi dibuat.** Dihapus dalam satu transaksi: 447 angka laporan, 6 unggahan beserta
   berkasnya, 3 akun uji. Pengaturan (46 pos laporan, 2 unit usaha) tetap. Akun baru: admin `boomboo.eatly@gmail.com`
   (nama Lutfi), kata sandinya di berkas `env-akun` di akar project (masuk `.gitignore`). Terbukti bisa masuk (200).
   `akun-baru.local.txt` (akun uji lama) dihapus. Akun uji sementara untuk cek tampilan sudah dihapus lagi.

Belum: perubahan 1 dan 2 belum di-push, jadi Vercel masih versi lama. Penghapusan data dan akun baru sudah berlaku
di production karena databasenya sama.

## 2026-11-06 — Deploy ke Vercel

| Project Vercel | Alamat | Root Directory |
| :--- | :--- | :--- |
| Backend `eats-dashboard-server` | https://eats-dashboard-server.vercel.app | `server` |
| Frontend | https://eat-dashboard-kappa.vercel.app | `client` |

Dua masalah di deploy pertama, diperbaiki di commit `7b878e5` (push atas izin Lutfi):
1. Frontend: "The deployment could not be found on Vercel". `client/vercel.json` masih berisi alamat contoh
   → diisi alamat backend.
2. Backend: "Invalid export found in module server/src/app.js". Vercel otomatis mendeteksi project sebagai
   Express dan mengambil `src/app.js` sebagai titik masuk; hanya alamat `/` yang rusak, `/api/...` sudah jalan
   → `"framework": null` (= Other) di `server/vercel.json`.

Ikut di commit yang sama: batas Claude 90 detik & Gemini 45 detik (proxy Vercel menunggu maks 120 detik),
dan halaman Unggah menunggu status dari server bila sambungan terputus.

Bukti setelah deploy ulang: backend `/` → "EATS Dashboard API"; frontend `/api/sehat` → `"status":"baik"`
(lewat proxy); `/api/auth/saya` → 401 "Silakan masuk dulu."; login dengan akun palsu → "Email atau kata sandi
salah" (backend tersambung ke database); halaman login tampil di browser.
`MIGRASI_DATABASE_URL` sudah dihapus Lutfi dari env Vercel.

Belum teruji di Vercel: masuk dengan akun sungguhan, unggah & baca AI (termasuk jalur "menunggu hasil").

## 2026-11-05 — Hari pertama: dari folder kosong sampai alur lengkap

Lutfi meminta dashboard bergaya PLD untuk PT EATS: user mengunggah laporan (Excel/PDF/foto),
AI membaca (Claude, cadangan Gemini), user mengecek dan menyetujui, lalu angka masuk database.
Lutfi menyerahkan pengerjaan ("kerjain sebisa lu") dan meminta dihubungkan ke GitHub
`eatly-projects/EATS-DASHBOARD`.

### Keputusan Lutfi
- Rencana hasil AI **wajib dicek dan disetujui user** sebelum masuk database.
- Koneksi database & kunci AI **disalin dari backend Operations** (database bos yang sama).
- Data keuangan PT EATS lama di `public.stg_*` **tidak dipakai dan tidak disentuh**.
- Stack mengikuti kebiasaan Lutfi; tampilan mengikuti PLD Dashboard.

### Yang sudah jadi & terbukti
| Bagian | Bukti |
| :--- | :--- |
| Schema `finance` di database bos (migrasi 001, 002) | Jumlah tabel/view schema `public`, `pos`, `operation_v2`, `marketing` sama persis sebelum & sesudah migrasi (dicetak `npm run migrate`) |
| Peran khusus `finance_app` | `npm run uji:isolasi`: 13/13 lulus — bisa baca schema sendiri; ditolak membuat tabel, mengubah data master, membaca catatan migrasi, dan melihat schema lain |
| Rumus laba rugi | `npm run uji`: 7/7 lulus, termasuk angka asli PT EATS Januari dari berkas contoh |
| AI membaca Excel contoh | Claude Opus 5.5, ±60 detik, 16.314 token masuk / 8.123 token keluar (±US$0,23). 447 angka; cek silang **307 dari 315 total cocok** — sisanya lihat "Temuan" |
| AI membaca PDF | PDF uji buatan sendiri: 20 angka terbaca benar, ±45 detik (±US$0,15). Cek silang menangkap laba bersih PDF yang salah hitung |
| Setujui → simpan | 447 angka tersimpan; setuju dua kali ditolak (409) |
| Unggah ulang tidak dobel | Berkas sama dikenali; disetujui ulang → "447 sama, 0 diganti, 0 dihapus", isi database tetap 447 |
| Laporan | Oktober: laba bersih PT EATS −Rp2.856.384, Boomboo Rp6.215.500, EBITDA PT EATS −Rp429.384 — sama dengan sel Excel |

### Uji tampilan di browser (localhost:5178 + backend 4910)
| Halaman | Hasil |
| :--- | :--- |
| Masuk | Tampil, salah kata sandi → pesan server sebagai toast + teks |
| Ringkasan laba rugi | Kartu angka, perbandingan, tren, biaya, rincian per bulan — angka Okt & total Jan–Okt sama dengan Excel; lonjakan listrik Okt ditandai "perlu dicek" |
| Unggah (alur penuh lewat layar) | Pilih berkas → peringatan "berkas sama pernah diunggah" → animasi menunggu ±60 dtk → otomatis ke halaman cek |
| Cek dan setujui | Cek silang, catatan AI, pemberitahuan "akan MENGGANTI", tabel bisa diubah, dialog konfirmasi → simpan → kembali ke ringkasan |
| Pengguna | Daftar akun, tombol tambah |
| HP 390 px & tablet 820 px | 4 halaman × 2 lebar: tidak ada yang melebar ke samping (diukur dengan skrip); menu HP jadi laci |

Diperbaiki saat uji: (1) cek silang di layar belum menghitung total setahun → "40 tidak cocok", sekarang 8 sama dengan
server; (2) tabel riwayat melebar 27 px di tablet (teks pembaca layar lolos dari wadah gulir); (3) kartu tiga langkah
terlalu sempit di tablet; (4) pindah halaman tidak kembali ke atas; (5) catatan AI memuat kode teknis → instruksi diubah
ke bahasa awam; (6) AI hanya melihat 8 contoh rumus per baris sehingga tidak tahu rumus EBITDA berubah mulai April →
ringkasan kini menyertakan semua pola rumus yang berbeda.

### Temuan di berkas contoh `Rekap_PT-EATS_2026_DUMMY.xlsx`
1. **EBITDA tidak konsisten di dalam berkas.** Kolom PT EATS April–Oktober menambahkan bunga leasing
   (Rp120.000/bulan, `=L68+L70+…`), kolom gabungan & total konsolidasi tidak. Aplikasi memakai definisi
   baku (bunga ditambahkan), jadi cek silang menandai 8 total EBITDA gabungan. **Perlu keputusan Lutfi.**
2. **Listrik & air PT EATS Oktober Rp10.195.384** (bulan lain ±Rp700 ribu). Isinya rumus `=10637384−gas`.
   Mungkin salah ketik; aplikasi menampilkannya apa adanya.
3. Gaji Boomboo September–Oktober = jumlah baris rincian tersembunyi yang kosong → 0.
4. Ada blok tersembunyi tanpa judul (baris 59–66) yang tidak ikut total mana pun → diabaikan.

### Data yang sekarang ada di database
Data DUMMY dari berkas contoh (Jan–Okt 2026, PT EATS & Boomboo) sudah **disetujui oleh akun uji**
supaya dashboard bisa dilihat. Kalau mau dikosongkan sebelum dipakai sungguhan, lihat README → "Mengosongkan data uji".

### Akun
- `uji@eats.test` (admin, aktif) — akun uji buatan Claude. Kata sandinya di `akun-baru.local.txt` (tidak ikut ke GitHub).
  Dipakai Lutfi untuk masuk pertama kali, lalu sebaiknya dinonaktifkan setelah Lutfi membuat akunnya sendiri.
- `uji-tampilan@eats.test` (admin, **sudah dinonaktifkan**) — akun sekali pakai untuk uji browser.

### Isi unggahan saat ini
3 disetujui (Excel dummy, isinya sama), 1 dibatalkan (PDF uji), **1 menunggu dicek** (Excel dummy, sengaja
disisakan supaya Lutfi bisa mencoba tombol "Benar, simpan" sendiri — hasilnya "447 sama", data tidak berubah).

### Biaya AI terukur
Excel contoh ±18 rb token masuk + ±8 rb token keluar ≈ US$0,23 per baca (±60 detik). PDF satu halaman ≈ US$0,15 (±45 detik).
Selama pengerjaan hari ini: 4× baca Excel + 1× PDF ≈ US$1,1.

### Git
Remote `origin` = `https://github.com/eatly-projects/EATS-DASHBOARD.git`, cabang `main`. Commit pertama `f3cba2f`
di-push atas izin Lutfi (2026-11-05). 110 berkas; dicek tidak ada `.env`, kunci, kata sandi, atau berkas Excel/PDF.

### Belum / terbuka
- Pertanyaan untuk Lutfi: (1) definisi EBITDA, (2) arti "MGM" di biaya maklon, (3) siapa saja penggunanya & perannya.
- Belum di-deploy ke Vercel.
- Cadangan Gemini belum pernah terpakai (Claude selalu berhasil), jadi jalurnya belum teruji sungguhan.
- Foto (png/jpg) memakai jalur yang sama dengan PDF tetapi belum diuji dengan foto sungguhan.
