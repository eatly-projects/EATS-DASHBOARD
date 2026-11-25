# Rancangan: Kas & Bank (Tahap 2) dan Sambungan Operasional (pengganti sebagian Tahap 3)

> **Status: DISETUJUI Lutfi 2026-11-24**, beserta perbaikan dari tinjauan sesi Operasional ("rancangan Tahap 2
> dan 3 disetujui, dengan perbaikan dari sesi Operasional"). Disusun 2026-11-24.
> Tanda: **(keputusan Lutfi)** dari Lutfi, **(usulan Claude)** boleh diubah, **(perlu keputusan)** ditanyakan.
> **(saran Operasional, diminta Lutfi)**: saran sesi Claude Operasional. Lutfi membacanya di sesi itu dan meminta
> agar dimasukkan ("tolong atur sesuai dengan saran lu", 2026-11-24). Persetujuan akhir tetap lewat draf ini.
> Sebaiknya Bu Inge ikut membaca sekitar 10 menit sebelum Lutfi menyetujui, terutama 4.3 (unggah mutasi), 4.5
> (rekonsiliasi dan tutup buku), dan 5.3 (jurnal otomatis).
> Rencana induk ada di `docs/RENCANA-AKUNTANSI.md`. Kontrak data dari Operasional ada di
> `C:\projects\boomboo-operations\docs\INTEGRASI-EAATS.md`.

## 1. Kenapa

- Finance cukup mencatat di satu tempat, tapi **menginput sesedikit mungkin**. Arahan Lutfi 2026-11-20 berbunyi:
  "semi manual aja, ada yang dibantu AI, ada yang diupload sendiri, tapi mempermudah finance". **(keputusan Lutfi)**
- Penjualan Maklon, HORECA, Modern Trade, serta reseller dan toko offline diinput di aplikasi Operasional. EATS
  hanya membaca data itu, dan datanya mengalir satu arah dari Operasional ke EATS. **(keputusan Lutfi 2026-11-24,
  disampaikan lewat sesi Claude Operasional)**
- Penjualan itu tetap harus masuk Laba Rugi dan Neraca, jadi EATS membuat **jurnal otomatis** dari data
  Operasional. **(keputusan Lutfi 2026-11-24, lewat persetujuan rancangan ini)**
- Sebagian besar pembayaran lewat transfer bank (info finance lewat sesi Operasional). Rekening perusahaan saat
  ini hanya satu, yaitu BCA.

## 2. Tujuan, bukan tujuan, dan yang harus dihindari

**Tujuan:**
- Semua uang masuk dan keluar di bank dan kas tercatat, dengan saldo yang sama dengan rekening koran.
- Hampir semua transaksi bank berasal dari **berkas mutasi yang diunggah**. Finance hanya memeriksa dan menyetujui.
- Penjualan, retur, dan pembayaran dari Operasional masuk pembukuan otomatis, tanpa diketik ulang.
- Muncul laporan Arus Kas, halaman Umur Piutang, dan saldo kas & bank.

**Bukan tujuan:**
- Mengubah data Operasional dari EATS.
- Sambungan langsung ke bank. Fitur itu butuh kerja sama resmi dengan bank (lihat RENCANA §6).
- Membuat faktur penjualan untuk lini bisnis yang ada di Operasional.
- Hutang, pembelian, dan HPP. Semuanya menunggu kontrak §92 dari Operasional dan Tahap 5.

**Harus dihindari** (gagal walau secara teknis jalan):
- **Angka dobel.** Contohnya transfer klien tercatat sekali dari mutasi dan sekali dari Operasional, atau berkas
  mutasi yang sama diunggah dua kali.
- **AI menyimpan sendiri.** Semua usulan AI wajib dicek dan disetujui manusia. Ini sama dengan aturan Unggah
  Laporan (keputusan Lutfi 2026-11-05).
- **Angka bulan tertutup berubah diam-diam.**

## 3. Pendekatan yang dipertimbangkan

| | Cara | Dipilih? |
| :--- | :--- | :--- |
| A | **Unggah mutasi rekening.** AI mengusulkan akun per baris, finance menyetujui. Formulir manual untuk kas tunai dan koreksi | **Ya** (keputusan Lutfi 2026-11-24, lewat persetujuan rancangan ini) |
| B | Foto bukti per transaksi, lalu AI mengisi formulir | Tidak. Bisa ratusan foto sebulan, tidak ada cek saldo, dan transaksi tanpa bukti terlewat |
| C | Ketik manual seperti Accurate | Tidak. Justru ini yang mau dihindari |

Cara A unggul karena satu berkas memuat semua uang masuk dan keluar. Saldo berjalan di mutasi juga menjadi
cek silang otomatis: kalau AI salah membaca satu angka, saldonya tidak nyambung dan langsung ketahuan.

## Alur kerja Bu Inge (ringkasan rancangan ini)

**Setiap ada mutasi baru (misalnya seminggu sekali):**
1. Pembayaran klien dicatat dan dikonfirmasi di Operasional, seperti sekarang.
2. Unduh CSV mutasi BCA dari internet banking, lalu unggah di EATS, menu Rekening Koran.
3. Periksa tabel usulan:
   - baris yang cocok dengan pembayaran Operasional sudah ditandai otomatis;
   - baris biaya sudah diberi usulan akun dari aturan otomatis atau AI.
   Betulkan yang salah, lalu klik Setujui.
4. Baris "menunggu data Operasional" artinya pembayarannya belum dicatat di Operasional. Catat dulu di sana lewat
   tombol yang tersedia. Baris itu cocok sendiri setelah sinkron berikutnya.
5. Uang kas kecil diketik manual lewat Penerimaan atau Pembayaran. Pengecualiannya uang tunai untuk penjualan
   dan pembelian barang: itu dicatat di Operasional saja (4.2).

**Akhir bulan:**
1. Unggah mutasi sampai hari terakhir bulan itu.
2. Buka Rekonsiliasi Bank. Semua rekening harus hijau; kalau ada selisih, bereskan barisnya.
3. Periksa peringatan dari sinkron Operasional, kalau ada.
4. Tutup buku: kunci periode.
5. Kalau kelak muncul pemberitahuan "bulan X ditulis ulang" karena dokumen lama berubah di Operasional, baca
   selisihnya, lalu tandai sudah dibaca.

**Sekali saja:**
- Desember 2026: periksa pratinjau penjualan November–Desember dan bandingkan dengan Accurate.
- Go-live 1 Januari 2027:
  - isi saldo awal dari Neraca Accurate per 31 Desember 2026;
  - unggah laporan piutang per pelanggan dari Accurate untuk cek saldo awal per pelanggan;
  - periksa pemetaan rekening dan akun.

Penjualan, retur, dan pembayaran klien tidak pernah diketik di EATS.

## 4. Bagian A: Kas & Bank (Tahap 2)

Nama menu mengikuti Accurate: Penerimaan, Pembayaran, Transfer Bank, Rekening Koran, Rekonsiliasi Bank, dan
Histori Bank.

### 4.1 Rekening
- **Mulai dari satu rekening, yaitu BCA.** Rekening lain bisa ditambah kapan saja tanpa mengubah program. **(saran
  Operasional, diminta Lutfi)**
- **Kas kecil (tunai)** punya akun tersendiri, yaitu akun bawaan 110101 "Kas" (boleh diganti nama menjadi "Kas
  Kecil"), dan diisi manual lewat formulir 4.2. **(saran Operasional, diminta Lutfi)**
- Setiap rekening bank dan kas adalah akun bertipe Kas & Bank, sama seperti di Accurate. Akun bawaan 110102 "Bank"
  diganti nama oleh finance, misalnya menjadi "Bank BCA".
- Akun Kas & Bank diberi keterangan tambahan: nama bank dan 4 digit terakhir nomor rekening. Keterangan ini dipakai
  untuk mencocokkan dengan rekening tujuan dari Operasional.
- Satu rekening ditandai sebagai **rekening utama**. Pembayaran lama dari Operasional yang tidak punya rekening
  tujuan masuk ke rekening utama ini. **(usulan Claude, sudah disampaikan ke Operasional)**

### 4.2 Formulir manual
- **Penerimaan** (uang masuk), **Pembayaran** (uang keluar), dan **Transfer Bank** (pindah antar-rekening).
  Masing-masing punya nomor otomatis dan mengikuti aturan Penyetuju Transaksi.
- Pola layarnya sama dengan Jurnal Umum dan Pencatatan Beban (`FormDokumen`, `TabelRincian`):
  - kepala: rekening, tanggal, dan keterangan;
  - rincian: akun lawan, nilai, lini bisnis, dan catatan.
- Formulir ini dipakai untuk kas tunai (tidak punya mutasi) dan untuk koreksi.
- **Uang tunai untuk penjualan dan pembelian barang hanya dicatat di Operasional.** **(saran tinjauan Operasional)**
  - Contohnya pembayaran klien secara tunai, dan nanti, setelah §92 live, belanja barang tunai di Tambah Stok
    ("Sudah dibayar tunai").
  - Operasional sudah mengirim keduanya ke EATS. Kalau Bu Inge mengetiknya lagi di formulir ini, uangnya tercatat
    dua kali.
  - Karena itu formulir Penerimaan dan Pembayaran **menolak** akun lawan Piutang Usaha. Setelah §92 live, formulir
    juga menolak Utang Usaha dan Persediaan. Pesannya: "Transaksi ini dicatat di aplikasi Operasional", beserta
    tombol ke sana. **(usulan Claude: menolak, bukan sekadar memperingatkan)**
  - Aturan yang sama berlaku untuk usulan akun di Rekening Koran.
  - Koreksi yang memang perlu menyentuh akun itu tetap bisa lewat Jurnal Umum.

### 4.3 Rekening Koran: unggah mutasi (inti Tahap 2)

```
Finance memilih rekening (BCA), lalu mengunggah berkas mutasi:
  CSV dari internet banking (utama), Excel, atau PDF e-statement (cadangan)
  ↓ Excel/CSV: AI membaca susunan kolomnya, angkanya diambil program dari sel
    PDF: AI membaca angkanya, lalu program memeriksa saldo berjalan baris demi baris
  ↓ Cek otomatis:
    - saldo awal berkas = saldo rekening di EATS pada tanggal itu (kalau beda: peringatan)
    - saldo awal + masuk − keluar = saldo akhir berkas
    - baris yang sudah pernah diunggah dilewati (tidak dobel); cara mengenalinya ada di "Aturan tambahan"
  ↓ Setiap baris diberi usulan:
    1. Cocok dengan pembayaran klien dari Operasional → ditandai "sudah tercatat dari Operasional",
       tidak dibuat transaksi baru
    2. Cocok dengan transaksi EATS yang sudah ada (misalnya Pembayaran yang diketik manual) → ditautkan
    3. Pasangan transfer antar-rekening → usulan Transfer Bank
    4. Selain itu → usulan akun, lini bisnis, dan keterangan, dari "ingatan" (4.4) atau dari AI
  ↓ Finance memeriksa tabel, membetulkan yang salah, lalu klik Setujui
  ↓ Setiap baris jenis 4 menjadi Penerimaan atau Pembayaran bernomor dan masuk laporan
```

Aturan tambahan:
- Mutasi tidak harus sebulan penuh. Berkas mingguan juga boleh, dan baris yang tumpang tindih dilewati.
- **Cara mengenali baris yang sudah pernah diunggah** **(saran tinjauan Operasional)**:
  - Kuncinya tanggal, jumlah, keterangan, **dan saldo berjalan** dari berkas. Saldo berjalan itu unik per baris.
  - Dua transfer berjumlah sama pada hari yang sama itu wajar, misalnya dua CO dibayar terpisah. Karena saldonya
    berbeda, keduanya tetap masuk.
  - Kalau ada baris yang mirip dengan baris lama tapi saldonya berbeda, baris itu ditandai "mungkin dobel,
    periksa". Tidak dilewati diam-diam.
  - Kalau berkas tidak punya kolom saldo, semua baris yang mirip ditandai "mungkin dobel, periksa". **(usulan
    Claude)**
- Baris yang belum yakin boleh ditunda. Baris itu tetap tampil sebagai "belum dicatat" di Rekonsiliasi Bank.
- **Pencocokan dengan Operasional:**
  - Kuncinya jumlah, rekening tujuan, tanggal yang selisihnya paling banyak 3 hari, dan `referensi_transfer` kalau
    ada. **(saran Operasional, diminta Lutfi)**
  - Hanya pembayaran yang sudah dikonfirmasi Finance di Operasional yang dicocokkan.
  - Satu transfer boleh dipasangkan dengan beberapa pembayaran Operasional yang jumlahnya sama. Contohnya klien
    melunasi dua CO sekaligus. Operasional mencatatnya sebagai beberapa pembayaran, satu per dokumen. Di §93,
    pembayaran-pembayaran itu membawa `referensi_transfer` yang sama, dan nilai itu dipakai untuk mengelompokkannya.
    Kalau `referensi_transfer` kosong, EATS mencari gabungan pembayaran yang jumlahnya pas.
  - `jumlah` pembayaran di Operasional = uang yang masuk ke rekening = nilai tagihannya. Saat ini tidak ada klien
    yang memotong PPh 23, dan tidak ada potongan biaya transfer. **(jawaban Bu Inge lewat Lutfi, 2026-11-24)**
    Jadi pembayaran biasanya langsung sama dengan mutasi.
  - Kalau tetap ada selisih, finance memecah barisnya: bagian yang cocok plus satu baris selisih ke akun yang
    dipilih.
  - Kalau nanti ada klien yang memotong PPh 23, Operasional menambah kolomnya lewat migrasi kecil dan mengabari EATS.
    Jurnal pembayaran baru mendapat baris potongan saat itu.
- **Pembayaran ke supplier** untuk PO dan Tambah Stok dicatat Finance di Operasional (§92). Transfer keluar ke
  supplier diperlakukan sama dengan transfer masuk dari klien: dicocokkan, bukan dicatat ulang. Biaya di luar
  pembelian, seperti sewa, gaji, dan listrik, tetap dicatat di EATS lewat usulan baris jenis 4. **(usulan Claude)**
- **Transfer klien yang belum ada pembayarannya di Operasional tidak dijurnal di EATS.** **(saran Operasional,
  diminta Lutfi)**
  - Baris itu berstatus **"menunggu data Operasional"** dan menampilkan pengingat "Catat dulu pembayarannya di
    Operasional", beserta tombol ke aplikasi Operasional.
  - Setelah pembayaran dicatat dan dikonfirmasi di sana, sinkron berikutnya mencocokkan baris itu otomatis.
  - Dengan begitu Operasional tetap satu-satunya sumber data penjualan, dan tidak ada angka dobel.
  - Kalau ada dokumen yang sisa piutangnya sama dengan jumlah transfer, tombolnya langsung membuka dokumen itu.
    **(usulan Claude)**
  - Data klien (§93) sudah live; kuncinya dipasang saat Tahap 3 dimulai. Transfer ke supplier mengikuti aturan
    yang sama setelah §92 live.
- **Pencairan dana Shopee dan TikTok Shop** dicatat sebagai Penerimaan: Debit Bank, Kredit **Piutang
  Marketplace**. Ini sesuai RENCANA §3, dengan akun baru per marketplace. Kalau finance punya laporan pencairan
  dari Seller Centre, potongan marketplace ditambahkan sebagai baris rincian beban. Piutang Marketplace baru terisi
  dari sisi penjualan setelah sambungan Marketing Dashboard hidup (§5.4). Sebelum itu saldonya bisa minus, dan EATS
  memberi keterangan tentang hal itu. **(usulan Claude)**
- **Tanpa Penyetuju Transaksi.** Penerimaan dan Pembayaran yang dibuat dari Rekening Koran tidak melewati
  Penyetuju, karena uangnya sudah berpindah di bank dan klik Setujui dari finance bersifat final. Formulir manual
  (4.2) tetap mengikuti aturan Penyetuju. **(usulan Claude)**
  - Pengawasan untuk Bos sebagai gantinya: lihat kartu Dashboard di 4.6. **(saran tinjauan Operasional)**

### 4.4 Aturan otomatis (ingatan pilihan finance)
- AI hanya mengusulkan; Bu Inge yang memutuskan. **(saran Operasional, diminta Lutfi)**
- Setiap kali finance menyetujui baris dengan akun tertentu, EATS mengingat pola keterangannya. Contoh: "PLN" →
  Beban Listrik dan Air, lini bisnis kosong.
- Aturan bawaan sejak awal: keterangan memuat "PAXEL" → Beban Ongkos Kirim (akun bawaan 600011). Gunanya supaya
  ongkos kirim yang dibayar ke kurir berpasangan dengan Pendapatan Ongkir, dan Laba Rugi menampilkan ongkir bersih.
  **(saran tinjauan Operasional)**
- Aturan juga bisa menunjuk customer Operasional. Contoh: keterangan memuat "HANGRY" → pembayaran dari Hangry.
  Gunanya supaya pencocokan tepat kalau ada dua pembayaran berjumlah sama dari customer berbeda.
- Bulan berikutnya, baris yang cocok langsung diberi usulan dari ingatan itu tanpa bertanya ke AI. Hasilnya lebih
  cepat, lebih murah, dan konsisten.
- Finance bisa melihat, mengubah, dan menghapus daftar ingatan ini.

### 4.5 Rekonsiliasi Bank dan Histori Bank
- **Rekonsiliasi Bank** per rekening per tanggal menampilkan:
  - saldo menurut bank (dari mutasi terakhir) dan saldo menurut EATS;
  - baris mutasi yang belum dicatat;
  - transaksi EATS yang tidak ada di mutasi.
  Selisihnya harus bisa dijelaskan dari dua daftar itu.
- **Rekonsiliasi akhir bulan:** kalau saldo EATS sama dengan saldo rekening koran, rekening itu diberi tanda hijau.
  Kalau beda, selisihnya diuraikan per baris. **(saran Operasional, diminta Lutfi)**
- **Tutup buku bulanan** dilakukan Bu Inge lewat kunci periode di Preferensi, setelah semua rekening hijau.
  **(saran Operasional, diminta Lutfi)** Kalau masih ada rekening yang belum hijau, EATS menampilkan peringatan
  sebelum mengunci, tapi tidak menghalangi. **(usulan Claude)** Penguncian seperti itu dicatat di Log Aktivitas:
  siapa yang mengunci, dan rekening mana yang belum hijau. **(saran tinjauan Operasional)**
- **Histori Bank** sama dengan Histori Akun, khusus akun Kas & Bank. Isinya saldo berjalan dan tautan ke dokumen
  asal.

### 4.6 Laporan dan Dashboard
- **Arus Kas** (metode langsung): uang masuk dan keluar per kelompok akun lawan, per bulan, dengan pilihan per lini
  bisnis. Bisa diunduh Excel dan dicetak, seperti laporan Tahap 1.
- **Widget Dashboard:** saldo setiap rekening dan arus kas bulan berjalan.
- **Kartu pengawasan untuk Bos** **(saran tinjauan Operasional)**: per bulan, status rekonsiliasi per rekening (hijau
  atau merah) dan jumlah baris mutasi yang disetujui, beserta siapa yang menyetujuinya. Alasannya, Bu Inge
  mencatat sekaligus menyetujui sendiri, jadi Bos perlu bisa melihat hasilnya sekilas.

## 5. Bagian B: Sambungan Operasional (pengganti sebagian Tahap 3)

### 5.1 Penghubung
- Backend EATS memanggil API Operasional memakai dua env:
  - `OPERASIONAL_API_URL`: alamat backend Operasional, saat ini `https://boomboo-operations-ujz7.vercel.app`;
  - `OPERASIONAL_API_KEY`: isinya sama dengan env `EAATS_API_KEY` di backend Operasional.
  Lutfi yang membuat kunci dan memasangnya di kedua aplikasi. Kunci tidak pernah dikirim ke browser.
- Pesan galat ditampilkan dengan bahasa biasa:
  - 503: "Kunci sambungan ke Operasional belum dipasang";
  - 401: "Kunci sambungan ke Operasional salah";
  - Operasional tidak bisa dihubungi: tampilkan data terakhir beserta waktunya.
- Setiap jawaban Operasional membawa blok `cek`. Kalau ada cek yang gagal, angkanya tidak ditampilkan sebagai
  benar. Yang tampil adalah peringatan untuk dilaporkan ke Lutfi.

### 5.2 Umur Piutang (bisa dibangun sekarang, dari §89)
- Halaman baca-saja. Isinya ringkasan per pelanggan, rincian per dokumen, dan kelompok umur: belum jatuh tempo,
  telat 1–30, 31–60, lebih dari 60 hari, dan "Belum ada jatuh tempo".
- **CO tidak punya jatuh tempo dan tidak pernah dianggap telat** **(keputusan Lutfi atas permintaan Finance; §97 live
  2026-11-25, merge 1689399, membatalkan §96 "CO + 20 hari")**. Di §89 CO selalu `jatuh_tempo: null` dengan kelompok
  `tanpa_jatuh_tempo`, juga saat memakai `per_tanggal`. Invoice PO tetap punya jatuh tempo dan aturan telatnya.
- Ada saringan per lini bisnis dari `segmen`, yang sudah ada di §89.
- **Wajib:** tulisan "Data ini hanya bisa diubah di aplikasi Operasional", tombol "Buka di Operasional", dan
  keterangan "Diperbarui terakhir …" dari `generated_at`.
- Usulan letak menu: Penjualan › Umur Piutang. Hak aksesnya diatur lewat Akses Grup seperti menu lain.

### 5.3 Jurnal otomatis dari Operasional (§93 live sejak 2026-11-24)

**Data kejadian §93** disepakati dengan sesi Operasional dan disetujui Lutfi di sesi itu. Sudah live di production
(merge 3546e8d). Kontrak lengkapnya ada di `INTEGRASI-EAATS.md` bagian 8–10; kalau ringkasan ini berbeda, kontrak
itu yang berlaku.
- Alamat: `GET /api/eaats/kejadian?dari=YYYY-MM-DD&sampai=YYYY-MM-DD`, rentang paling panjang 366 hari, kunci sama.
- Isinya tagihan, retur, pembayaran, dan pengembalian. Pembelian menyusul di §92.
- Setiap kejadian membawa:
  - `id` tetap, `tanggal` (tanggal Jakarta), `diubah_at`, dan `batal_at`;
  - dokumen asal, `nomor`, dan `url_operasional`;
  - customer (id, kode, nama), `segmen`, dan `brands`.
- Tagihan: nilai barang, diskon, biaya tambahan dengan kode tetap (`ongkir` / `lainnya`), dan total.
- Pembayaran:
  - jumlah, metode (transfer atau tunai; kosong untuk data lama), dan rekening tujuan;
  - `referensi_transfer`, status (`menunggu` / `dikonfirmasi`), dan waktu dikonfirmasi;
  - tidak punya status batal, karena salah catat dihapus di Operasional.
- Pengembalian: jumlah, metode, rekening asal, dan `batal_at`. Retur: nilai, dokumen asal, dan `batal_at`.
- Satu jawaban memuat semua kejadian dalam rentang tanggal, termasuk yang batal, beserta dua blok cek:
  - `cek`: cek silang seluruh jawaban, harus selalu benar;
  - `cek_dokumen`: satu baris per dokumen piutang yang tersentuh rentang itu. Isinya hitungan tagihan − retur −
    (bayar − kembali) dari semua kejadiannya, dibandingkan dengan sisa piutang dokumen itu.
- `diubah_sejak` (tidak wajib) tidak menyaring daftar. Parameter ini menambah blok `perubahan`. Blok itu menyatakan
  apakah isi rentang berubah sejak waktu tersebut, termasuk data yang dihapus permanen atau dipindah tanggalnya.
- Angka rupiah selalu bilangan bulat.

**Kejadian yang dijurnal** **(usulan Claude)**:
- Tagihan, retur, dan pengembalian yang tidak batal. Yang batal tidak dijurnal. Kalau batalnya terjadi setelah
  bulannya dikunci, bulan itu ditulis ulang menurut aturan di bawah.
- Hanya pembayaran berstatus `dikonfirmasi`. Tanggal jurnalnya = `tanggal` (tanggal uang diterima), supaya sama
  dengan tanggal di mutasi bank. Kalau pembayaran baru dikonfirmasi setelah bulannya dikunci, bulan itu ikut ditulis
  ulang.
- Pembayaran atas dokumen yang dibatalkan tetap dijurnal, karena uangnya memang sudah masuk bank. Akibatnya piutang
  customer itu minus. EATS menampilkannya sebagai peringatan untuk finance sampai dibereskan di Operasional.
  - Keadaan Operasional per 2026-11-24 (dicek sesi Operasional di kodenya): CO/PO yang sudah dibayar boleh
    dibatalkan, dan pembayarannya dibiarkan tercatat. Pengembalian untuk dokumen batal masih ditolak, dan tidak ada
    fitur memindah pembayaran ke dokumen lain.
  - **§94 live 2026-11-24** (merge 2e54503, migrasi 027; kontrak bagian 9.8, dengan perubahan di 9.4, 9.5, 9.7,
    dan 10):
    - Pengembalian sekarang boleh untuk dokumen batal. Batasnya pembayaran dikonfirmasi dikurangi pengembalian, dan
      rekening atau Tunai wajib dipilih.
    - Metode baru `pindah_dokumen`. Pengembalian di dokumen A dan pembayaran di dokumen B dibuat bersamaan, tanpa
      rekening (`rekening_*: null`), saling menunjuk lewat `pasangan_id`, dengan customer dan tanggal yang sama.
    - Membatalkan pasangan berarti pengembalian di A diberi `batal_at` dan pembayaran di B dihapus. Pemindahan yang
      dibatalkan tidak dihitung di tanggal mana pun.
    - Cek baru "pindah dokumen" ada di blok `cek`.
  - **Pembukuan di EATS:** pasangan `pindah_dokumen` dijurnal sebagai perpindahan piutang, debit Piutang Usaha
    (dokumen A) dan kredit Piutang Usaha (dokumen B), tanpa baris Kas & Bank. Akibatnya tidak muncul di Rekonsiliasi
    Bank atau Arus Kas. **(usulan Claude, sesuai usulan penanda yang diterima Lutfi lewat sesi Operasional)**

**Tanggal penjualan** = tanggal dokumen: tanggal CO, atau tanggal invoice PO. CO yang dicetak sebagai invoice
memang berfungsi sebagai fakturnya, jadi caranya sama dengan Accurate, yang mencatat penjualan pada tanggal faktur.
**(usulan Claude)**

**Data sebelum buku dimulai (sebelum 1 Januari 2027):** **(usulan Claude)**
- Dokumen bertanggal 2026 tidak dibuatkan jurnal tagihan, karena piutangnya sudah masuk saldo awal Piutang Usaha
  dari Neraca Accurate.
- Pembayaran, retur, dan pengembalian atas dokumen 2026 yang terjadi di 2027 tetap dijurnal.
- Kejadian bertanggal 2026 tidak disimpan ke Buku Besar. Kejadian itu hanya dipakai di pratinjau uji coba (di
  bawah).
- **Data Operasional 2026 masih tahap coba-coba.** Mulai 1 Januari 2027 Operasional dipakai penuh **(keputusan
  Lutfi, lewat sesi Operasional 2026-11-24)**. Dokumen tertua saat ini bertanggal 28 Oktober 2026.
  - Konsekuensinya, sebelum go-live semua pesanan 2026 yang belum lunas harus sudah ada di Operasional, dan data
    percobaan dirapikan. Tanpa itu, pembayaran di Januari untuk dokumen 2026 tidak punya dokumen asal. Sesi
    Operasional yang mengingatkan Lutfi soal ini.
- **Cek saldo awal piutang, sekali saat go-live** **(saran Operasional, diminta Lutfi)**:
  - Saldo awal Piutang Usaha per 31 Desember 2026 diambil dari Neraca Accurate.
  - Angka pembandingnya dari `/api/eaats/piutang?per_tanggal=2026-12-31`.
  - Selisihnya ditampilkan **per pelanggan**, untuk dibereskan Bu Inge.
  - EATS tidak punya data piutang Accurate per pelanggan. Jadi Bu Inge mengunggah laporan piutang per pelanggan dari
    Accurate (Excel) per 31 Desember 2026, dan pembacanya memakai ulang pembaca unggahan yang sudah ada. Pelanggan
    dipasangkan menurut nama. Nama yang tidak bisa dipasangkan ditampilkan terpisah, supaya Bu Inge memasangkannya
    sendiri. **(usulan Claude)**
- **Uji coba Desember 2026** **(saran Operasional, diminta Lutfi; caranya usulan Claude)**:
  - Sinkron untuk kejadian November–Desember 2026 dijalankan sebagai **pratinjau**. Hitungannya sama persis dengan
    sinkron sungguhan, hasilnya ditampilkan sebagai laporan, tapi **tidak disimpan ke Buku Besar**.
  - Alasannya, buku EATS mulai 1 Januari 2027 dan saldo awalnya per 31 Desember 2026 sudah memuat penjualan
    November–Desember dari Accurate. Kalau jurnal percobaan ikut disimpan, angkanya dobel. Program juga menolak
    transaksi sebelum awal periode.
  - Pratinjau dibandingkan dengan blok `cek` dan `cek_dokumen` Operasional, dan oleh Bu Inge dengan penjualan
    November–Desember di Accurate, per bulan dan per lini bisnis. Karena data 2026 masih coba-coba, selisih wajar
    terjadi. Gunanya untuk menemukan salah pemetaan akun sebelum go-live.
  - Penguncian periode baru berlaku mulai 1 Januari 2027.
- Cek silang per dokumen (di bawah) hanya untuk dokumen 2027 ke atas.

Pasangan jurnalnya (lini bisnis = `segmen`; `null` = "Tanpa lini bisnis" **(keputusan Lutfi)**):

| Kejadian | Debit | Kredit |
| :--- | :--- | :--- |
| Tagihan (CO / invoice PO) | Piutang Usaha (total) dan Diskon Penjualan (diskon, kalau ada) | Penjualan (nilai barang), Pendapatan Ongkir (biaya `ongkir`), dan Pendapatan Lain-lain (biaya `lainnya`) |
| Retur | Retur Penjualan | Piutang Usaha |
| Pembayaran klien yang sudah dikonfirmasi | Bank (rekening tujuan) atau Kas (tunai) | Piutang Usaha |
| Pengembalian uang ke klien | Piutang Usaha | Bank atau Kas (rekening asal) |

Aturannya:
- **Akun sesederhana mungkin** **(saran Operasional, diminta Lutfi)**:
  - Penjualan dipisah per lini bisnis lewat `segmen`, bukan lewat akun terpisah.
  - Ongkos kirim yang ditagihkan ke klien masuk akun baru **Pendapatan Ongkir**, di bawah Pendapatan Operasional.
  - Perusahaan belum PKP, jadi tidak ada PPN.
  - Biaya tambahan `lainnya` masuk Pendapatan Lain-lain (akun bawaan 700002). **(usulan Claude)**
  - Diskon masuk Diskon Penjualan (akun bawaan 400004). Kalau finance ingin lebih sederhana, diskon bisa dipetakan
    ke Penjualan, sehingga penjualan tercatat bersih. **(usulan Claude)**
- **Pemetaan akun** diatur di satu halaman pengaturan, dengan bawaan seperti tabel di atas.
- **Pemetaan rekening:** setiap rekening Operasional (`rekening_tujuan.id` / `rekening_asal.id`) dipetakan ke satu
  akun Kas & Bank EATS. Rekening di Operasional tidak bisa dihapus, hanya dinonaktifkan, jadi pemetaannya tetap
  berlaku untuk data lama. Tunai masuk Kas. Pembayaran lama tanpa rekening masuk rekening utama EATS.
- **Tulis ulang utuh per bulan.** Jurnal otomatis sebulan dihapus lalu ditulis ulang dari data terbaru, dalam satu
  transaksi database. Alasannya, Operasional bisa menghapus data permanen. Cara ini tidak bisa dobel.
- **Bulan yang sudah dikunci juga ditulis ulang** **(keputusan Lutfi 2026-11-24)**. Setiap kali angkanya berubah:
  - perubahan dicatat di Log Aktivitas: bulan, dokumen, angka sebelum dan sesudah;
  - finance mendapat pemberitahuan berisi selisihnya.
  Jurnal lain yang diketik manual di bulan terkunci tetap tidak bisa diubah.
- **Bentuk pemberitahuan:** pita peringatan di Dashboard dan lencana jumlah di sidebar, memakai pola lencana
  Persetujuan yang sudah ada. Pita itu tampil sampai seseorang menandainya "sudah dibaca". Tanpa email atau
  WhatsApp, supaya tidak perlu layanan tambahan. **(usulan Claude)**
- Jurnal otomatis **tidak bisa diubah atau dihapus di EATS**. Layarnya menampilkan tulisan "Data ini hanya bisa
  diubah di aplikasi Operasional" dan tombol ke dokumennya.
- **Cek silang setelah sinkron:**
  - Untuk setiap dokumen di `cek_dokumen`, EATS menghitung tagihan − retur − (bayar − kembali) dari jurnalnya
    sendiri. Hasilnya harus sama dengan sisa piutang dokumen itu menurut Operasional. Kalau beda, muncul peringatan.
  - Kalau blok `cek` dari Operasional ada yang gagal, sinkron dihentikan dan jurnal lama dibiarkan. Yang tampil
    adalah peringatan untuk dilaporkan ke Lutfi. **(usulan Claude)**
- **Kapan sinkron:** tombol "Sinkronkan sekarang" ditambah sinkron otomatis setiap malam. **(usulan Claude)**
  - Setiap sinkron meminta semua kejadian sejak 1 Januari 2027, dipecah per 366 hari kalau perlu, dengan
    `diubah_sejak` = waktu sinkron terakhir.
  - Kalau `perubahan` menyatakan tidak ada yang berubah, sinkron selesai tanpa menulis apa pun.
  - Kalau ada, EATS menghitung jurnal setiap bulan dari jawaban itu dan hanya menulis ulang bulan yang hasilnya
    berbeda. Hanya bulan itu yang masuk Log Aktivitas dan pemberitahuan.
  - Mekanisme jadwalnya di Vercel diputuskan builder (lihat §7).
- Jurnal otomatis tidak melewati Penyetuju Transaksi, karena sudah diputuskan di Operasional.

### 5.4 Yang menyusul
- **Hutang dan pembelian** (§92 Operasional): pola sama dengan piutang dan jurnal otomatis. Dirancang setelah
  kontraknya live.
  - Status 2026-11-24: **§92 sudah live** (merge cc121f6, migrasi 026). Kontraknya ada di bagian 11–12
    `INTEGRASI-EAATS.md`. Isinya:
    - `GET /api/eaats/hutang`;
    - kejadian pembelian di dalam `/api/eaats/kejadian`: `penerimaan_barang`, `invoice_supplier`,
      `pembayaran_supplier`, dan `nilai_persediaan` per barang per stok opname;
    - cek silang berawalan `pembelian:`, dan kode supplier `S-0001`.
  - Belanja tunai di Tambah Stok ("Sudah dibayar tunai") tidak masuk tagihan, tapi tetap dikirim sebagai kejadian.
    Ini sesuai aturan tunai di 4.2.
  - Bedanya dengan klien: pembayaran ke supplier punya status **batal** beserta alasannya, sedangkan pembayaran
    klien yang salah dihapus permanen. Jurnal otomatis pembelian harus mengabaikan pembayaran supplier yang batal.
- **HPP** (Tahap 5): Operasional mengirim nilai persediaan per barang per stok opname dan nilai Tambah Stok. Metode
  HPP final masih menunggu keputusan Lutfi.
- **Penjualan marketplace** dari Marketing Dashboard (keputusan Lutfi 2026-11-19). Butuh izin baca schema
  `marketing` untuk peran `finance_app`, dan izin ini hanya dengan persetujuan Lutfi. Pesanan marketplace dilarang
  dibuat sebagai CO di Operasional **(keputusan Lutfi 2026-11-24)**, jadi tidak bisa dobel dengan bagian B.

## 6. Urutan pengerjaan (usulan Claude)

1. Bagian A: 4.1 Rekening, 4.2 Formulir manual, 4.5 Histori Bank, dan 4.6 Arus Kas. Semua bisa jalan tanpa
   Operasional.
2. Bagian A: 4.3 Rekening Koran, 4.4 Aturan otomatis, dan Rekonsiliasi Bank. Transfer klien sementara berstatus
   "menunggu data Operasional".
3. Bagian B: 5.1 Penghubung dan 5.2 Umur Piutang. Kunci dipasang di langkah ini, dan sesi Operasional memberi Lutfi
   langkah pemasangannya.
4. Bagian B: 5.3 Jurnal otomatis dan pencocokan mutasi dengan pembayaran Operasional, termasuk pratinjau
   November–Desember 2026 sebagai uji coba Desember.
5. Go-live 1 Januari 2027: saldo awal dari Accurate, cek saldo awal piutang per pelanggan, dan penguncian periode
   mulai berlaku.
6. Hutang dari §92, dengan pola yang sama, setelah kontraknya live.
7. Sambungan penjualan marketplace dari Marketing Dashboard, setelah Lutfi mengizinkan akses baca schema
   `marketing`.

Target: langkah 1–4 selesai dalam Desember 2026 supaya uji cobanya sempat jalan. Langkah 6–7 tetap ditargetkan
sebelum 1 Januari 2027.

Setiap langkah dirinci dulu dalam rencana kerja, diuji, dicek di HP, tablet, dan desktop, lalu di-push hanya
dengan izin Lutfi.

## 7. Diserahkan ke builder
- Struktur tabel. Usulan: rekening koran dan barisnya, ingatan, pemetaan akun Operasional, catatan sinkron, dan tipe
  jurnal baru: `penerimaan`, `pembayaran`, `transfer_bank`, `operasional`.
- Cara membaca berkas mutasi BCA. Pakai ulang `features/unggahan/ai.js`: urutan Claude lalu Gemini, mode Excel yang
  mengambil angka dari sel, dan mode PDF.
- Toleransi tanggal saat mencocokkan.
- Mekanisme sinkron terjadwal di Vercel.
- Tampilan, mengikuti pola Tahap 1: daftar dan formulir, kartu di HP, dan tanpa singkatan.

## 8. Ditanyakan ke finance setelah kembali dari cuti
- Contoh berkas CSV mutasi BCA dari internet banking. Sebelum ada contoh asli, pembaca diuji dengan berkas contoh
  buatan.
- Ada rekening lain atau dompet digital? Untuk awal cukup BCA dan kas kecil.
- Bisakah Accurate mengekspor laporan piutang per pelanggan per 31 Desember 2026 ke Excel? Laporan itu dipakai
  untuk cek saldo awal per pelanggan.
- Apakah saldo Piutang Usaha di Accurate per 31 Desember 2026 sama dengan sisa piutang di Operasional?
- Siapa yang mengunduh laporan pencairan Shopee dan TikTok Shop tiap bulan? (RENCANA §7 nomor 3)

## 9. Pertanyaan yang sudah dijawab (dari pemeriksaan rancangan)
- Isi data kejadian §93: disepakati dengan sesi Operasional (5.3).
- Tanggal penjualan, data sebelum 2027, pembayaran supplier, pencairan marketplace, Penyetuju untuk Rekening
  Koran, dan bentuk pemberitahuan: diputuskan Claude (ditandai **usulan Claude** di atas). Lutfi boleh mengubahnya.
- Cara Operasional mencatat pembayaran yang nilainya beda dengan tagihan: dijawab sesi Operasional 2026-11-24 dan
  sudah dimasukkan ke 4.3.
- Potongan PPh 23 dan biaya transfer: tidak ada saat ini (jawaban Bu Inge lewat Lutfi, 2026-11-24). Form bayar di
  Operasional tidak diubah.
- §91 sudah live. Pembayaran dari pengaju baru dihitung setelah dikonfirmasi Finance.
- Saran sesi Operasional untuk Tahap 2 dan 3, yang diminta Lutfi dimasukkan pada 2026-11-24, sudah dimasukkan
  (bertanda **saran Operasional, diminta Lutfi**). Yang terjawab: format mutasi (CSV utama, PDF cadangan), akun
  ongkos kirim (Pendapatan Ongkir), toleransi tanggal (±3 hari), dan sejak kapan data Operasional lengkap (1
  Januari 2027). Satu hal dilaksanakan dengan cara lain: uji coba Desember dijalankan sebagai pratinjau yang tidak
  disimpan, bukan jurnal sungguhan (alasannya di 5.3).
- Tinjauan sesi Operasional atas draf ini (2026-11-24) menghasilkan 5 temuan, dan semuanya sudah dimasukkan
  (bertanda **saran tinjauan Operasional**): uang tunai hanya dicatat di Operasional (4.2), cara mengenali baris
  dobel (4.3), Beban Ongkos Kirim (4.4), pengawasan untuk Bos (4.5, 4.6), dan status §92 (5.4). Untuk butir
  lainnya, sesi itu menyatakan setuju.
- §93 sudah live 2026-11-24 (merge 3546e8d, migrasi 025). Ringkasan di 5.3 diperbarui dari kontraknya. Kunci
  belum dipasang, jadi endpoint masih membalas 503.
