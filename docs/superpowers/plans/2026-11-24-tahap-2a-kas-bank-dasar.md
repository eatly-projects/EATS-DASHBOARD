# Tahap 2a: Kas & Bank Dasar — Rencana Kerja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finance bisa menandai rekening (bank + 4 digit, rekening utama), mencatat Penerimaan, Pembayaran, dan
Transfer Bank, melihat Histori Bank, membuka laporan Arus Kas (metode langsung), dan melihat saldo kas & bank di
halaman utama.

**Architecture:**
- **Satu sumber angka tetap:** ketiga transaksi baru adalah baris `jurnal` (tipe `penerimaan`, `pembayaran`,
  `transfer_bank`) beserta `jurnal_baris`, lewat modul jurnal bersama yang sudah dipakai Jurnal Umum dan Pencatatan
  Beban. Polanya sama dengan Pencatatan Beban: kepala menyimpan rekening di `akun_lawan_id`, dan baris rekening
  ditulis otomatis (`otomatis = true`).
- **Rekening = akun bertipe Kas & Bank**, ditambah kolom `bank_nama` dan `nomor_rekening_akhir`. Rekening utama
  disimpan di `perusahaan.akun_rekening_utama_id`, diatur di Preferensi seperti akun Ekuitas Saldo Awal.
- **Laporan** dihitung dari jurnal disetujui di modul `laporan-keuangan`. Histori Bank memakai Rincian Buku Besar
  yang dibatasi ke akun Kas & Bank.

**Tech Stack:** Express 5, pg, zod, exceljs (server); React 18, TanStack Query, Tailwind/shadcn (client); node:test
dengan schema `finance_uji`.

**Spec:** `docs/superpowers/specs/2026-11-24-kas-bank-dan-sambungan-operasional-design.md` (disetujui Lutfi
2026-11-24): §4.1, §4.2, §4.5 bagian Histori Bank, §4.6 bagian Arus Kas dan widget saldo, §6 langkah 1. Rencana
induk: `docs/RENCANA-AKUNTANSI.md` §6 baris Tahap 2.

**Di luar rencana ini** (rencana berikutnya): Rekening Koran, aturan otomatis, Rekonsiliasi Bank, tutup buku hijau,
kartu pengawasan Bos, sambungan Operasional.

## Global Constraints

- **Git:** kerjakan di branch `tahap-2a-kas-bank`. Jangan commit atau push tanpa izin Lutfi; izin berlaku per
  tindakan. Tidak ada commit per task; di akhir Lutfi memutuskan.
- **Migrasi:** `005` dipasang ke `finance_uji` saja (`.env` laptop = `finance_uji`). Ke `finance` hanya dengan izin
  Lutfi. Schema lain tidak boleh berubah.
- **Tes:** `npm run uji` di `server/`. Tes hanya menyentuh data buatannya sendiri (akun `UJI%`, departemen `UJI `,
  jurnal buatan pengguna `@uji.test` atau berketerangan `UJI%`). Tes yang mengubah `perusahaan` atau
  `penyetuju_transaksi` menyimpan dan mengembalikan nilai aslinya.
- **Rahasia:** jangan mencetak isi `.env`, kata sandi, atau hash.
- **Port:** server 4910, client 5178. Jangan pakai 4000 atau 5173. Matikan proses per PID; jangan tinggalkan server
  menyala.
- **Teks di layar:** bahasa Indonesia tanpa singkatan; rupiah penuh ("Rp 1.250.000"); kosong ditulis "—"; rentang
  tanggal eksplisit; tidak ada ID mentah.
- **Uang:** `numeric(18,2)`; API memakai teks desimal; penjumlahan di SQL atau BigInt sen (`shared/uang.js`).
- **Tampilan:** pola `KerangkaDaftarForm`, `DaftarData`, `FormDokumen`, `TabelRincian`; skeleton saat memuat; toast
  setiap simpan; dicek di 1440, 820, dan 390 px.
- **Tanggal transaksi** wajib lolos `pastikanTanggalTerbuka` (sudah ada di `simpanJurnal`/`hapusJurnal`).
- **Aturan tunai (spec §4.2):** uang untuk penjualan dan pembelian barang hanya dicatat di Operasional. Rincian
  Penerimaan dan Pembayaran menolak akun bertipe `piutang_usaha`, `utang_usaha`, dan `persediaan`. §92 sudah live,
  jadi ketiganya ditolak sejak sekarang.
- **Alamat aplikasi Operasional untuk tombol:** `https://boomboo-operations.vercel.app` (dasar `url_operasional` di
  kontrak `INTEGRASI-EAATS.md` bagian 4).

## Acuan Accurate

- **Kas & Bank** berisi Penerimaan (uang masuk), Pembayaran (uang keluar), Transfer Bank, Rekening Koran,
  Rekonsiliasi Bank, dan Histori Bank.
- **Penerimaan:** kepala berisi Setor ke (rekening), Tanggal, Nomor, dan Keterangan; rinciannya Akun, Nilai,
  Departemen, dan Catatan. Jurnalnya debit rekening, kredit setiap akun rincian.
- **Pembayaran:** kepala berisi Bayar dari (rekening); rincian sama. Jurnalnya debit setiap akun rincian, kredit
  rekening.
