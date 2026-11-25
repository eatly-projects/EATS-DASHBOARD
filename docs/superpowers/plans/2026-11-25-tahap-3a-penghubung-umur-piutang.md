# Tahap 3a: Penghubung Operasional dan Umur Piutang — Rencana Kerja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend EATS bisa membaca data piutang dari aplikasi Operasional dengan kunci rahasia, dan finance bisa
membuka halaman baca-saja Penjualan › Umur Piutang (per pelanggan, per dokumen, per kelompok umur, saringan lini
bisnis).

**Architecture:**
- **Penghubung** (`features/operasional/operasional.klien.js`) memanggil `GET <OPERASIONAL_API_URL>/api/eaats/...`
  dengan header `X-Api-Key`. Env dibaca saat dipanggil, bukan saat modul dimuat, supaya tes bisa mengarahkannya ke
  server tiruan. Jawaban yang sah disimpan sebagai cadangan di tabel `operasional_cadangan`. Kalau Operasional tidak
  bisa dihubungi, cadangan itu yang tampil beserta waktunya (spec §5.1). Tanpa cadangan di database, di Vercel tidak
  ada "data terakhir" yang bisa ditampilkan.
- **Umur Piutang** (`features/umur-piutang/`) menyusun ulang `baris` §89 di server: menyaring lini bisnis, membuang
  dokumen tanpa sisa, mengelompokkan per pelanggan, dan menjumlah dalam sen (BigInt). Hasilnya selalu konsisten
  dengan barisnya sendiri. Cek dari Operasional tetap menjadi syarat tampil.
- **Halaman** `UmurPiutangPage` hanya menampilkan. Tidak ada tombol ubah; setiap dokumen punya tombol "Buka di
  Operasional".

**Tech Stack:** Express 5, pg, zod, fetch bawaan Node 20 (server); React 18, TanStack Query, Tailwind/shadcn (client);
node:test dengan schema `finance_uji` dan server HTTP tiruan Operasional.

**Spec:** `docs/superpowers/specs/2026-11-24-kas-bank-dan-sambungan-operasional-design.md` (disetujui Lutfi
2026-11-24) §5.1 dan §5.2, §6 langkah 3. Kontrak data: `C:\projects\boomboo-operations\docs\INTEGRASI-EAATS.md`
bagian 2–8; kalau ringkasan di sini berbeda, kontrak itu yang berlaku.

**Permintaan:** Lutfi lewat sesi Operasional 2026-11-25: "tolong konsultasikan dan langsung kerjakan saja". Cara
kerja Native, seperti Tahap 2a.

**Di luar rencana ini:**
- jurnal otomatis dari `/kejadian` (langkah 4);
- `per_tanggal` untuk cek saldo awal (langkah 5);
- hutang (langkah 6);
- Rekening Koran (langkah 2);
- unduhan Excel Umur Piutang.

## Global Constraints

- **Git:** kerjakan di branch `tahap-3a-umur-piutang`. Jangan commit atau push tanpa izin Lutfi; izin berlaku per
  tindakan. Tidak ada commit per task; di akhir Lutfi memutuskan.
- **Migrasi:** `006` dipasang ke `finance_uji` saja. Ke `finance` hanya dengan izin Lutfi, dan **sebelum** push.
  Schema lain tidak boleh berubah.
- **Rahasia:**
  - Jangan mencetak atau membaca isi `.env`.
  - Kunci Operasional tidak pernah dikirim ke browser, tidak dicatat di log, dan tidak masuk pesan galat.
  - Jangan meminta sesi Operasional mengirim nilainya.
- **Tes:**
  - `npm run uji` di `server/`.
  - Tes memakai server tiruan Operasional di `127.0.0.1`, tidak pernah memanggil Operasional sungguhan.
  - Tes yang menyentuh `operasional_cadangan` menyimpan dan mengembalikan baris aslinya.
  - Tes menyimpan lalu mengembalikan `process.env.OPERASIONAL_API_URL` dan `OPERASIONAL_API_KEY`.
