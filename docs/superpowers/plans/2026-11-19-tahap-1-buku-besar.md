# Tahap 1: Buku Besar dan Laporan Inti — Rencana Kerja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finance bisa membuat akun perkiraan, mengisi saldo awal, mencatat Jurnal Umum dan Pencatatan Beban per lini
bisnis, meminta persetujuan transaksi, lalu melihat Neraca, Laba Rugi (juga per lini bisnis), Neraca Percobaan,
Buku Besar, dan Jurnal, termasuk ekspor Excel dan PDF.

**Architecture:**
- **Tabel inti:**
  - `akun`, `departemen`, `jurnal`, dan `jurnal_baris`;
  - `penyetuju_transaksi` dan `penyetuju_transaksi_pengguna`.
- **Satu sumber angka.** Setiap dokumen (saldo awal, jurnal umum, pencatatan beban) adalah baris `jurnal` beserta
  rinciannya. Semua laporan dihitung dari `jurnal_baris` milik jurnal berstatus `disetujui`.
- **Penjaga seimbang di database.** Trigger yang ditunda sampai commit menolak jurnal yang tidak seimbang.
- **Server:** satu modul jurnal bersama dipakai Jurnal Umum dan Pencatatan Beban, plus satu modul laporan.
- **Client:** pola `KerangkaDaftarForm`, `DaftarData`, dan `FormDokumen` dari Tahap 0 dan tampilan sidebar.

**Tech Stack:** Express 5, pg, zod, exceljs (server); React 18, TanStack Query, Tailwind/shadcn (client); node:test
dengan schema `finance_uji`.

**Spec:**
- `docs/RENCANA-AKUNTANSI.md`: §3 (lini bisnis = Departemen), §5 (prinsip), §6 baris Tahap 1, §7 no. 7–9, §8.
- Acuan perilaku Accurate dirangkum di bagian "Acuan Accurate" di bawah. Sumbernya help.accurate.id, dibaca
  2026-11-19.

## Global Constraints

- **Git:** jangan commit atau push tanpa izin Lutfi; izin berlaku per tindakan. Kerjakan di branch `tahap-1-buku-besar`.
- **Migrasi:** `004` dipasang ke `finance_uji` saja. Migrasi ke `finance` hanya dengan izin Lutfi.
- **Database bos:** schema lain tidak boleh disentuh, dan Boomboo Operations tidak diubah.
- **Tes:**
  - hanya menyentuh data buatannya sendiri: akun berkode awalan `UJI`, departemen dan grup bernama awalan `UJI `, dan
    jurnal buatan pengguna `@uji.test`;
  - `bersihkanDataUji` diperluas dengan urutan yang menghormati foreign key.
- **Rahasia:** jangan mencetak isi `.env`, kata sandi, atau hash.
- **Port:** server 4910 dan client 5178. Jangan pakai port 4000 atau 5173. Matikan proses per PID.
- **Teks di layar:**
  - bahasa Indonesia, tanpa singkatan;
  - rupiah ditulis penuh ("Rp 1.250.000"), dan pecahan sen tampil hanya kalau ada;
  - kosong ditulis "—", bukan 0;
  - rentang tanggal ditulis eksplisit;
  - tidak ada ID mentah.
- **Uang:**
  - kolom `numeric(18,2)`;
  - API mengirim dan menerima uang sebagai **teks desimal** (`"1250000.00"`), bukan float;
  - penjumlahan dilakukan di SQL, atau di JS dengan bilangan bulat sen.
- **Tampilan:**
  - mengikuti `docs/superpowers/specs/2026-11-19-tampilan-sidebar-design.md`: cara kerja Accurate, tampilan modern,
    setiap tombol bertulisan;
  - skeleton saat memuat, toast setiap simpan;
  - dicek di 1440, 820, dan 390 px.
- **Tanggal transaksi** wajib lolos `pastikanTanggalTerbuka`. Saldo awal pengecualiannya: tanggalnya tetap sehari
  sebelum awal periode, tetapi tetap ditolak kalau periode itu sudah dikunci.

## Acuan Accurate (ringkasan riset 2026-11-19)

- **Tipe Akun** (nama persis Accurate): Kas & Bank, Piutang Usaha, Persediaan, Aset Lancar Lainnya, Aset Tetap,
  Akumulasi Penyusutan, Aset Lainnya, Utang Usaha, Liabilitas Jangka Pendek, Liabilitas Jangka Panjang, Modal,
  Pendapatan, Beban Pokok Penjualan, Beban, Pendapatan Lainnya, Beban Lainnya.
  - Saldo normal **debit**: aset dan beban.
  - Saldo normal **kredit**: Akumulasi Penyusutan, liabilitas, Modal, dan pendapatan.
- **Formulir akun:**
  - Informasi Umum: Tipe Akun, Sub Akun dari, Kode Perkiraan, Nama.
  - Saldo: Saldo Awal Nilai, per tanggal.
  - Lain-lain: Catatan, Non Aktif.
  - Akun yang sudah dipakai tidak bisa diganti tipenya.
  - Daftar akun: Kode, Nama, Tipe Akun, Saldo. Akun anak menjorok, dan saldo induk adalah jumlah anaknya.
- **Saldo awal:**
  - Membuat jurnal "Saldo Awal akun X" yang lawannya akun **Ekuitas Saldo Awal** (300001, Modal). Akun lawan diatur di
    Preferensi.
  - Jurnal saldo awal tidak bisa dihapus langsung. Mengisi nilai 0 di formulir akun menghapusnya.