- **Transfer Bank:** Dari rekening, Ke rekening, Tanggal, Nomor, Nilai, dan Keterangan. Jurnalnya debit rekening
  tujuan, kredit rekening asal.
- **Histori Bank:** seperti Histori Akun, khusus akun Kas & Bank: saldo awal, mutasi, saldo berjalan, saldo akhir.
- **Arus Kas** (metode langsung): uang masuk dan keluar dikelompokkan ke Aktivitas Operasi, Investasi, dan Pendanaan.

## Keputusan Claude (dicatat juga di ledger)

1. **Penomoran bawaan:** Penerimaan `BM.{tahun}.{bulan}.{counter}` (bukti masuk), Pembayaran `BK.…` (bukti keluar),
   Transfer Bank `TB.…`. Semuanya 5 digit dan diulang tiap bulan. Finance bisa mengubahnya di Penomoran.
2. **Rincian Penerimaan dan Pembayaran tidak boleh memakai akun Kas & Bank.** Pesannya mengarahkan ke Transfer Bank,
   supaya perpindahan antar-rekening selalu tercatat dengan satu cara.
3. **Transfer Bank tanpa biaya.** Biaya administrasi bank dicatat sebagai Pembayaran ke 800002 Beban Administrasi
   Bank.
4. **Kelompok Arus Kas** ditentukan dari tipe akun lawan:
   - Operasi: `pendapatan`, `pendapatan_lainnya`, `beban_pokok_penjualan`, `beban`, `beban_lainnya`,
     `piutang_usaha`, `persediaan`, `aset_lancar_lainnya`, `utang_usaha`, `liabilitas_jangka_pendek`;
   - Investasi: `aset_tetap`, `akumulasi_penyusutan`, `aset_lainnya`;
   - Pendanaan: `liabilitas_jangka_panjang`, `modal`.
5. **Arus Kas paling panjang 12 bulan**, satu kolom per bulan ditambah Total. Jurnal Saldo Awal tidak dihitung
   sebagai arus, karena sudah menjadi Saldo Kas Awal.
6. **Pilihan lini bisnis di Arus Kas** berupa saringan satu departemen. Saat disaring, baris saldo kas disembunyikan,
   karena saldo bank tidak dipisah per lini bisnis.
7. **Widget saldo** ditaruh di bagian atas halaman utama, hanya untuk pengguna dengan hak Lihat Histori Bank.
   Rekening tanpa transaksi dan tanpa saldo awal tampil "—", bukan Rp 0.
8. **Rekening** dikelola di Akun Perkiraan (seperti Accurate), bukan menu tersendiri. Kolom bank hanya tampil untuk
   tipe Kas & Bank. Akun lain selalu disimpan dengan kolom bank kosong.
9. **Kas kecil** memakai akun bawaan 110101 Kas yang sudah ada. Finance boleh mengganti namanya menjadi "Kas Kecil"
   (spec §4.1), jadi tidak ada perubahan program.

## Review Focus

1. **Transfer Bank diubah lalu rekening asal dan tujuannya ditukar.** Jurnalnya harus mengikuti isian terbaru
   (debit tujuan, kredit asal), dan Histori Bank kedua rekening ikut berubah. Dites di Task 3.
2. **Rekening yang sudah dinonaktifkan.** Tidak bisa dipakai untuk transaksi baru, tetapi transaksi lama yang
   memakainya tetap bisa diubah tanpa mengganti rekening. Dites di Task 3.
3. **Arus Kas mulai di tengah bulan dan melintasi tahun** (misalnya 15 Desember sampai 10 Februari). Kolom bulannya
   terpotong benar, saldo awal kolom pertama sama dengan saldo per tanggal awal, dan untuk setiap kolom berlaku
   saldo awal + kenaikan = saldo akhir. Dites di Task 4.
4. **Rekening utama dinonaktifkan, dihapus, atau diganti tipenya.** Semuanya ditolak dengan pesan yang menyebut
   Preferensi. Dites di Task 2.
5. **Pengguna yang hanya punya hak Histori Bank** meminta histori akun bukan Kas & Bank lewat API. Harus ditolak.
   Dites di Task 4.

---

### Task 1: Migrasi 005 — tipe jurnal Kas & Bank, kolom rekening, rekening utama, penomoran

**Files:**
- Create: `server/migrations/005_kas_bank.sql`
- Test: `server/test/migrasi-005.test.js`

**Interfaces:**
- Produces, as schema:
  - `jurnal.tipe` check menjadi `('jurnal_umum','pencatatan_beban','saldo_awal','penerimaan','pembayaran','transfer_bank')`.
    Constraint lama dicari namanya lewat `pg_constraint` (biasanya `jurnal_tipe_check`), dihapus, lalu dibuat ulang
    dengan nama `jurnal_tipe_check`.
  - `akun.bank_nama text not null default ''` dan `akun.nomor_rekening_akhir text not null default '' check
    (nomor_rekening_akhir ~ '^([0-9]{4})?$')`.
  - `perusahaan.akun_rekening_utama_id uuid references akun (id) on delete restrict`.
- **Seed:**
  - `update akun set bank_nama = 'BCA' where kode = '110102'`;
  - `perusahaan.akun_rekening_utama_id` = id akun `110102`;
  - tiga penomoran bawaan (format JSON seperti migrasi 004): "Penerimaan" `penerimaan` `BM.`, "Pembayaran"
    `pembayaran` `BK.`, "Transfer Bank" `transfer_bank` `TB.`; `digit_counter` 5, `reset` `bulan`, `bawaan` true.