- **Teks wajib (spec §5.1–5.2, kontrak bagian 1):**
  - "Data ini hanya bisa diubah di aplikasi Operasional";
  - tombol "Buka di Operasional";
  - "Diperbarui terakhir …" dari `generated_at`;
  - galat "Kunci sambungan ke Operasional belum dipasang" (503) dan "Kunci sambungan ke Operasional salah" (401).
- **Kelompok umur dan labelnya:**
  - `belum_jatuh_tempo` "Belum jatuh tempo";
  - `telat_1_30` "Telat 1–30 hari";
  - `telat_31_60` "Telat 31–60 hari";
  - `telat_lebih_60` "Telat lebih dari 60 hari";
  - `tanpa_jatuh_tempo` "Belum ada jatuh tempo".
  CO selalu `tanpa_jatuh_tempo` (§97). EATS tidak menghitung ulang umur; kelompoknya diambil dari Operasional.
- **Lini bisnis dari `segmen`:**
  - `maklon` Maklon;
  - `retail` Retail;
  - `horeca` HORECA;
  - `modern_trade` Modern Trade;
  - `null` "Tanpa lini bisnis" (nilai saringan `tanpa`).
- **Tampilan:**
  - tanpa singkatan;
  - kosong ditulis "—", bukan Rp 0, untuk hal yang tidak diukur (misalnya jatuh tempo CO);
  - responsif di 390, 820 px, dan desktop;
  - tabel menjadi kartu di HP;
  - memuat memakai skeleton.
- **Status galat EATS:** galat kunci Operasional tidak boleh dijawab 401. Klien EATS menganggap 401 sebagai sesi
  habis dan mengeluarkan pengguna. Pakai 503 (belum dipasang) dan 502 (kunci salah, tidak terhubung, atau jawaban
  rusak).
- **Port:** server 4910, client 5178. Jangan pakai 4000 atau 5173. Matikan proses per PID.

## Review Focus

1. Operasional menjawab 200 tetapi isinya bukan bentuk kontrak (halaman HTML, `baris` hilang, angka tidak bisa
   dibaca). Harus diperlakukan sebagai "tidak bisa dihubungi" dengan cadangan, bukan 500 dan bukan disimpan sebagai
   cadangan. Diuji di Task 1.
2. Operasional menggantung. Panggilan harus berhenti sendiri sebelum batas fungsi Vercel, lalu memakai cadangan.
   Diuji di Task 1 dengan batas waktu kecil.
3. Dokumen lama tanpa `customer.id` harus dikelompokkan menurut nama tanpa beda huruf besar/kecil, seperti kontrak
   bagian 5. Diuji di Task 2.
4. Dokumen dengan `harus_dikembalikan_rp` > 0 dan sisa 0 tetap tampil sebagai "Harus dikembalikan ke klien" dan tidak
   masuk sisa per umur. Diuji di Task 2.
5. Saringan "Tanpa lini bisnis" (`segmen: null`) dan saringan yang tidak dikenal. Yang pertama hanya memuat dokumen
   tanpa segmen; yang kedua ditolak 400 dengan pesan biasa. Diuji di Task 2.

---

### Task 1: Penghubung Operasional dan cadangan data terakhir

**Files:**
- Create: `server/migrations/006_operasional_cadangan.sql`
- Create: `server/src/features/operasional/operasional.klien.js`
- Modify: `.env.example` (dua env baru beserta keterangannya)
- Test: `server/test/migrasi-006.test.js`, `server/test/operasional-klien.test.js`, `server/test/operasional-tiruan.js`
  (server tiruan, bukan berkas tes)