- **Jurnal Umum:**
  - Kepala: Tanggal, Nomor (otomatis dari Penomoran), Keterangan.
  - Rincian: Akun, Debit, Kredit, Departemen, Memo.
  - Total debit harus sama dengan total kredit. Riwayat perubahan dicatat di Log Aktivitas.
- **Pencatatan Beban** (akrual, bukan bayar tunai):
  - Kepala: **Hutang Beban** (akun Liabilitas Jangka Pendek), Tanggal, Nomor, Jatuh Tempo, Catatan.
  - Rincian: Akun beban, Nilai, Departemen, Catatan.
  - Jurnalnya: debit setiap akun beban, kredit Hutang Beban. Pembayarannya nanti lewat Kas & Bank (Tahap 2).
- **Penyetuju Transaksi** (Pengaturan):
  - Aturan per tipe transaksi: syarat nilai minimal, penyetuju (satu atau lebih pengguna), dan "salah satu penyetuju
    setuju".
  - Transaksi yang memenuhi aturan berstatus **Diajukan** tanpa nomor.
  - Penyetuju memutuskan di Perusahaan › **Persetujuan**: Setujui atau Tolak.
  - Setelah disetujui, transaksi mendapat nomor dan masuk laporan.
- **Departemen:**
  - Formulir: Nama, Keterangan, Sub Departemen dari, Non Aktif. Tidak ada kode.
  - Laporan Laba/Rugi per departemen: satu kolom per departemen, ditambah Total.
- **Histori Akun:**
  - Pilih satu akun dan rentang tanggal.
  - Kolom: Tanggal, Nomor Sumber, Tipe Transaksi, Keterangan, Debit, Kredit, Saldo.
  - Baris pertama "Saldo Awal", baris terakhir Total.
- **Laporan:**
  - **Laba/Rugi (Standar):** Pendapatan, Beban Pokok Penjualan, LABA KOTOR, Beban Operasional, PENDAPATAN OPERASIONAL,
    Pendapatan dan Beban Non Operasional, LABA BERSIH.
  - **Neraca (Standar):**
    - ASET: Aset Lancar (Kas dan Setara Kas, Piutang Usaha, Persediaan, Aset Lancar Lainnya), Aset Tidak Lancar
      (Aset Tetap, Akumulasi Penyusutan), Aset Lainnya.
    - LIABILITAS: Jangka Pendek (Utang Usaha, Liabilitas Jangka Pendek Lainnya), Jangka Panjang.
    - EKUITAS: akun Modal, Laba Ditahan, dan **Laba Tahun Ini**. Laba Tahun Ini dihitung, bukan akun.
  - **Neraca Percobaan**, **Rincian Buku Besar**, dan **Keseluruhan Jurnal**.
  - Setiap laporan bisa diekspor ke Excel dan PDF.

## Keputusan Claude (mengikuti Accurate; dicatat juga di ledger)

1. **Daftar akun bawaan** disusun dengan pola kode Accurate: induk 4 digit, anak 6 digit, dan nama Accurate yang sudah
   terkonfirmasi. Daftar lengkap Accurate tidak diterbitkan, jadi finance bisa menambah, mengubah, atau menonaktifkan
   akun.
2. **Akun induk tidak bisa dipakai di transaksi**, hanya akun detail. Akun yang sudah dipakai tidak bisa dijadikan
   induk.
3. **Tanggal saldo awal** dipatok sehari sebelum awal periode akuntansi (31 Desember 2026), sesuai keputusan "saldo
   awal dari Neraca Accurate per 31 Desember 2026".
4. **Saldo awal boleh untuk semua tipe akun** selama buku pembantu (pelanggan, pemasok, barang, aset) belum ada. Saat
   tahap itu dibangun, saldo awal tipe terkait pindah ke sana.
5. **Persetujuan:** hanya syarat "salah satu penyetuju setuju" dan nilai minimal. "Minimal dua" dan "semua harus
   setuju" ditunda. Nomor diberikan saat disetujui. Mengubah transaksi yang sudah disetujui menilai ulang aturannya;
   kalau aturannya kena, statusnya kembali Diajukan dengan nomor tetap.
6. **Tahun buku** adalah Januari–Desember.
   - Laba Tahun Ini = laba rugi dari 1 Januari tahun laporan (atau awal periode kalau lebih belakang) sampai tanggal
     Neraca.
   - Laba Ditahan = saldo akun Laba Ditahan ditambah laba rugi semua tahun sebelumnya, karena belum ada jurnal tutup
     buku.
7. **Laba/Rugi belum memisahkan Pajak Penghasilan**, karena belum ada penanda akun pajak. LABA BERSIH ditampilkan
   langsung.
8. **Ditunda ke tahap berikut**, dicatat di PROGRESS:
   - lampiran berkas, impor Excel, Hapus Massal, Proyek, Pelanggan/Pemasok di baris jurnal, mata uang asing;
   - widget Dashboard dan sambungan Ringkasan lama. Keduanya butuh pasangan akun→pos dan lini→unit dari finance.
9. **Log Aktivitas Jurnal** memakai Log Aktivitas yang sudah ada (filter menu Jurnal Umum / Pencatatan Beban), bukan
   menu terpisah.
10. **Daftar Laporan:** satu menu "Laporan Keuangan" berisi pilihan laporan, seperti halaman Daftar Laporan Accurate.
    Histori Akun menjadi menu sendiri di Buku Besar.

## Review Focus

1. **Dua orang menyimpan transaksi bersamaan** dengan format penomoran sama tetapi penomoran berbeda. Nomornya tidak
   boleh kembar; ini syarat §8 dan dites di Task 4.