- [ ] **Step 1: Write the failing test** `migrasi-005.test.js`, pola `migrasi-004.test.js`:
  - kolom `akun.bank_nama`, `akun.nomor_rekening_akhir`, dan `perusahaan.akun_rekening_utama_id` ada;
  - `select a.kode from perusahaan p join akun a on a.id = p.akun_rekening_utama_id` = `110102`, dan `bank_nama` akun
    itu `BCA`;
  - penomoran bawaan untuk `penerimaan`, `pembayaran`, dan `transfer_bank` masing-masing tepat satu;
  - di dalam `begin … rollback`: insert `jurnal` bertipe `transfer_bank` berhasil, dan bertipe `asal` gagal dengan
    kode `23514`;
  - `update akun set nomor_rekening_akhir = '12a4'` gagal dengan kode `23514`.
- [ ] **Step 2:** Run `node --import ./test/lingkungan-uji.js --test test/migrasi-005.test.js` di `server/`.
  Expected: FAIL (kolom belum ada).
- [ ] **Step 3:** Tulis `005_kas_bank.sql` dengan kepala komentar seperti 004 (tanpa nama schema). Pasang dengan
  `npm run migrate -- --ya`, lalu `npm run izin:uji`.
- [ ] **Step 4:** Jalankan lagi. Expected: PASS, dan keluaran migrasi menyebut schema lain tidak berubah.

### Task 2: Rekening di Akun Perkiraan dan rekening utama di Preferensi (server)

**Files:**
- Modify: `server/src/features/akun/akun.routes.js`, `server/src/features/akun/akun.service.js`,
  `server/src/features/preferensi/preferensi.routes.js`
- Test: `server/test/akun.test.js`, `server/test/preferensi.test.js` (perluas)

**Interfaces:**
- Akun (body dan jawaban): `bank_nama` (teks, paling panjang 50, default `""`) dan `nomor_rekening_akhir` (`""` atau
  tepat 4 angka; pesan "Nomor rekening diisi 4 angka terakhir saja."). Untuk tipe selain `kas_bank` server selalu
  menyimpan keduanya `""`. Jawaban akun juga membawa `rekening_utama: boolean`.
- `potret` akun menambah "Bank" dan "Nomor rekening (4 angka terakhir)", diisi "—" kalau kosong.
- `dipasangDiPreferensi` juga memeriksa `akun_rekening_utama_id`. Pesan nonaktif/hapus memakai daftar yang sama,
  dan pesan hapus ditambah "atau Rekening utama".
- Mengganti tipe akun yang sedang menjadi rekening utama ditolak (409): "Akun … dipakai di Preferensi sebagai
  Rekening utama, jadi tipenya tidak bisa diganti."
- Preferensi: field opsional `akun_rekening_utama_id` (uuid). Tidak dikirim berarti tetap. Divalidasi lewat
  `pastikanAkunKasBank(k, id)`: tipe `kas_bank`, akun detail, tidak nonaktif. `PILIH` menambah
  `akun_rekening_utama_id` dan `akun_rekening_utama_nama`; `potret` menambah "Rekening utama".

- [ ] **Step 1: Write the failing tests**
  - `akun.test.js`:
    - membuat akun `UJI-BANK1` tipe `kas_bank` dengan `bank_nama: "Mandiri"` dan `nomor_rekening_akhir: "1234"` →
      201, dan keduanya kembali di jawaban;
    - `nomor_rekening_akhir: "12345"` → 400 /4 angka terakhir/;
    - akun `UJI-BEBAN1` tipe `beban` yang dikirim dengan `bank_nama: "BCA"` → tersimpan `bank_nama: ""`;
    - menonaktifkan, menghapus, atau mengganti tipe akun rekening utama → 409 dengan pesan memuat "Rekening utama".
      Tes memindahkan rekening utama ke `UJI-BANK1` lewat `kueri`, lalu mengembalikannya di `after`.
  - `preferensi.test.js`:
    - `PUT /preferensi` dengan `akun_rekening_utama_id` = akun `600005` → 400 /Kas & Bank/;
    - dengan akun `UJI-BANK1` → 200, `akun_rekening_utama_nama` memuat "UJI-BANK1", dan Log Aktivitas mencatat
      "Rekening utama". Nilai asli dikembalikan di `after`.
- [ ] **Step 2:** Run kedua berkas. Expected: FAIL.
- [ ] **Step 3:** Implementasikan sesuai Interfaces.
- [ ] **Step 4:** Run kedua berkas, lalu `npm run uji`. Expected: PASS semua.

### Task 3: Penerimaan, Pembayaran, dan Transfer Bank (server)

**Files:**
- Modify: `server/src/shared/akses/menu.js`, `server/src/features/penomoran/tipe-transaksi.js`,
  `server/src/features/jurnal/jurnal.service.js`, `server/src/features/jurnal/jurnal.routes.js`,
  `server/src/features/akun/akun.routes.js` (`MENU_PAKAI_AKUN`), `server/src/app.js`
- Test: `server/test/kas-bank.test.js` (baru), `server/test/hak.test.js` (perluas daftar menu kalau tes itu
  mencocokkan daftar persis)