**Interfaces:**
- Produces:
  - Tabel `operasional_cadangan(kunci text primary key, isi jsonb not null, diambil_pada timestamptz not null)`.
  - `ambilOperasional(jalur: "piutang", { batasMs = 20000 } = {}) → Promise<{ data, basi: boolean, cekGagal: string[] }>`
    - `data` adalah objek `data` §89 apa adanya.
    - `basi = true` berarti data diambil dari cadangan karena Operasional tidak bisa dihubungi.
    - `cekGagal` berisi nama cek Operasional yang `ok: false`. Kalau tidak kosong, jawabannya tidak disimpan sebagai
      cadangan.
  - Galat yang dilempar adalah `AppError`:
    - 503 `OPERASIONAL_BELUM_DIPASANG` "Kunci sambungan ke Operasional belum dipasang." Dipakai kalau env EATS kosong
      atau Operasional menjawab 503.
    - 502 `OPERASIONAL_KUNCI_SALAH` "Kunci sambungan ke Operasional salah." Dipakai kalau Operasional menjawab 401.
    - 502 `OPERASIONAL_TIDAK_TERHUBUNG` "Aplikasi Operasional tidak bisa dihubungi. Coba lagi beberapa saat lagi."
      Dipakai kalau koneksi gagal, waktu habis, jawaban 5xx atau rusak, dan tidak ada cadangan.
  - `mulaiTiruan({ status = 200, isi, tunda = 0 }) → Promise<{ url, kunciDiterima: string[], ubah(opsi), tutup() }>`
    di `test/operasional-tiruan.js`. Fungsi ini menyalin bentuk jawaban §89 dan mencatat header `X-Api-Key` yang
    diterima.
  - `contohPiutang(override?) → objek data §89` di berkas yang sama. Isinya 4 dokumen:
    - CO tanpa jatuh tempo milik pelanggan C-0001 segmen `maklon`;
    - invoice PO telat 1–30 milik C-0001 segmen `horeca`;
    - invoice PO lunas milik C-0002;
    - dokumen tanpa `customer.id` bernama "Toko Lama" segmen `null`, berstatus `harus_dikembalikan`.
    Isi `cek` selalu `ok: true`.
  - Kalau dijalankan langsung (`node test/operasional-tiruan.js <port>`), berkas ini menyalakan tiruan berisi
    `contohPiutang()` dengan kunci `kunci-uji` sampai prosesnya dimatikan. Ini dipakai untuk cek di browser.

- [ ] **Step 1: Tulis `test/migrasi-006.test.js`**
  - Tabel `operasional_cadangan` punya kolom `kunci`, `isi`, dan `diambil_pada`.
  - `kunci` adalah primary key: insert kembar ditolak dengan kode `23505`, di dalam transaksi yang di-rollback.
- [ ] **Step 2:** `npm run uji -- test/migrasi-006.test.js`. Expected: FAIL, "kolom operasional_cadangan.kunci belum
  ada".
- [ ] **Step 3: Tulis `006_operasional_cadangan.sql`**
  - Kepala komentarnya bergaya `005`.
  - `create table operasional_cadangan (...)` tanpa nama schema.
  - Hak `finance_app` mengikuti default privileges.
- [ ] **Step 4:** `npm run migrate`, ke `finance_uji` karena `.env` laptop memakai schema itu. Lalu jalankan tes
  migrasi. Expected: PASS.
- [ ] **Step 5: Tulis `test/operasional-tiruan.js` dan `test/operasional-klien.test.js`**
  - Setiap tes menyimpan `process.env` dan baris cadangan `piutang` di `before`, lalu mengembalikannya di `after`.
  - `"mengirim X-Api-Key dan mengembalikan data §89"`:
    - `kunciDiterima` = `["kunci-uji"]`;
    - `data.baris.length === 4`;
    - `basi === false` dan `cekGagal` kosong.
  - `"jawaban sah disimpan sebagai cadangan"`: baris `operasional_cadangan` berkunci `piutang` berisi `isi.generated_at`
    yang sama.
  - `"env kosong → 503 Kunci sambungan ke Operasional belum dipasang"`.
  - `"Operasional 503 → 503 pesan yang sama"`.
  - `"Operasional 401 → 502 OPERASIONAL_KUNCI_SALAH"`, dengan pesan yang tidak memuat nilai kunci.
  - `"tidak terhubung dengan cadangan → basi true, data cadangan"`: ambil sukses sekali, `tutup()` server tiruan,
    lalu ambil lagi.
  - `"tidak terhubung tanpa cadangan → 502 OPERASIONAL_TIDAK_TERHUBUNG"`.
  - `"menggantung → berhenti sendiri"`: `tunda: 2000`, `batasMs: 200`, tanpa cadangan. Galatnya
    `OPERASIONAL_TIDAK_TERHUBUNG`, dan selesai di bawah 1500 ms.
  - `"200 berisi HTML atau tanpa baris → dianggap tidak terhubung dan tidak menimpa cadangan"`.
  - `"cek gagal → cekGagal berisi namanya dan cadangan tidak ditimpa"`.