2. **Mengubah atau menghapus jurnal yang tanggalnya masuk periode terkunci**, termasuk memindahkan tanggal dari
   periode terbuka ke periode terkunci. Harus ditolak (Task 5).
3. **Pembuat transaksi bukan penyetuju lalu mencoba menyetujui sendiri** lewat API. Harus ditolak (Task 7).
4. **Angka sen dan pembulatan:** 0,10 + 0,20 harus tepat 0,30, dan jurnal 3 baris × 33.333,33 lawan 99.999,99 harus
   seimbang. Tidak boleh ada float (Task 5).
5. **Neraca selalu seimbang** dan Laba Rugi sama dengan perubahan ekuitas, juga saat ada saldo awal, beban, dan
   jurnal lintas tahun (Task 9).

---

### Task 1: Migrasi 004 — tabel Buku Besar dan akun bawaan

**Files:**
- Create: `server/migrations/004_buku_besar.sql`
- Modify: `server/test/bantu.js` (`bersihkanDataUji`), `server/scripts/izin-skema-uji.js` (bila perlu, untuk tabel baru)
- Test: `server/test/migrasi-004.test.js`

**Interfaces:**
- Produces, as tables:
  - `departemen` (id, nama, keterangan, induk_id, nonaktif, dibuat_at, diubah_at; nama unik tanpa beda huruf besar/kecil);
  - `akun` (id, kode unik, nama, tipe ∈ 16 kode, induk_id, catatan, nonaktif, dibuat_at, diubah_at);
  - `jurnal` (id, tipe ∈ jurnal_umum|pencatatan_beban|saldo_awal, nomor nullable, tanggal, keterangan, status ∈
    disetujui|diajukan|ditolak, akun_lawan_id, jatuh_tempo, penomoran_id, total, dibuat_oleh, dibuat_at, diubah_oleh,
    diubah_at, diputuskan_oleh, diputuskan_at, alasan_keputusan);
  - `jurnal_baris` (id, jurnal_id on delete cascade, urutan, akun_id, debit, kredit, departemen_id, catatan, otomatis);
  - `penyetuju_transaksi` (tipe_transaksi pk, aktif, nilai_minimal, diubah_oleh, diubah_at);
  - `penyetuju_transaksi_pengguna` (tipe_transaksi, pengguna_id).
- Produces, as columns: `perusahaan.akun_ekuitas_saldo_awal_id` and `perusahaan.akun_laba_ditahan_id`.
- Kode tipe: `kas_bank, piutang_usaha, persediaan, aset_lancar_lainnya, aset_tetap, akumulasi_penyusutan,
  aset_lainnya, utang_usaha, liabilitas_jangka_pendek, liabilitas_jangka_panjang, modal, pendapatan,
  beban_pokok_penjualan, beban, pendapatan_lainnya, beban_lainnya`.
- **Constraints:**
  - unique `jurnal(tipe, nomor) where nomor is not null`;
  - unique `jurnal(akun_lawan_id) where tipe = 'saldo_awal'`;
  - check: tepat satu dari debit/kredit > 0;
  - constraint trigger `deferrable initially deferred` pada `jurnal_baris` yang menolak jurnal dengan
    `sum(debit) <> sum(kredit)` atau tanpa baris.
- **Seed:**
  - 4 departemen: Maklon, Retail, HORECA, Modern Trade;
  - penomoran "Pencatatan Beban" `PB.{tahun}.{bulan}.{counter}`, 5 digit, reset bulanan, bawaan;
  - akun bawaan, dengan 300001 dan 300002 dipasang ke kolom `perusahaan`.
- **Daftar akun bawaan** (kode, nama, tipe; anak di bawah induknya):
  - 1101 Kas & Bank (induk), dengan anak 110101 Kas, 110102 Bank.
  - 1102 Piutang Usaha (induk), dengan anak 110201 Piutang Usaha.
  - 1103 Aset Lancar Lainnya (induk), dengan anak 110301 Uang Muka Pembelian, 110302 Biaya Dibayar Di Muka, 110303 PPN
    Masukan.
  - 1104 Persediaan (induk), dengan anak 110401 Persediaan.
  - 1201 Aset Tetap (induk), dengan anak 120101 Tanah, 120102 Bangunan, 120103 Kendaraan, 120104 Peralatan Kantor,
    120105 Mesin dan Peralatan Produksi.
  - 1202 Akumulasi Penyusutan (induk), dengan anak 120201 Akumulasi Penyusutan Bangunan, 120202 Akumulasi Penyusutan
    Kendaraan, 120203 Akumulasi Penyusutan Peralatan Kantor, 120204 Akumulasi Penyusutan Mesin dan Peralatan Produksi.
  - 1301 Aset Lainnya (induk), dengan anak 130101 Uang Jaminan.
  - 2101 Utang Usaha (induk), dengan anak 210101 Utang Usaha.
  - 2102 Liabilitas Jangka Pendek (induk), dengan anak 210201 Uang Muka Penjualan, 210202 PPN Keluaran, 210203 Hutang
    Pembelian Belum Ditagih, 210204 Hutang Biaya, 210205 Utang Gaji, 210206 Utang Pajak Lainnya, 210207 Utang PPh 21.
  - 2201 Liabilitas Jangka Panjang (induk), dengan anak 220101 Utang Bank Jangka Panjang.
  - 3000 Modal (induk), dengan anak 300001 Ekuitas Saldo Awal, 300002 Laba Ditahan, 300003 Modal Usaha, 300004 Prive.
  - 4000 Pendapatan Operasional (induk), dengan anak 400001 Penjualan, 400002 Pendapatan Jasa, 400003 Retur Penjualan,
    400004 Diskon Penjualan.
  - 5000 Beban Pokok Penjualan (induk), dengan anak 500001 Beban Pokok Penjualan, 500002 Diskon Pembelian.
  - 6000 Beban Operasional (induk), dengan anak 600001 Beban Iklan dan Promosi, 600002 Beban Komisi, 600003 Beban
    Bensin, Parkir, Tol Kendaraan, 600004 Beban Gaji dan Upah, 600005 Beban Sewa, 600006 Beban Listrik dan Air, 600007
    Beban Telepon dan Internet, 600008 Beban Perlengkapan Kantor, 600009 Beban Asuransi Karyawan, 600010 Beban
    Perbaikan dan Pemeliharaan, 600011 Beban Ongkos Kirim, 600012 Beban Penyusutan Bangunan, 600013 Beban Penyusutan
    Kendaraan, 600014 Beban Penyusutan Peralatan, 600015 Beban Pajak, 600016 Beban Lain-lain.
  - 7000 Pendapatan Lainnya (induk), dengan anak 700001 Pendapatan Bunga, 700002 Pendapatan Lain-lain.
  - 8000 Beban Lainnya (induk), dengan anak 800001 Beban Bunga, 800002 Beban Administrasi Bank, 800003 Beban Lain-lain.
  - **Tipe akun induk** sama dengan tipe anaknya. Pengecualiannya 3000 Modal (tipe modal) dan 4000/5000/6000/7000/8000,
    yang tipenya mengikuti kelompoknya.