**Interfaces:**
- **Menu:** modul baru `{ kode: "kas_bank", nama: "Kas & Bank" }` di antara `buku_besar` dan `laporan`:
  - `penerimaan` (transaksi, `/kas-bank/penerimaan`);
  - `pembayaran` (transaksi, `/kas-bank/pembayaran`);
  - `transfer_bank` (transaksi, `/kas-bank/transfer-bank`);
  - `histori_bank` (laporan, `/kas-bank/histori-bank`, aksi `["lihat"]`).
- **Tipe transaksi:** `TIPE_TRANSAKSI` ditambah `penerimaan` "Penerimaan", `pembayaran` "Pembayaran", dan
  `transfer_bank` "Transfer Bank". Penomoran dan Penyetuju Transaksi otomatis ikut.
- `NAMA_TIPE_JURNAL` ditambah ketiganya.
- **Rute:** `penerimaanRouter`, `pembayaranRouter`, dan `transferBankRouter` (dari `buatRouter`), dipasang di
  `/api/penerimaan`, `/api/pembayaran`, dan `/api/transfer-bank`.
- **Body:**
  - Penerimaan / Pembayaran: `{ tanggal, keterangan, penomoran_id?, akun_lawan_id (rekening, wajib: "Pilih
    rekening."), baris: [{ akun_id, nilai, departemen_id, catatan }] }`, 1–200 baris. Skemanya sama dengan rincian
    Pencatatan Beban.
  - Transfer Bank: `{ tanggal, keterangan, penomoran_id?, akun_lawan_id (dari rekening), akun_tujuan_id (ke rekening),
    nilai }`.
- **Jurnal yang ditulis `susunBaris`:**
  - Penerimaan: setiap baris **kredit** `nilai`, lalu satu baris otomatis **debit** rekening sebesar total;
  - Pembayaran: setiap baris **debit** `nilai`, lalu satu baris otomatis **kredit** rekening;
  - Transfer Bank: baris 1 debit `akun_tujuan_id` sebesar `nilai` (tidak otomatis, tanpa departemen), baris 2
    otomatis kredit rekening asal.
- **Pemeriksaan tambahan di `periksaAkunDanDepartemen`** (aturan akun nonaktif yang sudah ada tetap berlaku, termasuk
  untuk akun yang sudah dipakai jurnal yang sedang diubah):
  - rekening kepala (dan `akun_tujuan_id`) bertipe `kas_bank`, kalau tidak: "Rekening harus akun bertipe Kas & Bank.";
  - Transfer Bank: asal ≠ tujuan: "Rekening asal dan tujuan tidak boleh sama.";
  - rincian Penerimaan/Pembayaran bertipe `kas_bank`: "Akun {kode nama} adalah rekening. Untuk memindah uang
    antar-rekening, pakai Transfer Bank.";
  - rincian bertipe `piutang_usaha`, `utang_usaha`, atau `persediaan`: "Transaksi ini dicatat di aplikasi
    Operasional. Akun {kode nama} ({nama tipe}) terisi otomatis dari sana, jadi tidak diketik di sini."
- **`ambilJurnal`** untuk tipe kas: `baris` = baris tidak otomatis, dengan `nilai` dari sisi yang benar (kredit untuk
  Penerimaan, debit untuk Pembayaran dan Transfer). Transfer juga membawa `akun_tujuan_id`, `akun_tujuan_nama`, dan
  `nilai`.
- **`daftarJurnal`** menambah `akun_tujuan_nama`: kode + nama akun baris tidak otomatis pertama (dipakai daftar
  Transfer Bank).
- **`potretJurnal`:** Penerimaan "Setor ke", Pembayaran "Bayar dari", Transfer "Dari rekening" dan "Ke rekening".
  Rincian ditulis seperti Pencatatan Beban (nilai tanpa kata Debit/Kredit).
- `MENU_PAKAI_AKUN` ditambah `penerimaan`, `pembayaran`, `transfer_bank`, dan `histori_bank`.

- [ ] **Step 1: Write the failing test** `kas-bank.test.js`. Polanya `jurnal.test.js`: aturan persetujuan dimatikan
  di `before` dan dikembalikan di `after`, akun dipakai lewat kode, dan semua tanggal di **Juli 2033**. Tes:
  - "Penerimaan menulis debit rekening dan kredit setiap rincian": rekening `110102`, rincian `400001` "1000000"
    (Retail) dan `700002` "0.30" → 201; `status` "disetujui"; `nomor` cocok `/^BM\.2033\.07\.\d{5}$/`; `total`
    "1000000.30"; di database baris otomatis debit `110102` "1000000.30".
  - "Pembayaran menulis kredit rekening": rekening `110101`, rincian `600006` "250000" (Maklon) → `nomor`
    `/^BK\.2033\.07\./`; baris otomatis kredit `110101` "250000.00".
  - "Transfer Bank: debit tujuan, kredit asal; diubah dan ditukar mengikuti isian terbaru": `110102` → `110101`
    "100000" → `nomor` `/^TB\./`. `PUT` dengan asal dan tujuan ditukar → baris debit `110102`, kredit `110101`.
  - "rekening harus Kas & Bank, dan asal ≠ tujuan": kepala `600005` → 400 /Kas & Bank/; transfer `110102` →
    `110102` → 400 /tidak boleh sama/.
  - "rincian akun rekening diarahkan ke Transfer Bank": Pembayaran dengan rincian `110101` → 400 /Transfer Bank/.
  - "piutang, utang usaha, dan persediaan dicatat di Operasional": rincian `110201`, `210101`, dan `110401` → setiap
    400 /aplikasi Operasional/.
  - "rekening nonaktif ditolak untuk transaksi baru, tetapi transaksi lama tetap bisa diubah": buat akun `UJI-BANK2`
    (kas_bank), catat Penerimaan memakainya, nonaktifkan akunnya; Penerimaan baru → 400 /nonaktif/; `PUT`
    Penerimaan lama dengan keterangan baru → 200.
  - "aturan Penyetuju berlaku per tipe": aktifkan aturan `pembayaran` untuk satu penyetuju uji → Pembayaran 201
    `status` "diajukan", `nomor` null. Penyetuju menyetujui lewat `/persetujuan/{id}/setujui` → `nomor`
    `/^BK\.2033\.07\./`.
  - "hak per menu": staf dengan grup yang hanya punya `penerimaan` (lihat, buat) → `POST /pembayaran` 403, dan
    `GET /akun` 200.