- [ ] **Step 6:** `npm run uji -- test/operasional-klien.test.js`. Expected: FAIL, "Cannot find module
  operasional.klien.js".
- [ ] **Step 7: Tulis `operasional.klien.js`**
  - `fetch` dengan `AbortSignal.timeout(batasMs)`, `cache: "no-store"`, dan header `X-Api-Key`.
  - Bentuk dianggap sah kalau `ok === true`, `data.generated_at` berupa teks, serta `data.baris` dan `data.cek`
    berupa array.
  - Cadangan ditulis dengan `insert ... on conflict (kunci) do update`, hanya kalau bentuk sah dan `cekGagal` kosong.
  - `OPERASIONAL_API_URL` dibuang `/` di ujungnya.
  - Simpan `{ data, basi, cekGagal }`; galat jaringan tidak pernah dilempar mentah.
- [ ] **Step 8:** Jalankan kedua berkas tes. Expected: PASS. Lalu jalankan `npm run uji`. Expected: semua lulus.
- [ ] **Step 9:** Tambahkan `OPERASIONAL_API_URL` dan `OPERASIONAL_API_KEY` ke `.env.example`, dengan keterangan
  "sama dengan EAATS_API_KEY di backend Operasional; diisi Lutfi" dan tanpa nilai.

### Task 2: Umur Piutang di server (susunan, rute, hak menu)

**Files:**
- Create: `server/src/features/umur-piutang/umur-piutang.service.js`
- Create: `server/src/features/umur-piutang/umur-piutang.routes.js`
- Modify: `server/src/shared/akses/menu.js` (modul `penjualan` sesudah `kas_bank`)
- Modify: `server/src/app.js` (`api.use("/umur-piutang", umurPiutangRouter)`)
- Test: `server/test/umur-piutang.test.js`

**Interfaces:**
- Consumes: `ambilOperasional("piutang")`, `mulaiTiruan`, dan `contohPiutang` dari Task 1.
- Produces:
  - Menu `{ kode: "umur_piutang", nama: "Umur Piutang", jenis: "laporan", path: "/penjualan/umur-piutang",
    aksi: ["lihat"] }` di modul `{ kode: "penjualan", nama: "Penjualan" }`.
  - `KELOMPOK_UMUR` adalah urutan kunci umur di Global Constraints. `SEGMEN` adalah
    `["maklon","retail","horeca","modern_trade","tanpa"]`.
  - `susunUmurPiutang(data, { segmen = null } = {})` mengembalikan:
    ```
    { diperbarui: generated_at, hari_ini: hari_ini_jakarta,
      total: { jumlah_pelanggan, jumlah_dokumen, sisa, harus_dikembalikan, sisa_per_umur: {5 kunci} },
      pelanggan: [{ kunci, kode, nama, jumlah_dokumen, sisa, harus_dikembalikan, sisa_per_umur,
                    dokumen: [{ jenis_dokumen, id_dokumen, nomor_dokumen, nomor_po_klien, segmen, tanggal_dokumen,
                                jatuh_tempo, total_tagihan, total_retur, dibayar, dikembalikan, sisa,
                                harus_dikembalikan, umur_piutang, status, url_operasional }] }] }
    ```
    - Semua uang berupa teks desimal (`dariSen`).
    - Hanya dokumen dengan sisa > 0 atau harus dikembalikan > 0.
    - Pelanggan diurutkan dari sisa terbesar, lalu nama. Dokumen diurutkan dari tanggal tertua.
    - `kunci` = `customer.id`, atau `nama:<nama huruf kecil>` kalau id kosong.
    - `url_operasional` hanya dipertahankan kalau diawali `https://`; selain itu `null`.
    - Angka yang tidak bisa dibaca `keSen`, atau `umur_piutang` yang tidak dikenal, melempar
      `AppError(502, "OPERASIONAL_TIDAK_DIKENALI", "Isi data piutang dari Operasional tidak bisa dibaca.")`.
  - `GET /api/umur-piutang?segmen=` (hak `umur_piutang` Lihat) mengembalikan:
    `{ ...susunUmurPiutang, basi, cek_gagal: [] }`.
    - Kalau `cekGagal` tidak kosong, jawabannya `{ diperbarui, basi, cek_gagal, total: null, pelanggan: [] }`, tanpa
      angka.