- [ ] **Step 1: Write the failing test** `migrasi-004.test.js`:
  - semua tabel dan kolom di atas ada di `finance_uji`;
  - 4 departemen bawaan ada;
  - akun 300001 bertipe `modal` dan terpasang di `perusahaan.akun_ekuitas_saldo_awal_id`;
  - jurnal tidak seimbang ditolak saat commit, dengan pesan berisi "tidak seimbang";
  - baris dengan debit dan kredit sama-sama 0 ditolak;
  - `finance_app` tidak bisa UPDATE/DELETE `log_aktivitas`;
  - `finance_app` bisa insert ke `jurnal` dan `jurnal_baris` (lewat `begin … rollback`).
- [ ] **Step 2:** Run `npm run uji -- --test-name-pattern=004` (atau berkas itu saja). Expected: FAIL, karena tabel
  belum ada.
- [ ] **Step 3:** Tulis `004_buku_besar.sql`. Pasang dengan `npm run migrate -- --ya` (`.env` laptop sudah
  `finance_uji`), lalu jalankan `npm run izin:uji` kalau tabel baru belum memberi hak ke `finance_app`. Perluas
  `bersihkanDataUji`, dengan urutan:
  1. jurnal buatan pengguna uji, dan jurnal saldo awal milik akun `UJI%`;
  2. akun `UJI%` (anak dulu, baru induk);
  3. departemen `UJI %`;
  4. penyetuju untuk pengguna uji, juga aturan penyetuju yang dibuat tes. Tes menyimpan dan mengembalikan aturan
     semula.
- [ ] **Step 4:** Jalankan lagi. Expected: PASS, dan "Schema lain TIDAK berubah" di keluaran migrasi.

### Task 2: Menu, hak, tipe transaksi, dan penomoran yang melompati nomor terpakai

**Files:**
- Modify: `server/src/shared/akses/menu.js`, `server/src/features/penomoran/tipe-transaksi.js`,
  `server/src/features/penomoran/penomoran.service.js`, `server/src/features/preferensi/periode.js`
- Test: `server/test/hak.test.js` (perluas), `server/test/penomoran.test.js` (perluas)

**Interfaces:**
- **Menu baru:**
  - Modul `buku_besar` (nama "Buku Besar", di atas Laporan): `akun_perkiraan` (data_induk, `/buku-besar/akun`),
    `jurnal_umum` (transaksi, `/buku-besar/jurnal-umum`), `pencatatan_beban` (transaksi,
    `/buku-besar/pencatatan-beban`), `histori_akun` (laporan, `/buku-besar/histori-akun`, aksi lihat).
  - Perusahaan menambah `departemen` (data_induk, `/perusahaan/departemen`) dan `persetujuan` (laporan,
    `/perusahaan/persetujuan`, aksi lihat).
  - Laporan menambah `laporan_keuangan` (laporan, `/laporan/keuangan`, aksi lihat).
  - Pengaturan menambah `penyetuju_transaksi` (pengaturan, `/pengaturan/penyetuju-transaksi`).
- `TIPE_TRANSAKSI` bertambah `{ kode: "pencatatan_beban", nama: "Pencatatan Beban" }`.
- `ambilNomorBerikut(klien, tipe, tanggal, penomoranId = null, { dipakai } = {})`:
  - `dipakai(nomor) → Promise<boolean>`;
  - selama nomor sudah dipakai, ambil counter berikutnya, paling banyak 1000 kali, lalu 409.
- `pastikanTanggalTerbuka(db, tanggal, { saldoAwal = false } = {})`:
  - membaca baris perusahaan dengan `for share`;
  - `saldoAwal: true` melewati cek "sebelum periode", tetapi tetap ditolak kalau `kunci_sampai >= tanggal`.