- [ ] **Step 2:** Run `kas-bank.test.js`. Expected: FAIL (rute belum ada, 404).
- [ ] **Step 3:** Implementasikan sesuai Interfaces.
- [ ] **Step 4:** Run `kas-bank.test.js`, lalu `npm run uji`. Expected: PASS semua, termasuk `jurnal.test.js` dan
  `persetujuan.test.js` lama.

### Task 4: Histori Bank, Arus Kas, dan ringkasan kas & bank (server)

**Files:**
- Modify: `server/src/features/laporan-keuangan/laporan-keuangan.service.js`,
  `server/src/features/laporan-keuangan/laporan-keuangan.routes.js`,
  `server/src/features/laporan-keuangan/ekspor-excel.js`
- Test: `server/test/kas-bank-laporan.test.js` (baru)

**Interfaces:**
- `bukuBesar` per baris menambah `jurnal_id` dan `tipe`, untuk tautan ke dokumen asal.
- **`historiBank({ dari, sampai, akunId })`:**
  - `akunId` kosong berarti rekening utama; kalau rekening utama belum diatur → 400 "Pilih rekening.";
  - akun harus bertipe `kas_bank` (induk 1101 boleh, isinya semua rekening), kalau tidak → 400 "Histori Bank hanya
    untuk akun Kas & Bank.";
  - hasilnya `bukuBesar(...)` dengan `judul: "Histori Bank"`.
- **`arusKas({ dari, sampai, departemenId })`** → `{ judul: "Arus Kas", dari, sampai, departemen_nama, kolom,
  bagian, kenaikan, saldo_awal, saldo_akhir, cocok }`:
  - `kolom`: satu per bulan kalender yang tersentuh `[dari, sampai]`, `{ kunci: "2033-07", nama: "Juli 2033", dari,
    sampai }` (dipotong ke rentang), lalu `{ kunci: "total", nama: "Total" }`. Lebih dari 12 bulan → 400 "Rentang
    Arus Kas paling panjang 12 bulan.";
  - **Algoritma:** ambil jurnal `disetujui`, tipe ≠ `saldo_awal`, bertanggal dalam rentang, yang punya paling sedikit
    satu baris akun `kas_bank`. Untuk setiap baris akun **bukan** `kas_bank` di jurnal itu, `efek = kredit − debit`
    (positif = uang masuk). Jumlahkan per akun per bulan. Kalau `departemenId` ada, hanya baris berdepartemen itu.
    Transfer antar-rekening tidak punya baris bukan kas, jadi otomatis tidak muncul;
  - `bagian`: tiga kelompok (Keputusan Claude 4) dengan judul "Arus Kas dari Aktivitas Operasi", "… Investasi",
    "… Pendanaan". Isinya `baris: [{ akun_id, kode, nama, nilai: {kolom → teks} }]` (akun tanpa arus tidak
    tampil) dan `total`. Kelompok tanpa baris tetap tampil dengan total "0.00";
  - `kenaikan` per kolom = jumlah tiga total;
  - tanpa saringan: `saldo_awal[kolom]` = saldo semua akun `kas_bank` (jurnal disetujui, termasuk saldo awal)
    sebelum `kolom.dari`; `saldo_akhir[kolom]` = saldo sampai `kolom.sampai`; kolom Total memakai `dari` dan
    `sampai`. `cocok` = untuk setiap kolom `saldo_awal + kenaikan = saldo_akhir`;
  - dengan saringan: `saldo_awal`, `saldo_akhir`, dan `cocok` bernilai `null`; `departemen_nama` terisi.
- **`ringkasanKasBank({ per })`** → `{ per, rekening: [{ akun_id, kode, nama, bank_nama, nomor_rekening_akhir,
  utama, saldo }], total, bulan: { dari, sampai, masuk, keluar, bersih } }`:
  - `rekening`: akun detail `kas_bank` yang aktif atau saldonya ≠ 0, urut kode; `saldo` = `null` kalau akun belum
    punya satu pun baris jurnal disetujui sampai `per`;
  - `total` = jumlah saldo yang tidak `null`, atau `null` kalau semuanya `null`;
  - `bulan`: dari tanggal 1 bulan `per` sampai `per`. Untuk setiap jurnal yang dihitung Arus Kas, `n = Σ (debit −
    kredit)` baris `kas_bank`; `masuk = Σ max(n, 0)`, `keluar = Σ max(−n, 0)`, `bersih = masuk − keluar`.