- [ ] **Step 1: Tulis `test/umur-piutang.test.js`**
  - Bagian murni, langsung memanggil `susunUmurPiutang(contohPiutang())`:
    - Dokumen lunas C-0002 tidak muncul. `total.jumlah_dokumen === 3`.
    - C-0001 punya 2 dokumen, dengan `sisa_per_umur.tanpa_jatuh_tempo` = sisa CO dan `telat_1_30` = sisa invoice PO.
    - Pelanggan tanpa `customer.id`: dua dokumen bernama "Toko Lama" dan "toko lama" menjadi satu pelanggan
      ber-`kunci` `nama:toko lama` (Review Focus 3).
    - Dokumen `harus_dikembalikan` 150000 dengan sisa 0: `total.harus_dikembalikan === "150000.00"`, dan jumlah
      `sisa_per_umur` = `total.sisa` (Review Focus 4).
    - `{ segmen: "tanpa" }` hanya memuat "Toko Lama". `{ segmen: "maklon" }` hanya memuat CO C-0001 (Review Focus 5).
    - `url_operasional: "javascript:alert(1)"` menjadi `null`.
    - `total_tagihan_rp: "abc"` → 502 `OPERASIONAL_TIDAK_DIKENALI`.
  - Bagian HTTP, dengan admin, server tiruan, dan env diarahkan ke tiruan:
    - `GET /umur-piutang` → 200, `basi === false`, dan `pelanggan[0].kode === "C-0001"`.
    - `?segmen=entah` → 400 "Lini bisnis tidak dikenal." (Review Focus 5).
    - Tiruan menjawab 401 → status **502** (bukan 401), dengan pesan "Kunci sambungan ke Operasional salah."
    - Env kosong → 503.
    - Cek Operasional gagal → `total === null`, `pelanggan.length === 0`, dan `cek_gagal` memuat nama ceknya.
    - Operator tanpa hak `umur_piutang` → 403. Operator dengan hak Lihat → 200.
    - `GET /navigasi` admin memuat modul `penjualan` berisi menu `umur_piutang`.
- [ ] **Step 2:** `npm run uji -- test/umur-piutang.test.js`. Expected: FAIL (modul belum ada).
- [ ] **Step 3: Implementasi**
  - Tulis `susunUmurPiutang` di service. Jumlahkan dalam BigInt sen dan tulis memakai `dariSen`.
  - Rute: `wajibMasuk`, lalu `wajibHak("umur_piutang","lihat")`. Validasi `segmen` dengan zod
    `z.enum(SEGMEN, { error: "Lini bisnis tidak dikenal." }).optional()`.
  - Tambahkan menu dan pasang rute di `app.js`.
- [ ] **Step 4:** Jalankan tes berkas ini (PASS), lalu `npm run uji` (semua lulus).

### Task 3: Halaman Penjualan › Umur Piutang

**Files:**
- Create: `client/src/entities/umur-piutang/index.js`
- Create: `client/src/pages/umur-piutang/UmurPiutangPage.jsx`
- Modify: `client/src/app/router/rute.jsx`
- Modify: `client/src/widgets/app-shell/model/ikon.js`
- Test: `npm run build` dan `npm run lint` di `client/`, lalu cek di browser lokal dengan server tiruan.

**Interfaces:**
- Consumes: `GET /api/umur-piutang` dari Task 2.
- Produces:
  - `useUmurPiutang(segmen)`: TanStack Query dengan kunci `["umur-piutang", segmen]`, memakai
    `placeholderData: keepPreviousData`.
  - Ikon dan keterangan:
    - `IKON_MODUL.penjualan` = `FiShoppingBag`;
    - `IKON_MENU.umur_piutang` = `FiCalendar`;
    - `KETERANGAN_MENU.umur_piutang` = "Piutang klien dari aplikasi Operasional per pelanggan, dikelompokkan
      menurut lama telatnya".