- [ ] **Step 1:** Tes:
  - Operator tanpa hak `jurnal_umum` mendapat 403 di `GET /jurnal-umum`;
  - navigasi Administrator memuat modul Buku Besar;
  - dua penomoran berbeda dengan format sama: nomor kedua melompati nomor yang `dipakai`;
  - saldo awal per 31 Desember 2026 lolos, dan ditolak saat `kunci_sampai = 2026-12-31`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Run → PASS. Tes lama `hak` dan `penomoran` tetap lulus.

### Task 3: Departemen (server dan client)

**Files:**
- Create: `server/src/features/departemen/departemen.routes.js`, `departemen.service.js`;
  `client/src/entities/departemen/index.js`; `client/src/pages/departemen/DepartemenPage.jsx`, `ui/FormDepartemen.jsx`
- Modify: `server/src/app.js`, `client/src/app/router/rute.jsx`, `client/src/widgets/app-shell/model/ikon.js`
- Test: `server/test/departemen.test.js`

**Interfaces:**
- `GET /departemen?aktif=1` → `[{ id, nama, keterangan, induk_id, induk_nama, nonaktif, terpakai }]`
- `GET /departemen/:id`, `POST`, `PUT /:id`, `DELETE /:id` (`wajibHak("departemen", …)`)
- Client: `useDaftarDepartemen({ aktif })` untuk pilihan di formulir transaksi.

- [ ] **Step 1:** Tes:
  - membuat "UJI Lini A";
  - nama sama (beda huruf besar/kecil) → 409;
  - induk tidak boleh dirinya sendiri atau keturunannya → 400;
  - menghapus departemen yang dipakai `jurnal_baris` → 409 "nonaktifkan saja";
  - setiap simpan dan hapus tercatat di Log Aktivitas.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementasi server dan halaman. Halamannya: daftar dengan kolom Nama, Keterangan, Sub dari, Status,
  dan filter Status; formulir dengan Nama, Keterangan, Sub Departemen dari, Non Aktif.
- [ ] **Step 4:** Run → PASS. Build dan lint client.

### Task 4: Akun Perkiraan dan saldo awal (server)

**Files:**
- Create: `server/src/features/akun/akun.routes.js`, `akun.service.js`, `tipe-akun.js`
- Modify: `server/src/app.js`, `server/src/features/preferensi/preferensi.routes.js` (dua akun pengaturan)
- Test: `server/test/akun.test.js`

**Interfaces:**
- `TIPE_AKUN = [{ kode, nama, normal: "debit"|"kredit", kelompok }]`, berurutan seperti daftar di atas.
- `GET /akun?tipe=&aktif=&cari=` → `[{ id, kode, nama, tipe, tipe_nama, induk_id, tingkat, punya_anak, nonaktif,
  saldo, saldo_awal, terpakai }]`, urut kode.
  - `saldo` adalah teks desimal dari jurnal disetujui, di sisi normal akun.
  - `saldo` akun induk adalah jumlah semua keturunannya.
- `GET /akun/:id`, `POST`, `PUT /:id`, `DELETE /:id`.
  - Body: `{ kode, nama, tipe, induk_id, catatan, nonaktif, saldo_awal: "0.00" }`.
- **Saldo awal di dalam transaksi yang sama:**
  - nilai ≠ 0 → buat atau perbarui jurnal `saldo_awal` bertanggal `mulai_periode − 1 hari`, nomor `SA.{kode}`, dua
    baris (akun di sisi normalnya; Ekuitas Saldo Awal di sisi lawan), keterangan "Saldo Awal akun {nama}";
  - nilai 0 → hapus jurnalnya;
  - nilai negatif → jurnal di sisi kebalikannya.
- **Aturan:**
  - kode unik;
  - induk harus sudah ada dan bertipe sama;
  - akun yang dipakai `jurnal_baris` (selain saldo awalnya sendiri) tidak bisa ganti tipe, dijadikan induk, atau
    dihapus;
  - akun induk tidak bisa diberi saldo awal;
  - akun yang dipasang di Preferensi tidak bisa dihapus atau dinonaktifkan.
- **Preferensi** menambah `akun_ekuitas_saldo_awal_id` dan `akun_laba_ditahan_id` (keduanya wajib bertipe `modal`).

- [ ] **Step 1:** Tes:
  - buat UJI1000 (induk kas_bank) dan UJI100001 (anak);
  - saldo awal 1.500.000,50 membuat jurnal seimbang bertanggal 2026-12-31 dan menambah 1.500.000,50 di sisi kredit
    Ekuitas Saldo Awal;
  - ubah nilai jadi 0 → jurnal hilang;
  - induk dengan saldo awal → 400;
  - hapus akun terpakai → 409;
  - saldo induk = jumlah anak;
  - kode kembar → 409;
  - saldo awal saat periode 2026-12-31 dikunci → 409.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Run → PASS.

### Task 5: Jurnal Umum dan Pencatatan Beban (server, modul jurnal bersama)

**Files:**
- Create: `server/src/features/jurnal/jurnal.service.js`, `jurnal-umum.routes.js`, `pencatatan-beban.routes.js`,
  `uang.js` (bantuan teks desimal ↔ sen)
- Modify: `server/src/app.js`
- Test: `server/test/jurnal.test.js`

**Interfaces:**
- `simpanJurnal(req, { tipe, id = null, body })` → `{ id, nomor, status }`.
  - Jurnal Umum body: `{ tanggal, keterangan, penomoran_id?, baris: [{ akun_id, debit, kredit, departemen_id,
    catatan }] }`.
  - Pencatatan Beban body: `{ tanggal, akun_lawan_id (Hutang Beban), jatuh_tempo, keterangan, penomoran_id?, baris:
    [{ akun_id, nilai, departemen_id, catatan }] }`.
    - Diubah menjadi baris debit beban, ditambah satu baris kredit `otomatis` ke Hutang Beban.
    - `akun_lawan_id` wajib bertipe `liabilitas_jangka_pendek`.
    - Akun rincian wajib bertipe `beban`, `beban_lainnya`, atau `beban_pokok_penjualan`.