- **Rute** (`LAPORAN` di routes):
  - `histori-bank`: hak `histori_bank` atau `laporan_keuangan` (lihat); skema rentang + `akun_id` opsional;
  - `arus-kas`: hak `laporan_keuangan`; skema rentang + `departemen_id` opsional;
  - `ringkasan-kas-bank`: hak `histori_bank`; skema `{ per }`.
- **Excel:** `PENYUSUN` ditambah `histori-bank` (`tabelBukuBesar`) dan `arus-kas`. Kolomnya Kode, Akun, satu per
  bulan, dan Total; baris kelompok, akun, total kelompok, Kenaikan/Penurunan Kas Bersih, Saldo Kas Awal, dan Saldo
  Kas Akhir. `buatExcel` untuk jenis tanpa penyusun → `galat.tidakAda("Laporan ini tidak bisa diunduh.")`.

- [ ] **Step 1: Write the failing test** `kas-bank-laporan.test.js`. Data dibuat di `before` lewat API: dua akun uji
  `UJI-KB-BANK` dan `UJI-KB-KAS` (kas_bank), lalu transaksi di **Desember 2034 – Februari 2035**, rentang yang tidak
  dipakai tes lain:
  - 2034-12-20 Penerimaan ke `UJI-KB-BANK`: `400001` "1000000" (Retail);
  - 2035-01-05 Pembayaran dari `UJI-KB-BANK`: `600006` "250000" (Maklon);
  - 2035-01-10 Transfer `UJI-KB-BANK` → `UJI-KB-KAS` "100000";
  - 2035-02-03 Penerimaan ke `UJI-KB-KAS`: `300003` "500000".

  Assertions (angka selalu dibandingkan sebagai teks dari API):
  - Arus Kas 2034-12-15 s/d 2035-02-10: `kolom` kunci `["2034-12","2035-01","2035-02","total"]`, kolom pertama
    `dari` "2034-12-15", kolom ketiga `sampai` "2035-02-10"; baris `400001` total "1000000.00"; baris `600006` total
    "-250000.00"; Pendanaan berisi `300003` "500000.00"; `kenaikan.total` "1250000.00" (rentang ini khusus berkas
    tes ini); tidak ada baris berakun `kas_bank`; `cocok` true.
  - Arus Kas dengan `departemen_id` Retail: hanya baris `400001`; `saldo_awal` null; `cocok` null.
  - Arus Kas 2035-01-01 s/d 2036-01-31 → 400 /12 bulan/.
  - Histori Bank `UJI-KB-BANK` 2034-12-01 s/d 2035-01-31: tiga baris, saldo akhir "650000.00", dan setiap baris
    membawa `jurnal_id`. Histori Bank dengan `akun_id` `600006` → 400 /Kas & Bank/.
  - Pengguna dengan grup hanya `histori_bank`: `GET /laporan-keuangan/histori-bank` → 200;
    `GET /laporan-keuangan/buku-besar` → 403; `GET /laporan-keuangan/arus-kas` → 403.
  - Ringkasan per 2035-01-31: rekening `UJI-KB-BANK` saldo "650000.00", `UJI-KB-KAS` "100000.00"; akun uji ketiga
    `UJI-KB-KOSONG` tanpa transaksi → saldo `null`.
  - Excel Arus Kas → 200 dengan `content-type` xlsx. `GET /laporan-keuangan/ringkasan-kas-bank/excel` → 404.
- [ ] **Step 2:** Run berkas itu. Expected: FAIL.
- [ ] **Step 3:** Implementasikan sesuai Interfaces. Hitungan uang di SQL (`sum`) atau BigInt sen, tanpa float.
- [ ] **Step 4:** Run berkas itu, lalu `npm run uji`. Expected: PASS semua.

### Task 5: Kolom rekening di Akun Perkiraan dan rekening utama di Preferensi (client)

**Files:**
- Modify: `client/src/pages/akun-perkiraan/ui/FormAkun.jsx`, `client/src/pages/akun-perkiraan/AkunPerkiraanPage.jsx`
  (kolom daftar), `client/src/pages/preferensi/PreferensiPage.jsx`

**Interfaces:** memakai field dari Task 2.

- [ ] **Step 1:** FormAkun: kalau tipe Kas & Bank, tampilkan "Nama bank" (contoh "BCA") dan "Nomor rekening (4
  angka terakhir)" (`inputMode="numeric"`, `maxLength={4}`). Keduanya disembunyikan dan dikosongkan saat tipe
  diganti. Daftar akun: nama rekening diberi keterangan "BCA •••• 1234" kalau terisi, dan lencana "Rekening utama".
- [ ] **Step 2:** Preferensi: pilihan "Rekening utama" (`PilihAkun tipe={["kas_bank"]}`), di bagian yang sama dengan
  Ekuitas Saldo Awal. Keterangannya: "Pembayaran lama dari aplikasi Operasional yang tidak punya rekening tujuan
  masuk ke rekening ini."