- [ ] **Step 1: Tulis halaman**
  - Bagian atas:
    - catatan baca-saja bergaya `CatatanOperasional` dengan teks persis "Data ini hanya bisa diubah di aplikasi
      Operasional" dan tombol "Buka di Operasional" ke `URL_OPERASIONAL`;
    - "Diperbarui terakhir {tanggalJam(diperbarui)}";
    - tombol "Muat ulang".
  - Saringan "Lini bisnis": Semua lini bisnis, Maklon, Retail, HORECA, Modern Trade, Tanpa lini bisnis.
  - Kartu ringkasan:
    - lima kelompok umur dan "Total belum dibayar";
    - "Harus dikembalikan ke klien" hanya kalau > 0.
  - Daftar pelanggan:
    - Di layar lebar berbentuk tabel dengan kolom Pelanggan (kode dan nama), lima kelompok, dan Total belum dibayar.
    - Satu baris bisa dibuka untuk melihat dokumennya, dengan kolom Nomor (CO / Invoice PO beserta nomor PO klien),
      Tanggal, Jatuh tempo, Lini bisnis, Tagihan, Retur, Dibayar, Sisa, Kelompok, dan tombol "Buka di Operasional".
    - Jatuh tempo CO ditulis "Tidak ada"; nilai kosong lain ditulis "—".
    - Di bawah `lg` setiap pelanggan dan dokumen menjadi kartu.
- [ ] **Step 2: Keadaan khusus**
  - Memuat: `TableSkeleton`.
  - Galat: `ErrorState` dengan pesan server dan tombol "Coba lagi".
  - `basi`: pita kuning "Aplikasi Operasional tidak bisa dihubungi. Yang tampil data terakhir per …".
  - `cek_gagal`: kotak peringatan "Angka piutang dari Operasional tidak lolos pemeriksaan, jadi tidak ditampilkan.
    Laporkan ke Lutfi:" beserta daftar nama cek. Tidak ada angka.
  - Kosong: `EmptyState` "Tidak ada piutang yang belum dibayar".
- [ ] **Step 3:** Daftarkan rute `/penjualan/umur-piutang` dengan `PerluHak menu="umur_piutang"`, lalu isi ikon dan
  keterangannya.
- [ ] **Step 4:** `npm run lint` dan `npm run build` di `client/`. Expected: bersih.
- [ ] **Step 5: Cek di browser lokal**
  - Jalankan server tiruan di port 4921 (`node test/operasional-tiruan.js 4921`), lalu server 4910 dengan
    `OPERASIONAL_API_URL=http://127.0.0.1:4921` dan `OPERASIONAL_API_KEY=kunci-uji`, ditambah client 5178. Pakai
    akun uji sekali pakai.
  - Periksa:
    - angka sama dengan `contohPiutang`;
    - saringan lini bisnis;
    - tombol "Buka di Operasional";
    - pita basi setelah tiruan dimatikan;
    - tidak ada yang melebar di 390 dan 820 px (diukur dengan skrip).
  - Matikan semua proses per PID dan hapus akun uji.

### Task 4: Dokumen dan rilis

- [ ] **Step 1:** Tambahkan entri "2026-11-25 — Tahap 3a" di `docs/PROGRESS.md`, dengan bagian diverifikasi, belum
  diverifikasi, dan kekurangan kecil.
- [ ] **Step 2:** Jalankan tinjauan akhir oleh pemeriksa terpisah. Perbaiki temuan penting dengan tes yang gagal dulu.
- [ ] **Step 3:** Laporkan ke Lutfi dan minta izin terpisah untuk:
  1. migrasi 006 ke `finance`;
  2. commit + push ke `main`, termasuk dokumen yang belum di-commit.
  Ingatkan bahwa `OPERASIONAL_API_KEY` dan `OPERASIONAL_API_URL` harus sudah ada di `eats-dashboard-server` sebelum
  halaman bisa dipakai di Vercel.