- **Urutan di dalam satu transaksi:**
  1. validasi zod;
  2. akun ada, detail, dan aktif; departemen aktif;
  3. hitung total dalam sen; tolak kalau tidak seimbang atau total 0;
  4. `pastikanTanggalTerbuka` untuk tanggal baru, dan untuk tanggal lama kalau mengubah;
  5. tulis kepala dan baris;
  6. nilai aturan persetujuan (Task 7) → status;
  7. kalau disetujui dan belum bernomor, **ambil nomor paling akhir** dengan `dipakai` yang mengecek
     `jurnal(tipe, nomor)`;
  8. `catatLog` dengan potret berlabel (Nomor, Tanggal, Keterangan, Total, Rincian "kode nama: Debit/Kredit Rp …,
     Departemen").
- `hapusJurnal(req, tipe, id)`:
  - jurnal saldo awal → 409 "Ubah saldo awal di formulir akunnya";
  - periode terkunci → 409.
- **Routes** `/jurnal-umum` dan `/pencatatan-beban`:
  - `GET` (filter `dari`, `sampai`, `status`, `cari`, halaman 50) → baris `{ id, nomor, tanggal, keterangan, total,
    status, dibuat_oleh_nama }`;
  - `GET /:id` → kepala dan baris (Pencatatan Beban tanpa baris otomatis);
  - `POST`, `PUT /:id`, `DELETE /:id`.

- [ ] **Step 1:** Tes:
  - jurnal 2 baris seimbang → 201 dengan nomor `JU.2027.01.00001`-like;
  - tidak seimbang → 400 "Total debit Rp … belum sama dengan total kredit Rp …";
  - satu baris berisi debit dan kredit sekaligus → 400;
  - akun induk → 400;
  - departemen nonaktif → 400;
  - 3 × "33333.33" lawan "99999.99" → seimbang;
  - "0.10" + "0.20" lawan "0.30" → seimbang;
  - tanggal 2026-12-15 → 400 SEBELUM_PERIODE;
  - pindah tanggal ke periode terkunci → 409;
  - Pencatatan Beban 2 baris (Beban Sewa Maklon 2.000.000 dan Beban Listrik Retail 500.000) ke Hutang Biaya → jurnal
    dengan kredit 2.500.000 otomatis;
  - Hutang Beban bukan liabilitas → 400;
  - hapus → baris ikut terhapus, log tercatat;
  - dua penomoran berformat sama menyimpan bersamaan → nomor tidak kembar.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Run → PASS.

### Task 6: Komponen uang, pilih akun, dan halaman Akun Perkiraan (client)

**Files:**
- Create:
  - `client/src/shared/lib/uang.js` (`keSen`, `dariSen`, `formatRupiah`, `bacaRupiah`);
  - `client/src/shared/ui/InputUang.jsx`;
  - `client/src/features/pilih-akun/ui/PilihAkun.jsx` (Popover, cari kode atau nama, menjorok per tingkat, akun induk
    tidak bisa dipilih);
  - `client/src/features/pilih-departemen/ui/PilihDepartemen.jsx`;
  - `client/src/entities/akun/index.js`;
  - `client/src/pages/akun-perkiraan/AkunPerkiraanPage.jsx`, `ui/FormAkun.jsx`.
- Modify: `rute.jsx`, `ikon.js`, `client/src/pages/preferensi/PreferensiPage.jsx` (bagian "Akun Perkiraan": Ekuitas
  Saldo Awal, Laba Ditahan)

**Interfaces:**
- `InputUang({ value: "1250000.00" | "", onChange(teksDesimal) })`:
  - menampilkan "1.250.000" saat tidak fokus;
  - menerima ketikan "1.250.000,50".
- **Daftar akun:**
  - filter chip Tipe Akun dan Status;
  - kolom Kode, Nama (menjorok), Tipe Akun, Saldo;
  - akun induk ditebalkan.
- **Formulir akun:** bagian Informasi Umum (Tipe Akun, Sub Akun dari, Kode, Nama), Saldo Awal (Nilai, "per 31 Des
  2026" hanya teks), dan Lain-lain (Catatan, Non Aktif).

- [ ] **Step 1:** Uji logika `uang.js` dengan `node --test client/src/shared/lib/uang.test.js` (tanpa DOM):
  - `bacaRupiah("1.250.000,50") === "1250000.50"`;
  - `formatRupiah("1250000.00") === "Rp 1.250.000"`;
  - `formatRupiah("-500.5") === "−Rp 500,50"`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementasi komponen dan halaman.
- [ ] **Step 4:** Run → PASS. Build dan lint.

### Task 7: Penyetuju Transaksi dan Persetujuan (server)

**Files:**
- Create: `server/src/features/persetujuan/persetujuan.service.js`, `penyetuju.routes.js`, `persetujuan.routes.js`
- Modify: `jurnal.service.js` (langkah 6 Task 5), `server/src/app.js`
- Test: `server/test/persetujuan.test.js`

**Interfaces:**
- `nilaiAturan(klien, tipe, totalSen) → { perluPersetujuan: boolean }`.
  - Perlu persetujuan kalau aturan aktif, punya penyetuju, dan total ≥ nilai minimal (kosong = semua nilai).
- **Pengaturan** (khusus Administrator):
  - `GET /penyetuju-transaksi` → semua tipe transaksi beserta aturannya;
  - `PUT /penyetuju-transaksi/:tipe` dengan body `{ aktif, nilai_minimal: "…"|null, penyetuju: [pengguna_id] }`.
  - Penyetuju harus pengguna aktif. Perubahan tercatat di log.
- **Perusahaan › Persetujuan:**
  - `GET /persetujuan?status=diajukan` → jurnal berstatus diajukan yang boleh diputuskan pengguna ini. Administrator
    melihat semua, tetapi hanya penyetuju yang bisa memutuskan.
  - `POST /persetujuan/:id/setujui` → status disetujui. Nomor diambil saat itu, dan tanggal dicek terbuka.
  - `POST /persetujuan/:id/tolak` dengan body `{ alasan }` → status ditolak.
  - Pengguna yang bukan penyetuju tipe itu → 403.

- [ ] **Step 1:** Tes:
  - aturan Jurnal Umum ≥ 10.000.000 dengan penyetuju A;
  - jurnal 5.000.000 → langsung disetujui dan bernomor;
  - jurnal 20.000.000 → diajukan tanpa nomor, dan tidak muncul di Neraca Percobaan (setelah Task 8);
  - B (bukan penyetuju) setujui → 403;
  - A setujui → bernomor;
  - tolak dengan alasan → ditolak; diubah → diajukan lagi;
  - mengubah jurnal disetujui di atas nilai minimal → diajukan dengan nomor tetap;
  - aturan dinonaktifkan → jurnal baru langsung disetujui.
  - Aturan semula dikembalikan di `after`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Run → PASS, termasuk ulang `jurnal.test.js`.

### Task 8: Laporan (server)

**Files:**
- Create: `server/src/features/laporan-keuangan/laporan-keuangan.service.js`, `laporan-keuangan.routes.js`,
  `ekspor-excel.js`
- Modify: `server/src/app.js`
- Test: `server/test/laporan-keuangan.test.js`

**Interfaces:** semua laporan hanya menghitung jurnal `disetujui`, dan uang dikirim sebagai teks desimal.
- `GET /laporan-keuangan/laba-rugi?dari&sampai&per_departemen=0|1` → `{ kolom: [{ kunci, nama }], bagian: [{ judul,
  baris: [{ akun_id, kode, nama, nilai: {kunci: "…"} }], total: {…} }], ringkasan: { laba_kotor, laba_operasional,
  laba_bersih } }`.
  - Kolom per departemen: setiap departemen yang punya nilai, "Tanpa Departemen", lalu "Total".
- `GET /laporan-keuangan/neraca?per` → bagian ASET, LIABILITAS, dan EKUITAS seperti Acuan, ditambah baris hitungan
  "Laba Ditahan" (saldo akun ditambah laba tahun-tahun lalu) dan "Laba Tahun Ini", serta `seimbang: boolean`.
- `GET /laporan-keuangan/neraca-percobaan?dari&sampai` → `[{ kode, nama, tipe_nama, saldo_awal, debit, kredit,
  saldo_akhir }]` dan total.
- `GET /laporan-keuangan/buku-besar?dari&sampai&akun_id?` → per akun: saldo awal, baris (tanggal, nomor, tipe,
  keterangan, debit, kredit, saldo), dan saldo akhir. Dipakai juga oleh Histori Akun.
- `GET /laporan-keuangan/jurnal?dari&sampai` → jurnal beserta barisnya.
- `GET /laporan-keuangan/:jenis.xlsx?…` → berkas Excel berjudul nama laporan, nama perusahaan, dan rentang tanggal
  eksplisit. Hak `laporan_keuangan` lihat; `buku-besar` juga boleh dengan hak `histori_akun`.

- [ ] **Step 1:** Tes dengan akun UJI dan tanggal 2027–2028:
  - saldo awal kas 10.000.000;
  - penjualan 2027-03-01 sebesar 5.000.000 (Retail);
  - beban 2027-03-05 sebesar 2.000.000 (Maklon);
  - jurnal 2028-01-10 sebesar 1.000.000.

  Hasil yang diharapkan:
  - Laba Rugi Maret 2027: Pendapatan 5.000.000, Beban 2.000.000, Laba Bersih 3.000.000;
  - per departemen: Retail 5.000.000, Maklon −2.000.000;
  - Neraca per 2027-12-31 seimbang, Laba Tahun Ini 3.000.000;
  - Neraca per 2028-02-01: laba 2027 pindah ke Laba Ditahan;
  - Neraca Percobaan: total debit = total kredit;
  - Buku Besar kas: saldo berjalan benar;
  - jurnal diajukan tidak ikut dihitung;
  - `.xlsx` → 200 dengan content-type spreadsheet.

  Karena data lain bisa ada di `finance_uji`, cek angka per akun UJI, ditambah cek "seimbang" untuk keseluruhan.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Run → PASS.

### Task 9: Halaman Jurnal Umum dan Pencatatan Beban (client)

**Files:**
- Create:
  - `client/src/entities/jurnal/index.js`;
  - `client/src/widgets/rincian-jurnal/ui/TabelRincian.jsx` (baris yang bisa ditambah/dihapus, total, selisih; di HP
    tiap baris jadi kartu);
  - `client/src/pages/jurnal-umum/JurnalUmumPage.jsx`, `ui/FormJurnalUmum.jsx`;
  - `client/src/pages/pencatatan-beban/PencatatanBebanPage.jsx`, `ui/FormPencatatanBeban.jsx`.
- Modify: `rute.jsx`, `ikon.js`

**Interfaces:**
- **Daftar:**
  - chip Tanggal (bulan ini / bulan lalu / tahun ini / semua) dan Status;
  - kolom Nomor (atau "Menunggu persetujuan"), Tanggal, Keterangan, Total, Status, Dibuat oleh.
- **Formulir Jurnal Umum:**
  - kepala: Tanggal, Nomor (teks "Otomatis saat disimpan"), Keterangan;
  - rincian: Akun (PilihAkun), Debit, Kredit (InputUang; mengisi salah satu mengosongkan yang lain), Departemen,
    Catatan;
  - footer Total Debit, Total Kredit, dan Selisih (merah kalau ≠ 0);
  - tombol Simpan, Hapus, dan Cetak.
- **Formulir Pencatatan Beban:** Hutang Beban (PilihAkun dibatasi Liabilitas Jangka Pendek), Tanggal, Jatuh Tempo,
  Keterangan; rincian Akun beban, Nilai, Departemen, Catatan; Total.
- Kalau berstatus Diajukan atau Ditolak, tampilkan pita status beserta alasan penolakan.

- [ ] **Step 1:** Cek browser (tidak ada tes DOM di project):
  - simpan jurnal seimbang;
  - tidak seimbang → tombol Simpan mati dan selisih merah;
  - ubah, lalu hapus;
  - Pencatatan Beban;
  - dicek di 1440, 820, dan 390 px.
- [ ] **Step 2:** Build dan lint bersih.

### Task 10: Halaman Departemen, Persetujuan, dan Penyetuju Transaksi (client)

**Files:**
- Create: `client/src/entities/persetujuan/index.js`, `client/src/pages/persetujuan/PersetujuanPage.jsx`,
  `client/src/pages/penyetuju-transaksi/PenyetujuTransaksiPage.jsx`
- Modify: `rute.jsx`, `ikon.js`, `client/src/widgets/app-shell/ui/AppShell.jsx` (lencana jumlah menunggu di menu
  Persetujuan)

**Interfaces:**
- **Penyetuju Transaksi:**
  - satu kartu per tipe transaksi, berisi Aktif, Nilai minimal (InputUang; kosong = semua nilai), dan Penyetuju
    (centang pengguna aktif);
  - tombol Simpan per kartu.
- **Persetujuan:**
  - daftar transaksi diajukan, dengan kolom Tipe, Tanggal, Keterangan, Total, Diajukan oleh;
  - klik → rincian jurnal, lalu tombol Setujui atau Tolak (dengan alasan wajib);
  - tombol hanya untuk penyetuju; yang lain melihat tulisan "Menunggu keputusan {nama penyetuju}".

- [ ] **Step 1:** Cek browser dengan dua akun uji: penyetuju dan pembuat.
- [ ] **Step 2:** Build dan lint.

### Task 11: Halaman Laporan Keuangan dan Histori Akun (client)

**Files:**
- Create:
  - `client/src/entities/laporan-keuangan/index.js`;
  - `client/src/pages/laporan-keuangan/LaporanKeuanganPage.jsx` (daftar laporan → parameter → hasil);
  - `ui/LabaRugi.jsx`, `ui/Neraca.jsx`, `ui/NeracaPercobaan.jsx`, `ui/BukuBesar.jsx`, `ui/DaftarJurnal.jsx`;
  - `client/src/pages/histori-akun/HistoriAkunPage.jsx`;
  - `client/src/app/styles/cetak.css` (`@media print`: sembunyikan sidebar, tab, dan tombol; ukuran A4).
- Modify: `rute.jsx`, `ikon.js`

**Interfaces:**
- **Halaman Laporan Keuangan:**
  - kartu-kartu laporan (Laba/Rugi, Laba/Rugi per Lini Bisnis, Neraca, Neraca Percobaan, Rincian Buku Besar,
    Keseluruhan Jurnal);
  - pilih satu → parameter (rentang tanggal eksplisit "1–31 Mar 2027" atau per tanggal) → tombol Tampilkan;
  - hasil dengan judul, nama perusahaan, dan rentang;
  - tombol "Unduh Excel" dan "Cetak / Simpan PDF".
- **Angka:**
  - negatif ditulis −Rp;
  - baris total tebal;
  - kosong "—";
  - di HP tabel bisa digeser dengan kolom nama menempel.
- **Neraca** menampilkan peringatan merah kalau `seimbang` false.

- [ ] **Step 1:** Cek browser dengan data uji dari Task 8:
  - angka sama dengan hasil tes;
  - Excel terunduh;
  - pratinjau cetak hanya berisi laporan;
  - dicek di 1440, 820, dan 390 px.
- [ ] **Step 2:** Build dan lint.

### Task 12: Penutup — tes penuh, dokumen, dan pemeriksaan menyeluruh

**Files:**
- Modify: `docs/PROGRESS.md`, `docs/RENCANA-AKUNTANSI.md` (status Tahap 1, butir yang ditunda)

- [ ] **Step 1:** `npm run uji` (server) → semua lulus. Client build dan lint bersih.
- [ ] **Step 2:** Alur lengkap di browser sebagai Administrator, lalu Operator dengan grup terbatas:
  1. akun;
  2. saldo awal;
  3. jurnal;
  4. beban;
  5. persetujuan;
  6. laporan.
- [ ] **Step 3:** Perbarui dokumen: yang dibangun, yang diverifikasi, yang belum, dan yang ditunda.