- [ ] **Step 3:** Verifikasi di dev server lokal (server 4910, client 5178, akun uji sekali pakai): simpan akun
  rekening, nomor 5 angka ditolak dengan pesan server, dan ganti rekening utama tersimpan. Cek di 1440, 820, dan
  390 px.

### Task 6: Halaman Penerimaan, Pembayaran, dan Transfer Bank (client)

**Files:**
- Create: `client/src/pages/penerimaan/PenerimaanPage.jsx`, `client/src/pages/pembayaran/PembayaranPage.jsx`,
  `client/src/pages/transfer-bank/TransferBankPage.jsx`, `client/src/widgets/rincian-jurnal/ui/FormKasBank.jsx`,
  `client/src/widgets/rincian-jurnal/ui/FormTransferBank.jsx`, `client/src/shared/lib/operasional.js`
- Modify: `client/src/entities/jurnal/index.js`, `client/src/widgets/rincian-jurnal/ui/DaftarJurnal.jsx`,
  `client/src/widgets/rincian-jurnal/ui/TabelRincian.jsx` (prop `labelTotal`),
  `client/src/widgets/rincian-jurnal/ui/FormJurnal.jsx` (ekspor `PitaStatus`),
  `client/src/pages/persetujuan/ui/DetailPersetujuan.jsx`, `client/src/app/router/rute.jsx`,
  `client/src/widgets/app-shell/model/ikon.js`

**Interfaces:**
- `entities/jurnal`: `JALUR` ditambah `penerimaan: "/penerimaan"`, `pembayaran: "/pembayaran"`, dan `transfer_bank:
  "/transfer-bank"`; `NAMA_TIPE` ditambah ketiganya. `useSegarkan` juga menyegarkan kunci `["kas-bank"]`.
- `shared/lib/operasional.js`: `export const URL_OPERASIONAL = "https://boomboo-operations.vercel.app";`
- `ikon.js`: `IKON_MODUL.kas_bank`, ikon dan keterangan untuk empat menu baru. Keterangan Pembayaran: "Catat uang
  keluar dari rekening atau kas, misalnya bayar listrik, gaji, atau melunasi utang beban".
- **`FormKasBank({ tipe: "penerimaan" | "pembayaran", id, tutup, setelahSimpan, tandaiBerubah })`:**
  - polanya `FormJurnal` mode beban: kepala berisi rekening ("Setor ke" / "Bayar dari", `PilihAkun
    tipe={["kas_bank"]}`), Tanggal, Nomor, dan Keterangan;
  - rincian memakai `TabelRincian mode="beban"` dengan `tipeAkun` = semua tipe kecuali `kas_bank`, `piutang_usaha`,
    `utang_usaha`, dan `persediaan`. Label total diganti "Total penerimaan" / "Total pembayaran" (prop baru
    `labelTotal` di `TabelRincian`, default "Total beban");
  - di atas rincian ada catatan kecil: "Uang tunai atau transfer untuk penjualan dan pembelian barang dicatat di
    aplikasi Operasional.", dengan tombol "Buka aplikasi Operasional" (tautan `URL_OPERASIONAL`, tab baru);
  - pita status Menunggu/Ditolak, Simpan, Cetak, dan Hapus sama dengan `FormJurnal`. Ambil `PitaStatus` dari
    `FormJurnal.jsx` (ekspor) dan jangan menyalinnya.
- **`FormTransferBank`:** satu kartu berisi Dari rekening, Ke rekening, Tanggal, Nomor, Nilai (`InputUang`), dan
  Keterangan. Validasi di layar: kedua rekening terisi dan berbeda ("Rekening asal dan tujuan tidak boleh sama."),
  nilai > 0. Body sesuai Task 3.
- **`DaftarJurnal`:** kolom kedua mengikuti tipe: Penerimaan "Setor ke", Pembayaran "Bayar dari", dan Transfer "Dari
  rekening" + "Ke rekening" (`akun_tujuan_nama`). Teks kosong-nya "Belum ada penerimaan" / "… pembayaran" / "…
  transfer bank".
- Rute `/kas-bank/penerimaan`, `/kas-bank/pembayaran`, dan `/kas-bank/transfer-bank`, masing-masing dibungkus
  `PerluHak`.
- **`DetailPersetujuan`:** label `akun_lawan_nama` mengikuti tipe. Pencatatan Beban tetap "Hutang beban";
  Penerimaan "Setor ke", Pembayaran "Bayar dari", dan Transfer Bank "Dari rekening". Rinciannya tetap
  `semua_baris`, supaya penyetuju melihat baris rekening juga.

- [ ] **Step 1:** Implementasikan sesuai Interfaces.
- [ ] **Step 2:** `npm run build` di `client/`. Expected: build berhasil tanpa peringatan baru.
- [ ] **Step 3:** Verifikasi di dev server lokal dengan akun uji sekali pakai:
  - Penerimaan dua baris (salah satunya bernilai sen) tersimpan dengan nomor `BM.`;
  - Pembayaran dengan aturan Penyetuju aktif tampil "Menunggu persetujuan";
  - Transfer dengan rekening sama tidak bisa disimpan;
  - pilihan akun rincian tidak memuat Kas & Bank, Piutang Usaha, Utang Usaha, atau Persediaan;
  - tombol Operasional membuka tab baru.
  Cek di 1440, 820, dan 390 px (kartu rincian di HP), lalu nonaktifkan akun uji.

### Task 7: Histori Bank, Arus Kas, dan widget saldo (client)

**Files:**
- Create: `client/src/pages/histori-bank/HistoriBankPage.jsx`, `client/src/widgets/kas-bank/ui/RingkasanKasBank.jsx`
- Modify: `client/src/pages/laporan-keuangan/LaporanKeuanganPage.jsx`,
  `client/src/pages/laporan-keuangan/ui/TampilanLaporan.jsx`, `client/src/pages/ringkasan/RingkasanPage.jsx`,
  `client/src/app/router/rute.jsx`, `client/src/entities/laporan-keuangan/index.js` (kalau perlu kunci kueri baru)

**Interfaces:** memakai rute Task 4 lewat `useLaporan(jenis, params, aktif)`.

- [ ] **Step 1: Histori Bank:**
  - pola `HistoriAkunPage`, dengan `PilihAkun tipe={["kas_bank"]}`, akun awal kosong (server memakai rekening
    utama), dan jenis `histori-bank`;
  - nomor setiap baris menjadi tautan ke dokumen asal: Penerimaan, Pembayaran, Transfer Bank, Jurnal Umum, atau
    Pencatatan Beban. Tautannya membuka menu itu dengan `?buka={jurnal_id}&judul={nomor}` (pola `?akun=` di
    `HistoriAkunPage`). Baris Saldo Awal tidak bertautan;
  - `KerangkaDaftarForm` membaca `buka` dan `judul` dari alamat dan memanggil `buka(id, judul)`. Kalau alamatnya
    berganti ke dokumen lain, dokumen itu ikut dibuka (pola `alamatTerakhir` di `HistoriAkunPage`).
- [ ] **Step 2: Arus Kas di Laporan Keuangan:**
  - entri `DAFTAR` baru: `{ kunci: "arus-kas", jenis: "arus-kas", nama: "Arus Kas", ket: "Uang masuk dan keluar per
    bulan, dikelompokkan per aktivitas." }`;
  - parameter: rentang dan pilihan "Lini bisnis" (`PilihDepartemen`, kosong = semua);
  - tampilan `ArusKas`: tabel bergulir menyamping di dalam wadahnya sendiri, dengan kolom bulan dan Total. Angka
    negatif ditulis "−Rp 250.000". Baris Kenaikan/Penurunan Kas Bersih, Saldo Kas Awal, dan Saldo Kas Akhir hanya
    tampil kalau tidak disaring. Kalau `cocok` false, muncul peringatan "Saldo kas tidak nyambung; laporkan ke
    Lutfi." Saat disaring muncul keterangan "Saldo kas tidak dipisah per lini bisnis.".
- [ ] **Step 3: Widget saldo:** `RingkasanKasBank` di bagian paling atas `RingkasanPage`, hanya kalau
  `useHak("histori_bank").lihat`:
  - judul "Kas & Bank", per hari ini;
  - satu kartu per rekening: nama, "BCA •••• 1234", lencana "Rekening utama", dan saldo (atau "—" dengan keterangan
    "Belum ada transaksi atau saldo awal"). Kartu bisa diklik ke Histori Bank rekening itu;
  - satu baris "Bulan ini: masuk Rp …, keluar Rp …, bersih Rp …" untuk 1 {bulan} sampai hari ini;
  - skeleton saat memuat; galat tampil sebagai pesan dengan tombol Coba lagi, tanpa merusak bagian lain halaman.
- [ ] **Step 4:** `npm run build`. Verifikasi di dev server lokal: Histori Bank membuka rekening utama, tautan nomor
  membuka dokumennya, Arus Kas tiga bulan dengan dan tanpa saringan, unduhan Excel Arus Kas, dan widget saldo. Cek
  1440, 820, dan 390 px.

### Task 8: Penutup — tes penuh, dokumen, dan pemeriksaan menyeluruh

**Files:**
- Modify: `docs/PROGRESS.md`, `docs/PLANNING.md` (daftar rute API kalau ada), `server/test/bantu.js` (kalau
  `bersihkanDataUji` perlu urutan baru)

- [ ] **Step 1:** `npm run uji` di `server/`. Expected: semua lulus. Catat jumlahnya (118 + tes baru).
- [ ] **Step 2:** `npm run build` di `client/`. Expected: berhasil.
- [ ] **Step 3:** Pemeriksaan alur penuh di lokal: Penerimaan, Pembayaran, dan Transfer → Histori Bank → Arus Kas →
  widget → Neraca (Kas & Bank sama dengan total widget) → Log Aktivitas mencatat ketiganya. Data uji dinonaktifkan
  atau dihapus, dan semua server dimatikan per PID.
- [ ] **Step 4:** `PROGRESS.md`: entri "2026-11-?? — Tahap 2a Kas & Bank dasar", berisi apa yang dibangun, migrasi
  005 (baru di `finance_uji`), jumlah tes, yang diverifikasi dan yang belum (HP sungguhan, Vercel), dan kekurangan
  kecil yang ditunda.
- [ ] **Step 5:** Laporkan ke Lutfi dan minta izin terpisah untuk: (a) commit + push ke `main`; (b) migrasi 005 ke
  `finance`.
