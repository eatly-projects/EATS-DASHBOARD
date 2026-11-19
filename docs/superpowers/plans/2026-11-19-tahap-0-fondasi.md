# Tahap 0 — Fondasi Pembukuan ala Accurate: Rencana Kerja

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tahap ini membangun fondasi yang dipakai semua modul pembukuan berikutnya:
- kerangka tampilan seperti Accurate: bilah ikon modul, panel menu berwarna, tab menu, serta pola daftar lalu formulir;
- Pengaturan: Preferensi, Akses Grup, Pengguna, dan Penomoran;
- Perusahaan: Log Aktivitas dan kunci periode.

**Architecture:** Server (Express, `pg`) memegang satu daftar menu (registry). Registry itu dipakai untuk tiga hal:
1. hak akses per menu, yang diperiksa di server;
2. isi navigasi yang dikirim ke browser;
3. isi matriks Akses Grup.

Setiap perubahan data menulis Log Aktivitas di transaksi database yang sama. Browser menampilkan setiap menu sebagai tab yang tetap hidup walau tidak dibuka (memakai prop `location` milik `<Routes>`), sehingga isian formulir tidak hilang saat pindah tab. Pengujian dan pengembangan lokal memakai schema `finance_uji`. Schema `finance` (production) baru dimigrasi saat rilis dan hanya dengan izin Lutfi.

**Tech Stack:** Express 5, `pg`, zod, bcryptjs, `node:test` (server). Vite + React 18 (JavaScript), Tailwind, shadcn/Radix, TanStack Query, Zustand, react-router-dom 6, react-icons, react-hot-toast (client). Tidak ada dependency baru.

**Spec:** `docs/RENCANA-AKUNTANSI.md` (§4 Tampilan, §5 Prinsip, §6 Tahap 0). Gambar acuan: halaman bantuan resmi help.accurate.id, dilihat 2026-11-19 (lihat "Acuan tampilan" di bawah).

## Global Constraints

- **Git:** jangan commit atau push tanpa izin Lutfi di chat; izin berlaku per tindakan. Kerjakan di branch `tahap-0-fondasi`, dibuat dari `main`. Setiap task berakhir di *checkpoint* tanpa commit.
- **Database bos:** schema `public`, `pos`, `operation_v2`, dan `marketing` tidak boleh tersentuh. Boomboo Operations tidak diubah sama sekali (larangan bos).
- **Schema uji:**
  - Tes otomatis dan dev server lokal memakai `DB_SCHEMA=finance_uji`.
  - Migrasi ke `finance` hanya di Task 14, dengan izin Lutfi.
  - Tes hanya boleh menyentuh baris buatannya sendiri: email berakhiran `@uji.test`, nama berawalan `UJI `.
- **Rahasia:** jangan pernah mencetak isi `.env`, kata sandi, atau hash.
- **Port:** server 4910 dan client 5178. Jangan pakai port 4000 atau 5173. Matikan proses per PID, dan jangan tinggalkan server berjalan.
- **Teks di layar:**
  - bahasa Indonesia, **tanpa singkatan**;
  - rentang tanggal ditulis eksplisit ("13–19 Nov 2026");
  - kosong ditulis "—", bukan Rp0 atau 0;
  - angka dan nama tidak dipotong;
  - tidak ada ID mentah atau istilah teknis.
- **Perilaku layar:**
  - skeleton saat memuat;
  - toast untuk setiap mutation, lewat `meta`, dan toast saat query gagal (pola `queryClient.js`);
  - kolom kata sandi punya tombol lihat.
- **Responsif:** HP (390 px), tablet (820 px), dan desktop (1440 px) dicek sebelum melapor.
- **Tiruan Accurate:**
  - Yang ditiru: susunan, pola, dan istilah.
  - Yang tidak ditiru: logo, nama "Accurate", ikon, dan gambar Accurate.
  - Warna merek tetap merah cabai (`--primary`), dan ikon memakai `react-icons/fi`.
- **Istilah level pengguna:** di layar, nilai `admin` ditulis "Administrator" dan `staf` ditulis "Operator". Nilai di database tidak berubah.

## Acuan tampilan (dari help.accurate.id)

- **Bilah atas:** logo dan nama aplikasi di kiri. Nama perusahaan, nama pengguna, dan avatar di kanan.
- **Baris tab di bawah bilah atas:**
  - "Dashboard" selalu ada dan tidak bisa ditutup.
  - Setiap menu yang dibuka menjadi tab dengan tombol ×.
  - Tab aktif berwarna merek.
  - Di ujung kanan ada tombol "N ⌄" berisi daftar tab yang terbuka.
- **Bilah ikon gelap di kiri:**
  - Satu ikon per modul, dengan keterangan saat ditunjuk.
  - Klik ikon membuka panel melayang berisi judul modul, garis merek, dan kotak menu (ikon dan nama) dalam 4 kolom.
  - Warna kotak menunjukkan jenis menu: **biru** data induk, **hijau** transaksi, **oranye** pengaturan, **ungu** laporan.
- **Di dalam tab menu:**
  - Baris sub-tab berisi tombol daftar (ikon daftar, hijau) dan satu sub-tab per data yang dibuka ("Data baru ×", atau nama datanya ×).
- **Layar daftar:**
  - Baris chip filter ("Tanggal: Semua ⌄").
  - Tombol muat ulang, kolom cari, dan kotak jumlah data.
  - Tabel dengan kepala gelap.
  - Klik baris membuka sub-tab formulir.
- **Formulir:**
  - Tab di dalam formulir (mis. "Umum", "Hak Akses").
  - Kolom tombol aksi di kanan (Simpan, Hapus).
- **Hak Akses:**
  - Daftar modul di kiri.
  - Tabel menu di kanan dengan kotak centang per tindakan.
  - Hak akses hanya berlaku untuk Operator; Administrator selalu bisa semua.
- **Penomoran:** nama, tipe transaksi, kapan nomor urut diulang (tidak, harian, bulanan, tahunan), jumlah digit nomor urut, susunan bagian (teks, tahun, tahun singkat, bulan, bulan Romawi, hari, nomor urut), dan contoh hasil.
- **Log Aktivitas:**
  - Filter: Tanggal, Tipe Transaksi, Pengguna, Tipe Tindakan.
  - Kolom: tanggal transaksi, nomor/nama referensi, tindakan, tipe, waktu, pengguna, email, alamat IP.
  - Detail menampilkan perubahan dengan pilihan "Hanya tampilkan perubahan".

## Keputusan Claude (bisa dibatalkan Lutfi)

1. **Penyetuju Transaksi pindah ke Tahap 1.** Alasannya, fitur ini butuh transaksi untuk disetujui, dan transaksi pertama (Jurnal Umum) baru ada di Tahap 1.
2. **Preferensi di Tahap 0 hanya berisi tab "Perusahaan" dan "Pembatasan".** Tab lain (Pajak, Penjualan, Pembelian, Akun Perkiraan) ditambahkan di tahap masing-masing.
3. **Modul Pengaturan khusus Administrator** dan tidak muncul di matriks Hak Akses.
4. **Modul yang belum dibangun tidak ditampilkan** di bilah ikon.
5. **Tab "Dashboard" berisi halaman Ringkasan laba rugi** yang sekarang. Modul "Laporan" berisi "Ringkasan Laba Rugi" (membuka tab Dashboard) dan "Unggah Laporan".
6. **Sidebar lama yang bisa dibuka-tutup diganti bilah ikon ala Accurate,** yang selalu ringkas dan menunya muncul di panel melayang. Akibatnya fitur "sidebar bisa dibuka-tutup" (commit `f391daf`) hilang.
7. **Bilah ikon berwarna merah cabai gelap**, bukan biru Accurate.
8. **Tab di dalam formulir mengikuti Accurate di tablet dan desktop.** Di HP isinya disusun bertumpuk ke bawah, sesuai selera Lutfi yang lebih suka section bertumpuk.
9. **Penomoran yang sudah pernah dipakai tidak bisa diubah formatnya**, supaya tidak ada nomor kembar. Namanya dan status "bawaan" tetap bisa diubah.
10. **Log Aktivitas tidak bisa diubah atau dihapus oleh aplikasi.** Peran `finance_app` hanya boleh menambah baris baru.

## Review Focus

1. **Tes atau skrip tidak sengaja jalan di `finance` (production).** Perilaku yang diharapkan: tes langsung berhenti dengan pesan jelas. Diuji di Task 1 (`pastikanSkemaUji`).
2. **Operator yang belum punya akses grup, atau grupnya baru dicabut.** Yang diharapkan: tampil pesan "Akun Anda belum diberi akses…", tidak layar kosong atau galat. Server menjawab 403 `TANPA_HAK` dengan pesan yang jelas. Diuji di Task 3 dan Task 8.
3. **Dua orang menyimpan transaksi di detik yang sama.** Nomornya tidak boleh kembar. Diuji di Task 6 dengan 20 transaksi paralel.
4. **Admin mengubah format penomoran yang sudah dipakai.** Yang diharapkan: ditolak 409 dengan saran membuat penomoran baru. Diuji di Task 6.
5. **Link lama di bookmark, atau tab tersimpan untuk menu yang haknya sudah dicabut.** Yang diharapkan: link lama dialihkan ke alamat baru, dan tab yang tidak berhak ikut tertutup. Dicek di Task 9 (`saring`) dan di checklist browser.

---

### Task 1: Schema uji dan alat bantu tes

**Files:**
- Modify: `server/migrations/001_skema_awal.sql`. Ganti setiap `schema finance` yang tertulis langsung dengan blok `do $$ … execute format('… %I …', current_schema()) … $$`. Ini berlaku untuk `comment on schema` dan semua `revoke`. Berkas ini sudah terpasang di `finance`, jadi tidak akan dijalankan ulang di sana.
- Modify: `server/migrations/jalankan.js`. Ubah `SKEMA_LAIN` menjadi `["public","pos","operation_v2","marketing","finance","finance_uji"].filter((s) => s !== SKEMA)`.
- Create: `server/scripts/izin-skema-uji.js`. Polanya sama dengan `buat-peran-aplikasi.js` (tanpa `--ya` hanya menampilkan). Isinya:
  - `grant usage`, lalu `select, insert, update, delete` pada semua tabel, ditambah `alter default privileges` untuk tabel dan sequence di `finance_uji`, kepada `finance_app`;
  - `revoke` pada `migrasi_terpasang`, serta `revoke insert, update, delete` pada `unit_usaha` dan `pos_akun`.
  - **Dilarang:** `alter role`, mengganti kata sandi, atau menulis `.env`. Kata sandi `finance_app` dipakai juga oleh Vercel.
  - Tolak jalan bila `DB_SCHEMA !== "finance_uji"`.
- Create: `server/scripts/salin-akun-ke-uji.js`. Tanpa `--ya` hanya menampilkan. Isinya `insert into finance_uji.pengguna select … from finance.pengguna on conflict (id) do update …` lewat `MIGRASI_DATABASE_URL`, lalu mencetak jumlah baris, tanpa email.
- Create: `server/test/lingkungan-uji.js`. Isinya `process.env.DB_SCHEMA = "finance_uji"; process.env.NODE_ENV = "test";`
- Create: `server/test/bantu.js`
- Create: `server/test/skema-uji.test.js`
- Modify: `server/package.json`. Script `"uji"` menjadi `node --import ./test/lingkungan-uji.js --test --test-concurrency=1 "test/*.test.js"`. Tambahkan `"izin:uji"` dan `"akun:uji"`.

**Interfaces (Produces, `server/test/bantu.js`):**
- `pastikanSkemaUji(db = pool): Promise<void>`. Melempar `Error("Tes hanya boleh di schema finance_uji, sekarang <x>")` bila `select current_schema()` bukan `finance_uji`.
- `buatPenggunaUji({ peran = "staf", aksesGrupId = null } = {}): Promise<{ id, email, sandi, nama }>`
  - email `uji-<acak>@uji.test`, sandi `sandi-uji-<acak>`, nama `UJI <acak>`;
  - hash memakai `bcrypt.hash(…, 10)`;
  - kolom `akses_grup_id` hanya diisi bila ada (kolom ini baru muncul di Task 2).
- `bersihkanDataUji(): Promise<void>`. Menghapus `pengguna` dengan email `%@uji.test`. Task berikutnya **menambah** urutan hapusnya.
- `jalankanAplikasi(): Promise<{ url, tutup }>`. Menjalankan `buatAplikasi().listen(0)`.
- `masuk(url, { email, sandi }): Promise<string>`. Memanggil `POST /api/auth/masuk` dan mengembalikan isi header `cookie`.
- `panggil(url, cookie, method, path, body?): Promise<{ status, body }>`. Memakai `fetch` bawaan Node 22.
- `selesai(): Promise<void>`. Memanggil `bersihkanDataUji()` lalu `pool.end()`. Dipakai di `after()` setiap berkas tes DB.

- [ ] **Step 1: Buat branch.**
  - Run: `git switch -c tahap-0-fondasi`
  - Expected: `Switched to a new branch`
- [ ] **Step 2: Siapkan schema uji.** Langkah ini perlu izin Lutfi lebih dulu, karena membuat schema baru di database bos.
  - Run (PowerShell, di `server/`): `$env:DB_SCHEMA='finance_uji'; npm run migrate`
  - Periksa: tujuannya `finance_uji`, dan yang belum terpasang `001…`, `002…`.
  - Run: `$env:DB_SCHEMA='finance_uji'; npm run migrate -- --ya`
  - Expected: `terpasang: 001_skema_awal.sql`, `terpasang: 002_ebitda_tambah_bunga.sql`, dan `Schema lain TIDAK berubah.` (termasuk `finance`)
- [ ] **Step 3: Pasang hak akses dan salin akun.**
  - Run: `$env:DB_SCHEMA='finance_uji'; npm run izin:uji -- --ya; npm run akun:uji -- --ya`
  - Expected: hak terpasang, dan `3 akun disalin`.
- [ ] **Step 4: Tulis tes yang gagal.** Berkas `server/test/skema-uji.test.js`:

```js
test("tes berjalan di finance_uji, bukan finance", async () => {
  await pastikanSkemaUji(); // tidak melempar
  const { rows } = await kueri("select current_schema() as s");
  assert.equal(rows[0].s, "finance_uji");
});
test("pastikanSkemaUji menolak schema lain", async () => {
  const k = await pool.connect();
  try {
    await k.query("set search_path to finance");
    await assert.rejects(() => pastikanSkemaUji(k), /hanya boleh di schema finance_uji/);
  } finally { await k.query("set search_path to finance_uji, extensions"); k.release(); }
});
test("pengguna uji bisa masuk lewat API", async () => {
  const p = await buatPenggunaUji({ peran: "admin" });
  const app = await jalankanAplikasi();
  try { const cookie = await masuk(app.url, p); assert.match(cookie, /eats_sesi=/); } finally { await app.tutup(); }
});
```

  `pastikanSkemaUji(db = pool)` menerima `db` opsional supaya tes kedua bisa memakai koneksi lain.
- [ ] **Step 5: Jalankan tes, harus gagal.**
  - Run: `npm run uji`
  - Expected: FAIL, karena `bantu.js` belum ada.
- [ ] **Step 6: Implementasikan `bantu.js` sesuai Interfaces di atas.**
- [ ] **Step 7: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: semua lulus, termasuk `hitung.test.js` yang lama.
- [ ] **Step 8: Alihkan dev lokal ke schema uji.** Ubah baris `DB_SCHEMA=finance` menjadi `DB_SCHEMA=finance_uji` di `.env` akar dengan perintah `sed`, tanpa mencetak isi berkas.
  - Expected: `grep -c '^DB_SCHEMA=finance_uji$' .env` menghasilkan `1`.
  - Variabel Vercel tetap `finance`.
- [ ] **Step 9: Checkpoint.** Daftar berkas berubah, tanpa commit.

### Task 2: Migrasi 003, tabel fondasi

**Files:**
- Create: `server/migrations/003_fondasi_akuntansi.sql`
- Create: `server/test/migrasi-003.test.js`
- Modify: `server/test/bantu.js`. Ganti `bersihkanDataUji` dengan urutan berikut: `penomoran_counter` milik penomoran `UJI %`, lalu `penomoran` `UJI %`, lalu `pengguna` `%@uji.test` (set `akses_grup_id = null` dulu), lalu `akses_grup` `UJI %`. Log tidak dihapus, karena tidak bisa dihapus (Keputusan 10).

**Isi `003` (diputuskan di sini):**

```sql
create table perusahaan (
  id boolean primary key default true check (id),            -- selalu satu baris
  nama text not null check (btrim(nama) <> ''),
  alamat text not null default '', telepon text not null default '', email text not null default '',
  npwp text not null default '' check (npwp ~ '^([0-9]{15,16})?$'),
  mulai_periode date not null check (extract(day from mulai_periode) = 1),
  kunci_sampai date,
  diubah_at timestamptz not null default now(),
  diubah_oleh uuid references pengguna (id) on delete set null
);
insert into perusahaan (nama, mulai_periode) values ('PT Enak Aplikasi Tirta Sejahtera', '2027-01-01');

create table akses_grup (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (btrim(nama) <> ''), keterangan text not null default '',
  dibuat_at timestamptz not null default now(), diubah_at timestamptz not null default now()
);
create unique index akses_grup_nama_unik on akses_grup (lower(nama));
create table akses_grup_hak (
  grup_id uuid not null references akses_grup (id) on delete cascade,
  menu_kode text not null check (menu_kode ~ '^[a-z][a-z0-9_]*$'),
  lihat boolean not null default false, buat boolean not null default false,
  ubah boolean not null default false, hapus boolean not null default false,
  primary key (grup_id, menu_kode),
  check (lihat or not (buat or ubah or hapus))
);
alter table pengguna add column akses_grup_id uuid references akses_grup (id) on delete restrict;

create table penomoran (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (btrim(nama) <> ''),
  tipe_transaksi text not null check (tipe_transaksi ~ '^[a-z][a-z0-9_]*$'),
  format jsonb not null check (jsonb_typeof(format) = 'array'),
  digit_counter int not null check (digit_counter between 1 and 10),
  reset text not null check (reset in ('tidak', 'hari', 'bulan', 'tahun')),
  bawaan boolean not null default false,
  dibuat_at timestamptz not null default now(), diubah_at timestamptz not null default now()
);
create unique index penomoran_nama_unik on penomoran (lower(nama));
create unique index penomoran_satu_bawaan on penomoran (tipe_transaksi) where bawaan;
create table penomoran_counter (
  penomoran_id uuid not null references penomoran (id) on delete restrict,
  kunci_periode text not null,           -- '' | '2027' | '2027-01' | '2027-01-15'
  terakhir int not null check (terakhir > 0),
  primary key (penomoran_id, kunci_periode)
);
insert into penomoran (nama, tipe_transaksi, format, digit_counter, reset, bawaan) values
  ('Jurnal Umum', 'jurnal_umum',
   '[{"jenis":"teks","nilai":"JU."},{"jenis":"tahun"},{"jenis":"teks","nilai":"."},{"jenis":"bulan"},{"jenis":"teks","nilai":"."},{"jenis":"counter"}]',
   5, 'bulan', true);

create table log_aktivitas (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  pengguna_id uuid references pengguna (id) on delete set null,
  pengguna_nama text not null, pengguna_email text not null, alamat_ip text not null default '',
  tindakan text not null check (tindakan in ('buat', 'ubah', 'hapus')),
  menu_kode text not null, referensi text not null default '',
  tanggal_transaksi date, sebelum jsonb, sesudah jsonb
);
create index log_aktivitas_waktu on log_aktivitas (waktu desc);
create index log_aktivitas_menu on log_aktivitas (menu_kode, waktu desc);
```

Di akhir berkas, tambahkan blok `do $$` yang hanya jalan bila peran `finance_app` ada:
- `revoke update, delete on log_aktivitas from finance_app`
- `revoke insert, delete on perusahaan from finance_app`

- [ ] **Step 1: Tulis tes yang gagal** (`migrasi-003.test.js`):
  - satu baris `perusahaan` dengan `mulai_periode = '2027-01-01'`;
  - penomoran `Jurnal Umum` dengan `bawaan = true`;
  - `insert` ke `log_aktivitas` berhasil, tetapi `update log_aktivitas` dan `delete from log_aktivitas` ditolak dengan galat `permission denied`;
  - `insert into perusahaan` kedua ditolak.
- [ ] **Step 2: Jalankan tes.**
  - Run: `npm run uji`
  - Expected: FAIL (`relation "perusahaan" does not exist`).
- [ ] **Step 3: Tulis `003_fondasi_akuntansi.sql` seperti di atas, lalu migrasi `finance_uji`.**
  - Run: `$env:DB_SCHEMA='finance_uji'; npm run migrate -- --ya`
  - Expected: `terpasang: 003_fondasi_akuntansi.sql`, `Schema lain TIDAK berubah.`
- [ ] **Step 4: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: PASS.
- [ ] **Step 5: Checkpoint.**

### Task 3: Daftar menu, hak akses, dan navigasi (server)

**Files:**
- Create: `server/src/shared/akses/menu.js`
- Create: `server/src/shared/akses/hak.js`
- Create: `server/src/features/navigasi/navigasi.routes.js`. `GET /` (`wajibMasuk`) mengembalikan `susunNavigasi(await muatHak(req.pengguna))`.
- Modify: `server/src/shared/middleware/auth.js`. `wajibMasuk` ikut membaca `akses_grup_id`. Pesan `hanyaAdmin` diganti: `"Menu Pengaturan hanya untuk Administrator."`
- Modify: `server/src/app.js`. Pasang `api.use("/navigasi", navigasiRouter)`.
- Test: `server/test/hak.test.js`

**Interfaces (Produces):**
- `menu.js`:
  - `JENIS = ["data_induk","transaksi","pengaturan","laporan"]`
  - `MODUL`, dengan isi persis seperti ini (urutan = urutan di bilah ikon):

    ```js
    [{ kode: "pengaturan", nama: "Pengaturan", khususAdministrator: true, menu: [
        { kode: "preferensi", nama: "Preferensi", jenis: "pengaturan", path: "/pengaturan/preferensi" },
        { kode: "akses_grup", nama: "Akses Grup", jenis: "pengaturan", path: "/pengaturan/akses-grup" },
        { kode: "pengguna", nama: "Pengguna", jenis: "pengaturan", path: "/pengaturan/pengguna" },
        { kode: "penomoran", nama: "Penomoran", jenis: "pengaturan", path: "/pengaturan/penomoran" } ] },
     { kode: "perusahaan", nama: "Perusahaan", menu: [
        { kode: "log_aktivitas", nama: "Log Aktivitas", jenis: "laporan", path: "/perusahaan/log-aktivitas", aksi: ["lihat"] } ] },
     { kode: "laporan", nama: "Laporan", menu: [
        { kode: "ringkasan_laba_rugi", nama: "Ringkasan Laba Rugi", jenis: "laporan", path: "/", aksi: ["lihat"] },
        { kode: "unggah_laporan", nama: "Unggah Laporan", jenis: "transaksi", path: "/laporan/unggah",
          aksi: ["lihat","buat","ubah","hapus"],
          keteranganAksi: { buat: "Mengunggah berkas dan meminta AI membacanya", ubah: "Menyetujui hasil bacaan AI", hapus: "Membatalkan unggahan" } } ] }]
    ```

    Menu tanpa `aksi` berarti memakai keempat aksi.
  - `cariMenu(kode) -> { ...menu, modul } | undefined`
  - `menuMatriks() -> [{ kode, nama, menu: [{ kode, nama, aksi, keteranganAksi }] }]`, berisi modul yang bukan `khususAdministrator`.
- `hak.js`:
  - `AKSI = ["lihat","buat","ubah","hapus"]`; `NAMA_AKSI = { lihat: "Lihat", buat: "Buat", ubah: "Ubah", hapus: "Hapus" }`.
  - `muatHak(pengguna) -> Promise<Record<menuKode, { lihat, buat, ubah, hapus }>>`. Setiap menu selalu punya keempat kunci; aksi yang bukan milik menu bernilai `false`.
    - Administrator mendapat semua menu dengan semua `aksi` miliknya bernilai `true`.
    - Operator mendapat baris `akses_grup_hak` grupnya, terbatas pada menu non-khusus dan `aksi` yang dimiliki menu itu.
    - Operator tanpa grup mendapat `{}`.
  - `boleh(hak, menuKode, aksi) -> boolean`
  - `wajibHak(menuKode, aksi)`: middleware Express. Ia mengisi `req.hak ??= await muatHak(req.pengguna)`. Kalau tidak boleh, ia melempar `AppError(403, "TANPA_HAK", "Anda belum diberi hak <Aksi> di menu <Nama>. Minta Administrator menambahkannya di Pengaturan, menu Akses Grup.")`.
  - `susunNavigasi(hak) -> { modul: [{ kode, nama, menu: [{ kode, nama, jenis, path, hak }] }] }`. Hanya menu dengan `hak.lihat` yang masuk, dan modul tanpa menu dibuang.

- [ ] **Step 1: Tulis tes yang gagal** (`hak.test.js`):
  - `susunNavigasi({ log_aktivitas: { lihat: true, buat: false, ubah: false, hapus: false } })` → tepat satu modul `perusahaan` dengan satu menu `log_aktivitas`;
  - `boleh({}, "unggah_laporan", "lihat") === false`;
  - Administrator: `muatHak` punya `preferensi.ubah === true` dan `log_aktivitas.buat === false`;
  - Operator tanpa grup: `GET /api/navigasi` → `200` dengan `modul.length === 0`;
  - Operator dengan grup `UJI Log` (hak `log_aktivitas.lihat`, dimasukkan langsung lewat SQL): `modul.map(m => m.kode)` sama dengan `["perusahaan"]`;
  - Operator: `GET /api/pengguna` → `403`.
- [ ] **Step 2: Jalankan tes.**
  - Run: `npm run uji`
  - Expected: FAIL (modul belum ada).
- [ ] **Step 3: Implementasikan `menu.js`, `hak.js`, `navigasi.routes.js`, serta perubahan di `auth.js` dan `app.js`.**
- [ ] **Step 4: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: PASS.
- [ ] **Step 5: Checkpoint.**

### Task 4: Log Aktivitas (alat tulis) dan API Akses Grup

**Files:**
- Create: `server/src/shared/log/log.js`
- Create: `server/src/features/akses-grup/akses-grup.service.js`
- Create: `server/src/features/akses-grup/akses-grup.routes.js`. Middleware `wajibMasuk, hanyaAdmin`. Rute: `GET /menu` (menuMatriks), `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.
- Modify: `server/src/app.js`. Pasang `/akses-grup`.
- Test: `server/test/akses-grup.test.js`

**Interfaces (Produces):**
- `catatLog(db, req, { tindakan, menu, referensi = "", tanggalTransaksi = null, sebelum = null, sesudah = null }) -> Promise<void>`:
  - `db` adalah `pool` atau klien transaksi;
  - nama, email, dan id diambil dari `req.pengguna`; IP dari `req.ip`.
  - **Aturan potret:** kunci `sebelum` dan `sesudah` adalah **label untuk manusia** (mis. `"Nama grup"`), dan nilainya teks yang siap tampil. Jangan pernah memasukkan hash atau ID mentah.
- Body untuk `POST` dan `PUT` (zod):
  - `nama` 1–60 karakter, `keterangan` paling banyak 200;
  - `anggota` berupa `uuid[]`, paling banyak 200;
  - `hak` berupa `Record<menuKode, { lihat?, buat?, ubah?, hapus? }>`.
- Service:
  - `daftarGrup() -> [{ id, nama, keterangan, jumlah_anggota }]`
  - `ambilGrup(id) -> { id, nama, keterangan, anggota: [{ id, nama, email }], hak }`
  - `simpanGrup(req, id | null, body) -> grup`. Satu transaksi: tulis grup, lalu `delete` + `insert` hak, lalu atur `pengguna.akses_grup_id` (anggota baru diisi, anggota lama yang tidak tercantum dikosongkan), lalu `catatLog`.
  - `hapusGrup(req, id)`
- Aturan dan pesannya:
  - Menu yang tidak dikenal → 400 `"Menu <kode> tidak dikenal."`
  - Aksi yang bukan milik menu → 400 `"Menu Log Aktivitas hanya punya hak Lihat."`
  - Buat, Ubah, atau Hapus otomatis menyalakan Lihat.
  - Anggota yang Administrator → 400 `"<Nama> adalah Administrator dan sudah bisa membuka semua menu, jadi tidak perlu akses grup."`
  - Anggota yang tidak dikenal → 400.
  - Nama kembar → 409 `"Nama akses grup itu sudah dipakai."`
  - Hapus grup yang masih punya anggota → 409 `"Akses grup ini masih dipakai <N> pengguna. Pindahkan mereka ke grup lain dulu."`
- Potret log: `{ "Nama grup", "Keterangan", "Anggota": "<nama, dipisah koma>" }`, ditambah satu kunci per menu yang punya hak, mis. `"Hak — Unggah Laporan": "Lihat, Buat"`.

- [ ] **Step 1: Tulis tes yang gagal:**
  - membuat `UJI Keuangan` dengan hak `unggah_laporan: { buat: true }` → `GET /:id` memberi `hak.unggah_laporan` sama dengan `{ lihat: true, buat: true, ubah: false, hapus: false }`;
  - nama kembar → `409`;
  - anggota Administrator → `400`;
  - `hak.log_aktivitas.buat` → `400`;
  - hapus grup yang masih punya anggota → `409`; setelah anggotanya dikeluarkan lewat `PUT` → `200`;
  - log punya 3 baris untuk referensi `UJI Keuangan` (`buat`, `ubah`, `hapus`), dan `sesudah["Nama grup"] === "UJI Keuangan"` pada baris `buat`;
  - Operator → `403`.
- [ ] **Step 2: Jalankan tes.**
  - Run: `npm run uji`
  - Expected: FAIL.
- [ ] **Step 3: Implementasikan `log.js`, service, dan rute akses grup.**
- [ ] **Step 4: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: PASS.
- [ ] **Step 5: Checkpoint.**

### Task 5: API Pengguna, Administrator/Operator, dan akses grup

**Files:**
- Modify: `server/src/features/pengguna/pengguna.routes.js`
- Test: `server/test/pengguna.test.js`

**Interfaces:**
- Consumes: `catatLog` (Task 4).
- `KOLOM` daftar ditambah `akses_grup_id` dan `akses_grup_nama` (lewat `left join akses_grup`).
- Body create dan patch menerima `akses_grup_id: uuid | null` (opsional).
  - Bila hasil akhirnya `peran = "admin"`, `akses_grup_id` dipaksa `null`.
  - Grup yang tidak dikenal → 400 `"Akses grup tidak ditemukan."`
- Aturan lama tetap berlaku: kata sandi minimal 8 karakter, tidak boleh menonaktifkan atau menurunkan diri sendiri.
- Potret log: `{ "Nama", "Email", "Level": "Administrator"|"Operator", "Akses grup": "<nama>"|"—", "Status": "Aktif"|"Nonaktif" }`. Ganti kata sandi hanya menulis `sesudah["Kata sandi"] = "Diganti"`.

- [ ] **Step 1: Tulis tes yang gagal:**
  - membuat Operator dengan `akses_grup_id` grup `UJI A` → `GET /api/pengguna` memuat `akses_grup_nama === "UJI A"`;
  - `PATCH peran: "admin"` → `akses_grup_id === null`;
  - `PATCH kata_sandi` → log terakhir pengguna itu punya `sesudah["Kata sandi"] === "Diganti"`, dan `JSON.stringify` seluruh baris log tidak mengandung `"$2"` (awalan hash bcrypt);
  - grup yang tidak dikenal → `400`.
- [ ] **Step 2: Jalankan tes.**
  - Run: `npm run uji`
  - Expected: FAIL.
- [ ] **Step 3: Implementasikan.**
- [ ] **Step 4: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: PASS.
- [ ] **Step 5: Checkpoint.**

### Task 6: Penomoran (mesin dan API)

**Files:**
- Create: `server/src/features/penomoran/format.js` (fungsi murni)
- Create: `server/src/features/penomoran/tipe-transaksi.js`. Isinya `TIPE_TRANSAKSI = [{ kode: "jurnal_umum", nama: "Jurnal Umum" }]`; tahap berikutnya menambah isinya.
- Create: `server/src/features/penomoran/penomoran.service.js`
- Create: `server/src/features/penomoran/penomoran.routes.js`. Middleware `wajibMasuk, hanyaAdmin`. Rute: `GET /tipe`, `GET /`, `POST /pratinjau`, `POST /`, `PUT /:id`, `DELETE /:id`.
- Modify: `server/src/app.js`. Pasang `/penomoran`.
- Test: `server/test/penomoran-format.test.js`, `server/test/penomoran.test.js`

**Interfaces (Produces):**
- `format.js`:
  - `KOMPONEN = ["teks","tahun","tahun_singkat","bulan","bulan_romawi","hari","counter"]`
  - `susunNomor({ format, digit_counter }, tanggal /* 'YYYY-MM-DD' */, counter) -> string`. Tanggal dibaca dari teksnya langsung, tanpa `Date`, supaya tidak bergeser karena zona waktu. Nomor urut diberi nol di depan sampai `digit_counter`, dan **tidak pernah dipotong**.
  - `kunciPeriode(reset, tanggal) -> "" | "2027" | "2027-01" | "2027-01-15"`
  - `periksaFormat({ format, digit_counter, reset }) -> string | null`. Mengembalikan pesan galat dalam bahasa Indonesia. Aturannya:
    - jumlah bagian 1–12;
    - tepat satu `counter` (`"Susunan nomor harus punya tepat satu Nomor urut."`);
    - teks 1–20 karakter dan bukan spasi saja;
    - `digit_counter` 1–10;
    - reset `tahun` wajib memuat tahun atau tahun singkat;
    - reset `bulan` wajib memuat tahun dan bulan (atau bulan Romawi), dengan pesan `"Nomor yang diulang setiap bulan harus memuat Tahun dan Bulan, supaya nomor bulan ini tidak sama dengan nomor bulan lalu."`;
    - reset `hari` wajib memuat tahun, bulan, dan hari.
- `penomoran.service.js`:
  - `ambilNomorBerikut(klien, tipeTransaksi, tanggal, penomoranId = null) -> Promise<string>`:
    - wajib dipanggil di dalam transaksi dokumennya;
    - tanpa `penomoranId`, yang dipakai adalah penomoran bawaan untuk tipe itu;
    - kalau tidak ada penomoran → `AppError(409, "PENOMORAN_BELUM_ADA", "Belum ada penomoran bawaan untuk <nama tipe>. Buat di Pengaturan, menu Penomoran.")`;
    - nomor urut diambil dengan `insert … values ($1,$2,1) on conflict (penomoran_id, kunci_periode) do update set terakhir = penomoran_counter.terakhir + 1 returning terakhir`.
  - `daftarPenomoran() -> [{ id, nama, tipe_transaksi, tipe_nama, format, digit_counter, reset, bawaan, terpakai, contoh }]`:
    - `terpakai` = jumlah `terakhir` di semua periode;
    - `contoh` = nomor berikutnya untuk tanggal hari ini (zona Asia/Jakarta), tanpa menaikkan nomor urut.
  - `simpanPenomoran(req, id | null, body)` dan `hapusPenomoran(req, id)`, keduanya dengan `catatLog`.
- Aturan API:
  - `POST /pratinjau { format, digit_counter, reset }` → `{ contoh, galat }`. Galat format tidak membuat permintaan gagal.
  - Penomoran yang `terpakai > 0`: mengubah `format`, `digit_counter`, `reset`, atau `tipe_transaksi` → 409 `"Penomoran ini sudah dipakai untuk <N> nomor, jadi susunannya tidak bisa diubah supaya tidak ada nomor kembar. Buat penomoran baru."`. Menghapusnya juga → 409.
  - Menghapus penomoran bawaan → 409 `"Penomoran bawaan tidak bisa dihapus. Jadikan penomoran lain sebagai bawaan dulu."`
  - `bawaan: true` mematikan bawaan lain dengan tipe yang sama, di transaksi yang sama.
  - `bawaan: false` pada satu-satunya bawaan → 400 `"Setiap tipe transaksi butuh satu penomoran bawaan."`
  - Nama kembar → 409.
- Potret log: `{ "Nama", "Tipe transaksi", "Contoh nomor", "Jumlah digit nomor urut", "Nomor urut diulang": "Tidak pernah"|"Setiap hari"|"Setiap bulan"|"Setiap tahun", "Bawaan": "Ya"|"Tidak" }`.

- [ ] **Step 1: Tulis tes fungsi murni yang gagal** (`penomoran-format.test.js`):

```js
const JU = { format: [{jenis:"teks",nilai:"JU."},{jenis:"tahun"},{jenis:"teks",nilai:"."},{jenis:"bulan"},{jenis:"teks",nilai:"."},{jenis:"counter"}], digit_counter: 5 };
assert.equal(susunNomor(JU, "2027-01-15", 1), "JU.2027.01.00001");
assert.equal(susunNomor({ format: [{jenis:"teks",nilai:"INV/"},{jenis:"bulan_romawi"},{jenis:"teks",nilai:"/"},{jenis:"tahun_singkat"},{jenis:"teks",nilai:"/"},{jenis:"counter"}], digit_counter: 3 }, "2027-07-21", 42), "INV/VII/27/042");
assert.equal(susunNomor(JU, "2027-01-15", 123456), "JU.2027.01.123456");
assert.equal(susunNomor({ format: [{jenis:"hari"},{jenis:"counter"}], digit_counter: 1 }, "2027-12-09", 7), "097");
assert.equal(kunciPeriode("bulan", "2027-01-15"), "2027-01");
assert.equal(kunciPeriode("tidak", "2027-01-15"), "");
assert.match(periksaFormat({ format: [{jenis:"teks",nilai:"JU"},{jenis:"counter"}], digit_counter: 5, reset: "bulan" }), /Tahun dan Bulan/);
assert.match(periksaFormat({ format: [{jenis:"tahun"}], digit_counter: 5, reset: "tidak" }), /tepat satu Nomor urut/);
assert.equal(periksaFormat({ ...JU, reset: "bulan" }), null);
```

- [ ] **Step 2: Jalankan tes.**
  - Run: `npm run uji`
  - Expected: FAIL.
- [ ] **Step 3: Implementasikan `format.js`.**
- [ ] **Step 4: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: tes format PASS.
- [ ] **Step 5: Tulis tes database yang gagal** (`penomoran.test.js`):
  - **20 nomor paralel tidak kembar:** 20 panggilan paralel `dalamTransaksi(k => ambilNomorBerikut(k, "jurnal_umum", "2027-03-10", idUji))` pada penomoran `UJI Paralel` (reset bulan, `bawaan: false`) → 20 nomor berbeda, `JU.2027.03.00001` sampai `…00020`.
  - **Bulan berganti, nomor urut mulai lagi:** dua nomor Maret, lalu `"2027-04-01"` menghasilkan `…04.00001`.
  - **Nomor batal kalau transaksi batal:** transaksi yang dibatalkan (melempar setelah `ambilNomorBerikut`) tidak memakan nomor. Nomor berikutnya tetap berurutan.
  - **Penomoran terpakai tidak bisa diubah:** `PUT` mengubah `digit_counter` → `409`, sedangkan `PUT` yang hanya mengganti `nama` → `200`.
  - **Bawaan terlindungi:** `DELETE` penomoran bawaan seed → `409`.
  - **Pratinjau:** `POST /pratinjau` dengan format JU → `contoh` cocok dengan `/^JU\.\d{4}\.\d{2}\.\d{5}$/`.
- [ ] **Step 6: Jalankan tes.**
  - Run: `npm run uji`
  - Expected: FAIL.
- [ ] **Step 7: Implementasikan service, rute, dan `tipe-transaksi.js`.**
- [ ] **Step 8: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: PASS.
- [ ] **Step 9: Checkpoint.**

### Task 7: Preferensi dan kunci periode

**Files:**
- Create: `server/src/shared/format.js`. Isinya `tanggalPanjang("2026-12-31") -> "31 Desember 2026"`.
- Create: `server/src/features/preferensi/periode.js`
- Create: `server/src/features/preferensi/preferensi.routes.js`. `GET /` cukup `wajibMasuk`, karena nama perusahaan tampil di bilah atas untuk semua orang. `PUT /` memakai `wajibMasuk, hanyaAdmin`.
- Modify: `server/src/app.js`. Pasang `/preferensi`.
- Test: `server/test/preferensi.test.js`

**Interfaces (Produces):**
- `GET /api/preferensi` → `{ nama, alamat, telepon, email, npwp, mulai_periode, kunci_sampai }`
- `PUT /api/preferensi` menerima kolom yang sama, semuanya wajib dikirim:
  - `npwp` boleh kosong atau 15–16 angka, dengan pesan `"NPWP harus 15 atau 16 angka, tanpa titik dan strip."`;
  - `mulai_periode` harus `YYYY-MM-01`;
  - `kunci_sampai` berupa `YYYY-MM-DD | null`;
  - mengisi `diubah_at` dan `diubah_oleh`, lalu `catatLog` dengan menu `preferensi` dan referensi `"Preferensi"`;
  - potret log: `{ "Nama perusahaan", "Alamat", "Telepon", "Email", "NPWP", "Periode akuntansi dimulai", "Transaksi dikunci sampai": "<tanggal panjang>"|"Tidak dikunci" }`.
- `pastikanTanggalTerbuka(db, tanggal) -> Promise<void>`. Dipakai setiap transaksi mulai Tahap 1.
  - `tanggal < mulai_periode` → `AppError(400, "SEBELUM_PERIODE", "Tanggal <panjang> sebelum periode akuntansi dimulai (<panjang>).")`
  - `kunci_sampai` terisi dan `tanggal <= kunci_sampai` → `AppError(409, "PERIODE_TERKUNCI", "Transaksi sampai <panjang> sudah dikunci. Buka kuncinya di Pengaturan, menu Preferensi, bagian Pembatasan.")`

- [ ] **Step 1: Tulis tes yang gagal.** Simpan nilai `perusahaan` di `before` dan kembalikan di `after`.
  - Operator: `GET` → `200` dengan `nama` terisi; `PUT` → `403`.
  - Admin: `PUT` dengan `npwp: "12.345"` → `400`.
  - Admin: `PUT` dengan `kunci_sampai: "2027-01-31"` → `200`. Sesudahnya:
    - `pastikanTanggalTerbuka(pool, "2027-01-31")` ditolak dengan `/sudah dikunci/`;
    - `"2027-02-01"` lolos;
    - `"2026-12-31"` ditolak dengan `/sebelum periode akuntansi/`.
  - Log terakhir untuk `preferensi` punya `sesudah["Transaksi dikunci sampai"] === "31 Januari 2027"`.
- [ ] **Step 2: Jalankan tes.**
  - Run: `npm run uji`
  - Expected: FAIL.
- [ ] **Step 3: Implementasikan.**
- [ ] **Step 4: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: PASS.
- [ ] **Step 5: Checkpoint.**

### Task 8: API Log Aktivitas, hak di menu lama, dan log unggahan

**Files:**
- Create: `server/src/features/log-aktivitas/log-aktivitas.routes.js`. Middleware `wajibMasuk, wajibHak("log_aktivitas","lihat")`.
- Modify: `server/src/features/unggahan/unggahan.routes.js`. Pasang hak per rute:
  - `GET /`, `GET /:id`, `GET /:id/berkas` → `lihat`
  - `POST /`, `POST /:id/baca` → `buat`
  - `POST /:id/setujui` → `ubah`
  - `POST /:id/batalkan` → `hapus`
- Modify: `server/src/features/unggahan/unggahan.service.js`. `simpanUnggahan({ berkas, req })`, `setujuiUnggahan(id, nilai, req)`, dan `batalkanUnggahan(id, req)` menerima `req` (pengguna diambil dari `req.pengguna`) dan memanggil `catatLog` di transaksinya sendiri. `batalkanUnggahan` dibungkus `dalamTransaksi`.
- Modify: `server/src/features/laporan/laporan.routes.js`. `GET /` diberi `wajibHak("ringkasan_laba_rugi","lihat")`.
- Modify: `server/src/app.js`. Pasang `/log-aktivitas`.
- Test: `server/test/log-aktivitas.test.js`, `server/test/unggahan-hak.test.js`

**Interfaces (Produces):**
- `GET /api/log-aktivitas?menu=&pengguna_id=&tindakan=&dari=&sampai=&cari=&halaman=`:
  - `dari` dan `sampai` berbentuk `YYYY-MM-DD`, inklusif, dihitung per hari Asia/Jakarta: `waktu >= ($dari::date)::timestamp at time zone 'Asia/Jakarta'` dan `< ($sampai::date + 1)…`.
  - `cari` mencocokkan `referensi ilike`.
  - Ukuran halaman 50.
  - Jawaban: `{ baris: [{ id, waktu, tindakan, menu_kode, menu_nama, referensi, tanggal_transaksi, pengguna_nama, pengguna_email, alamat_ip }], jumlah, halaman, ukuran }`, diurutkan `waktu desc, id desc`.
- `GET /api/log-aktivitas/pilihan` → `{ menu: [{ kode, nama }], pengguna: [{ id, nama }] }`. Nilai pengguna diambil dari `distinct` log.
- `GET /api/log-aktivitas/:id` → baris lengkap ditambah `sebelum` dan `sesudah`.
- Potret log unggahan:
  - `buat`: referensi nama berkas.
  - `ubah` saat disetujui: `{ "Status": "Disetujui", "Bulan yang disimpan": "Januari 2026, Februari 2026" }`.
  - `ubah` saat dibatalkan: `{ "Status": "Dibatalkan" }`.

- [ ] **Step 1: Tulis tes yang gagal:**
  - Operator tanpa grup: `GET /api/unggahan` → `403` dengan `error.code === "TANPA_HAK"`; `GET /api/laporan` → `403`.
  - Operator dengan grup yang hanya punya `unggah_laporan.lihat`: `GET /api/unggahan` → `200`; `POST /api/unggahan/<id>/setujui` → `403`.
  - Admin: `GET /api/laporan` → `200`.
  - Paging: setelah 55 `catatLog` atas nama pengguna uji, `GET ?pengguna_id=<uji>` → `jumlah === 55`, `baris.length === 50`; `halaman=2` → `5` baris.
  - Filter `tindakan=hapus` hanya mengembalikan baris `hapus`.
  - `dari=sampai=<hari ini di Jakarta>` memuat baris yang baru dibuat.
  - Operator tanpa hak log → `403`.
- [ ] **Step 2: Jalankan tes.**
  - Run: `npm run uji`
  - Expected: FAIL.
- [ ] **Step 3: Implementasikan.**
- [ ] **Step 4: Jalankan tes lagi.**
  - Run: `npm run uji`
  - Expected: semua PASS, termasuk tes lama.
- [ ] **Step 5: Checkpoint.**

### Task 9: Kerangka tampilan ala Accurate (client)

**Files:**
- Modify: `client/src/shared/api/client.js`. Tambahkan `apiPut` dan `apiDelete`.
- Modify: `client/src/app/styles/index.css`. Tambahkan token berikut:
  - bilah ikon: `--rel: 0 45% 20%`, `--rel-foreground: 0 0% 100%`, `--rel-hover: 0 40% 28%`;
  - kepala tabel: `--kepala-tabel: 20 10% 32%`;
  - kotak menu, masing-masing tiga token (latar, isi, garis):

    | Jenis | Latar | Isi | Garis |
    | :--- | :--- | :--- | :--- |
    | `--jenis-data-induk` | `210 85% 94%` | `212 70% 38%` | `212 60% 80%` |
    | `--jenis-transaksi` | `130 55% 92%` | `135 55% 28%` | `135 40% 75%` |
    | `--jenis-pengaturan` | `30 95% 92%` | `25 85% 38%` | `28 70% 75%` |
    | `--jenis-laporan` | `270 70% 95%` | `272 50% 42%` | `272 40% 82%` |
- Create: `client/src/entities/navigasi/index.js`
- Create: `client/src/entities/preferensi/index.js`. Isinya `usePreferensi()`, sedangkan mutation-nya ditambahkan di Task 13.
- Create: `client/src/widgets/app-shell/model/useTab.js`
- Create: `client/src/widgets/app-shell/model/ikon.js`
- Rewrite: `client/src/widgets/app-shell/ui/AppShell.jsx`
- Create di `client/src/widgets/app-shell/ui/`: `BilahAtas.jsx`, `RelModul.jsx`, `PanelModul.jsx`, `BarisTab.jsx`, `IsiTab.jsx`
- Delete: `client/src/widgets/app-shell/ui/IsiSidebar.jsx`, `model/navigasi.js`, `model/useSidebar.js`
- Create: `client/src/app/router/rute.jsx`
- Rewrite: `client/src/app/router/AppRouter.jsx`
- Modify: `client/src/app/router/ProtectedRoute.jsx`. Hapus `KhususAdmin` dan tambahkan `PerluHak`.
- Modify: `UnggahPage.jsx`, `RiwayatUnggahan.jsx`, `CekUnggahanPage.jsx`, dan berkas lain yang menyebut `/unggah` atau `/unggahan/`:
  - alamat baru `/laporan/unggah` dan `/laporan/unggah/:id`;
  - tombol Unggah, Setujui, dan Batalkan disembunyikan sesuai `useHak("unggah_laporan")` (`buat`, `ubah`, `hapus`).
- Modify: `client/src/entities/sesi/index.js`. `NAMA_PERAN = { admin: "Administrator", staf: "Operator" }`.

**Interfaces (Produces):**
- `entities/navigasi`:
  - `useNavigasi()`: query `["navigasi"]` ke `GET /navigasi`, `staleTime` 5 menit.
  - `useHak(menuKode) -> { lihat, buat, ubah, hapus }`. Semua `false` selama memuat.
  - `menuDariPath(navigasi, pathname) -> menu | null`. Dicocokkan per segmen dengan awalan terpanjang; `/` hanya cocok persis.
- `useTab` (zustand `persist`, nama `eats.tab`, versi 1):
  - state `{ tab: [{ kode, path }] }`. Tab Dashboard (`kode: "ringkasan_laba_rugi"`, `path: "/"`) selalu ada di urutan pertama dan tidak bisa ditutup.
  - `buka(kode, path)` menambah tab atau memperbarui `path`-nya.
  - `tutup(kode) -> pathTujuan`. Tujuannya tab tetangga, atau `/`.
  - `tutupSemua()`
  - `saring(kodeBoleh: Set)` membuang tab yang tidak lagi berhak.
- `ikon.js`:
  - `IKON_MODUL = { pengaturan: FiSettings, perusahaan: FiBriefcase, laporan: FiPieChart }`
  - `IKON_MENU = { preferensi: FiSliders, akses_grup: FiShield, pengguna: FiUsers, penomoran: FiHash, log_aktivitas: FiActivity, ringkasan_laba_rugi: FiBarChart2, unggah_laporan: FiUploadCloud }`
  - cadangan `FiFile`.
- `rute.jsx`:
  - `RUTE_TAB` adalah daftar elemen `<Route>` untuk `/`, `/pengaturan/preferensi`, `/pengaturan/akses-grup`, `/pengaturan/pengguna`, `/pengaturan/penomoran`, `/perusahaan/log-aktivitas`, `/laporan/unggah`, dan `/laporan/unggah/:id`.
  - Setiap rute dibungkus `<PerluHak menu="…">`. Tanpa `hak.lihat`, yang tampil `EmptyState` "Anda belum punya akses ke menu ini" dengan keterangan "Minta Administrator menambahkannya di Pengaturan, menu Akses Grup."
  - Halaman yang baru dibuat di Task 10–13 sementara memakai `PenggunaPage` yang lama untuk Pengguna, dan `EmptyState` "Sedang disiapkan" untuk sisanya.
- `AppRouter`:
  - `/masuk`;
  - pengalihan lama: `/unggah` ke `/laporan/unggah`, `/unggahan/:id` ke `/laporan/unggah/:id`, `/pengguna` ke `/pengaturan/pengguna`;
  - `*` ke `<ProtectedRoute><AppShell/></ProtectedRoute>`.
- Perilaku `AppShell`:
  - Setiap kali alamat berubah, `menuDariPath` dijalankan. Kalau ada menu yang cocok, `buka(menu.kode, pathname + search)`. Kalau tidak, `navigate("/", { replace: true })` dengan toast galat "Halaman tidak ditemukan".
  - Setelah navigasi termuat, `saring` dijalankan.
  - `document.title = "<nama menu> · EATS Dashboard"`.
  - Lencana jumlah unggahan "menunggu dicek" hanya diambil bila `useHak("unggah_laporan").lihat`.
- `IsiTab`: setiap tab dirender sebagai `<div hidden={!aktif}><Routes location={tab.path}>{RUTE_TAB}</Routes></div>`, sehingga tab yang tidak aktif tetap hidup.
- Tata letak:
  - **md ke atas:** `BilahAtas` di atas, `RelModul` (lebar 64 px, `--rel`, sticky setinggi layar) di kiri, `BarisTab` di bawah bilah atas, lalu isi.
  - **Di bawah md:** bilah atas berisi tombol menu yang membuka `Sheet` berisi semua modul (`PanelModul` bertumpuk, kotak 2 kolom). `BarisTab` bisa digeser ke samping.
- Panel modul:
  - judul modul dengan garis `--primary`;
  - kotak `Link` setinggi kira-kira 104 px dengan ikon 28 px dan nama yang boleh dua baris, berwarna sesuai `jenis`;
  - menutup panel setelah diklik;
  - kotak "Unggah Laporan" menampilkan lencana jumlah yang menunggu, dan ikon modul Laporan diberi titik.
- Pengguna tanpa satu menu pun: tab Dashboard berisi `EmptyState` "Akun Anda belum diberi akses grup. Hubungi Administrator."

- [ ] **Step 1: Implementasikan semua berkas di atas.**
- [ ] **Step 2: Periksa build dan lint.**
  - Run (di `client/`): `npm run build; npm run lint`
  - Expected: build selesai tanpa galat, lint 0 error.
- [ ] **Step 3: Cek di browser.** Server di 4910 dan client di 5178 dengan `finance_uji`, masuk sebagai Administrator.
  - Buka Unggah Laporan dan Pengguna lewat panel modul. Muncul 3 tab (Dashboard, Unggah Laporan, Pengguna).
  - Ganti tahun di Dashboard, pindah tab, lalu kembali: tahunnya tetap.
  - Tutup tab: pindah ke tab tetangga.
  - Muat ulang halaman: tab yang sama terbuka lagi.
  - `/pengguna` dialihkan ke `/pengaturan/pengguna`.
  - Operator uji tanpa grup melihat pesan "belum diberi akses grup".
  - Cek di 390, 820, dan 1440 px. Di HP, menu terbuka dari laci dan tab bisa digeser.
- [ ] **Step 4: Matikan server per PID, lalu checkpoint.**

### Task 10: Widget daftar-formulir dan halaman Akses Grup

**Files:**
- Create di `client/src/widgets/daftar-form/ui/`: `KerangkaDaftarForm.jsx`, `DaftarData.jsx`, `ChipFilter.jsx`, `FormDokumen.jsx`
- Create: `client/src/entities/akses-grup/index.js`
- Create: `client/src/pages/akses-grup/AksesGrupPage.jsx`, `ui/FormAksesGrup.jsx`, `ui/MatriksHak.jsx`
- Modify: `client/src/app/router/rute.jsx`. Ganti placeholder Akses Grup.

**Interfaces (Produces, dipakai Task 11–13):**
- `KerangkaDaftarForm({ namaData, bisaBuat, renderDaftar, renderForm })`:
  - State: sub-tab yang terbuka berbentuk `[{ kunci, id | null, judul, berubah }]`, dan yang aktif bernilai `"daftar"` atau sebuah `kunci`.
  - Tombol daftar adalah ikon `FiList` hijau (`--jenis-transaksi`) dengan `aria-label="Daftar <namaData>"`.
  - Sub-tab formulir tetap hidup saat tidak aktif.
  - Menutup sub-tab dengan `berubah === true` memunculkan `AlertDialog` "Tutup tanpa menyimpan?".
  - `renderDaftar({ buka(id, judul), bukaBaru() })`
  - `renderForm({ id, tutup(), setelahSimpan(idBaru, judul), tandaiBerubah(bool) })`
  - Sub-tab baru berjudul "Data baru".
- `DaftarData({ kolom, baris, kunciBaris, memuat, galat, onMuatUlang, onPilih, cari, onCari, filter, aksiAtas, jumlah, adaLagi, onMuatLagi, memuatLagi, kosong, kartuHp })`:
  - `kolom` berbentuk `[{ kunci, judul, rata?, render?(baris) }]`.
  - Bilah alat: baris chip `filter`; tombol muat ulang (`FiRefreshCw`, "Muat ulang"); `aksiAtas`; kolom cari "Cari…"; kotak "`<jumlah>` data".
  - Tabel dengan kepala `--kepala-tabel` bertulisan putih. Baris bisa diklik dan dibuka dengan Enter.
  - Di bawah md, tabel diganti `kartuHp(baris)`.
  - Status: `TableSkeleton` saat memuat, `ErrorState` dengan "Coba lagi" saat galat, `EmptyState` saat kosong.
  - Tombol "Tampilkan lebih banyak" muncul bila `adaLagi`.
- `ChipFilter({ label, nilai, pilihan: [{ nilai, label }], onUbah })`: tombol "`<label>`: `<pilihan aktif>` ⌄" yang membuka `DropdownMenuRadioGroup`.
- `FormDokumen({ tab: [{ kunci, judul, isi }], aksi: [{ kunci, label, ikon, onClick, nada: "utama" | "bahaya", nonaktif, memuat, konfirmasi? }] })`:
  - **md ke atas:** baris tab di atas. Kolom aksi di kanan selebar 88 px, berisi tombol ikon dengan label kecil di bawahnya; Simpan memakai `--primary`, dan aksi `bahaya` dengan `konfirmasi` membuka `AlertDialog`.
  - **Di bawah md:** semua tab disusun bertumpuk dengan judul, dan aksi pindah ke bilah bawah yang menempel.
- `entities/akses-grup`:
  - query `useDaftarAksesGrup()`, `useAksesGrup(id)`, `useMenuMatriks()`;
  - mutation `useSimpanAksesGrup()` dan `useHapusAksesGrup()` dengan `meta` toast "Menyimpan akses grup…" / "Akses grup tersimpan." dan "Akses grup dihapus.";
  - mutation membatalkan cache `["akses-grup"]`, `["pengguna"]`, dan `["navigasi"]`.
- Halaman Akses Grup:
  - **Kolom daftar:** Nama grup, Keterangan, Jumlah anggota.
  - **Tab Umum:** Nama grup, Keterangan, dan Anggota. Anggota dipilih dari Operator aktif lewat daftar centang yang bisa dicari; Administrator tidak muncul.
  - **Tab Hak Akses (`MatriksHak`):**
    - daftar modul di kiri; di HP berupa `Select`;
    - tabel di kanan dengan kolom Lihat, Buat, Ubah, Hapus;
    - baris "Pilih semua" per kolom;
    - aksi yang tidak dimiliki menu ditulis "—";
    - `keteranganAksi` tampil sebagai teks kecil di bawah nama menu;
    - mencentang Buat, Ubah, atau Hapus ikut mencentang Lihat; mencabut Lihat mencabut semuanya;
    - ada kolom "Cari menu".
  - **Aksi:** Simpan; Hapus (dengan konfirmasi, hanya untuk grup yang sudah tersimpan).

- [ ] **Step 1: Implementasikan.**
- [ ] **Step 2: Periksa build dan lint.**
  - Run: `npm run build; npm run lint`
  - Expected: tanpa galat.
- [ ] **Step 3: Cek di browser.**
  - Buat "UJI Staf Keuangan" dengan hak Log Aktivitas Lihat, serta Unggah Laporan Lihat dan Buat. Masukkan satu Operator uji. Simpan: toast muncul, dan judul sub-tab menjadi nama grup.
  - Masuk sebagai Operator itu (jendela privat, akun `@uji.test` yang dibuat di sesi ini). Bilah ikon hanya menampilkan Perusahaan dan Laporan. Panel Laporan hanya berisi Unggah Laporan.
  - Hapus grup yang masih punya anggota: toast galat dengan pesan dari server.
  - Cek di 3 ukuran layar.
- [ ] **Step 4: Matikan server per PID, lalu checkpoint.**

### Task 11: Halaman Pengguna dengan pola daftar-formulir

**Files:**
- Rewrite: `client/src/pages/pengguna/PenggunaPage.jsx`, `ui/FormPengguna.jsx`
- Delete: `ui/DialogPengguna.jsx`
- Modify: `client/src/entities/pengguna/index.js`. Tambahkan `akses_grup_id` di body; `buatKataSandiAcak` tetap dipakai.
- Modify: `client/src/app/router/rute.jsx`

**Interfaces:**
- Consumes: widget dari Task 10, `useDaftarAksesGrup`.
- **Kolom daftar:** Nama (email di bawahnya), Level, Akses grup (Administrator ditulis "Semua menu"; Operator tanpa grup ditulis "Belum ada", berwarna peringatan), Status, Terakhir masuk.
- **Tab Umum:**
  - Nama;
  - Email, yang hanya bisa diisi saat membuat akun;
  - Level, berupa radio Administrator/Operator dengan penjelasan satu baris;
  - Akses grup, berupa `Select` yang nonaktif untuk Administrator, dengan catatan "Administrator selalu bisa membuka semua menu.";
  - Status aktif, yang nonaktif untuk akun sendiri.
- **Tab Kata sandi:**
  - wajib saat membuat akun, dan opsional ("Ganti kata sandi") saat mengubah;
  - memakai `InputKataSandi` (ada tombol lihat) dan tombol "Buat acak".

- [ ] **Step 1: Implementasikan.**
- [ ] **Step 2: Periksa build dan lint.**
  - Run: `npm run build; npm run lint`
  - Expected: tanpa galat.
- [ ] **Step 3: Cek di browser.**
  - Buat Operator `@uji.test` dengan grup UJI.
  - Ubah Operator itu menjadi Administrator: kolom Akses grup berubah menjadi "Semua menu".
  - Atur ulang kata sandinya: Log Aktivitas mencatat "Kata sandi: Diganti" (dicek lewat API atau Task 13).
  - Cek di 3 ukuran layar.
- [ ] **Step 4: Matikan server per PID, lalu checkpoint.**

### Task 12: Halaman Penomoran

**Files:**
- Create: `client/src/entities/penomoran/index.js`. Isinya:
  - `useDaftarPenomoran`, `useTipeTransaksi`;
  - `usePratinjauPenomoran(body)`: query dengan kunci berisi body yang ditunda 300 ms;
  - `useSimpanPenomoran`, `useHapusPenomoran`.
- Create: `client/src/pages/penomoran/PenomoranPage.jsx`, `ui/FormPenomoran.jsx`, `ui/SusunanNomor.jsx`
- Modify: `client/src/app/router/rute.jsx`

**Interfaces:**
- **Kolom daftar:** Nama, Tipe transaksi, Contoh nomor berikutnya, Nomor urut diulang, Sudah dipakai (`<terpakai>` nomor, atau "Belum"), dan Bawaan (lencana "Bawaan").
- **Formulir (satu tab "Umum"):**
  - Nama, Tipe transaksi, Nomor urut diulang (Tidak pernah, Setiap hari, Setiap bulan, Setiap tahun), dan Jumlah digit nomor urut (1–10);
  - "Susunan nomor": bagian-bagian ditampilkan berurutan sebagai chip dengan tombol naik, turun, dan hapus. Bagian Teks punya kolom isian sendiri.
  - Menu "Tambah bagian" berisi Teks, Tahun (2027), Tahun singkat (27), Bulan (01), Bulan Romawi (I), Hari (15), dan Nomor urut.
  - "Contoh hasil": nomor dari pratinjau ditulis besar dengan angka sejajar (`tabular-nums`). Galat format dari server tampil di bawahnya dengan warna peringatan.
  - Kotak centang "Jadikan bawaan untuk tipe ini".
  - Bila `terpakai > 0`: semua isian susunan nonaktif, dengan catatan "Sudah dipakai untuk N nomor. Susunannya dikunci supaya tidak ada nomor kembar; buat penomoran baru bila perlu."

- [ ] **Step 1: Implementasikan.**
- [ ] **Step 2: Periksa build dan lint.**
  - Run: `npm run build; npm run lint`
  - Expected: tanpa galat.
- [ ] **Step 3: Cek di browser.**
  - Buat "UJI Faktur" dengan susunan `INV/`, Bulan Romawi, `/`, Tahun singkat, `/`, Nomor urut, 3 digit. Contohnya cocok dengan pola `INV/<bulan Romawi>/<2 angka>/001`.
  - Hapus bagian Tahun saat reset tahunan: pesan galat muncul dan Simpan ditolak oleh server.
  - Penomoran seed "Jurnal Umum" tampil sebagai Bawaan.
  - Cek di 3 ukuran layar.
- [ ] **Step 4: Matikan server per PID, lalu checkpoint.**

### Task 13: Halaman Preferensi dan Log Aktivitas

**Files:**
- Modify: `client/src/entities/preferensi/index.js`. Tambahkan `useSimpanPreferensi()` yang membatalkan cache `["preferensi"]`.
- Create: `client/src/pages/preferensi/PreferensiPage.jsx`
- Create: `client/src/entities/log-aktivitas/index.js`. Isinya `useDaftarLog(filter)` (`useInfiniteQuery`, halaman 50), `usePilihanLog()`, dan `useDetailLog(id)`.
- Create: `client/src/pages/log-aktivitas/LogAktivitasPage.jsx`, `ui/DetailLog.jsx`
- Modify: `client/src/app/router/rute.jsx`. Placeholder terakhir dihapus.

**Interfaces:**
- **Preferensi:** `FormDokumen` tanpa daftar, dengan satu tombol Simpan yang mengirim semua kolom.
  - **Tab Perusahaan:** Nama perusahaan, Alamat, Telepon, Email, NPWP. Petunjuk NPWP: "15 atau 16 angka, tanpa titik dan strip."
  - **Tab Pembatasan:**
    - "Periode akuntansi dimulai": pilihan bulan dan tahun, disimpan sebagai `YYYY-MM-01`;
    - "Kunci transaksi sampai tanggal": input tanggal dan sakelar "Tidak dikunci";
    - penjelasan: "Transaksi bertanggal sampai tanggal ini tidak bisa dibuat, diubah, atau dihapus. Pakai setelah laporan satu bulan selesai diperiksa."
  - Bilah atas memakai `usePreferensi().data.nama`.
- **Log Aktivitas:** `KerangkaDaftarForm` dengan `bisaBuat=false`.
  - **Chip filter:**
    - Tanggal: Semua, Hari ini, 7 hari terakhir, 30 hari terakhir, Bulan ini. Label chip menampilkan rentang eksplisit, mis. "Tanggal: 13–19 Nov 2026".
    - Menu, Pengguna, dan Tindakan (Buat, Ubah, Hapus).
  - **Cari:** referensi.
  - **Kolom:** Waktu ("19 Nov 2026 14.05"), Tindakan, Menu, Referensi, Tanggal transaksi ("—" bila kosong), Pengguna, Email, Alamat IP.
  - **Detail (`DetailLog`):**
    - ringkasan di atas (waktu, pengguna, tindakan, menu, referensi);
    - tabel Kolom | Sebelum | Sesudah, dengan kotak centang "Hanya tampilkan perubahan" yang aktif bawaan;
    - baris yang berubah diberi latar `--accent`.

- [ ] **Step 1: Implementasikan.**
- [ ] **Step 2: Periksa build dan lint.**
  - Run: `npm run build; npm run lint`
  - Expected: tanpa galat.
- [ ] **Step 3: Cek di browser.**
  - Ubah alamat perusahaan lalu simpan: Log Aktivitas memuat baris "Ubah · Preferensi". Detailnya menampilkan alamat lama dan baru, dan "Hanya tampilkan perubahan" menyembunyikan kolom yang tidak berubah.
  - Filter "Tindakan: Hapus" bekerja.
  - "Tampilkan lebih banyak" muncul bila datanya lebih dari 50.
  - Nama perusahaan di bilah atas ikut berubah.
  - Cek di 3 ukuran layar.
- [ ] **Step 4: Matikan server per PID, lalu checkpoint.**

### Task 14: Verifikasi menyeluruh, dokumen, dan rilis (rilis hanya dengan izin)

**Files:**
- Modify: `docs/PROGRESS.md` (entri Tahap 0), `docs/PLANNING.md` (penunjuk), `docs/RENCANA-AKUNTANSI.md` (status Tahap 0)

- [ ] **Step 1: Jalankan semua pemeriksaan otomatis.**
  - Run (di `server/`): `npm run uji`
  - Run (di `client/`): `npm run build; npm run lint`
  - Expected: semua lulus, dengan jumlah tes yang tercetak.
- [ ] **Step 2: Cek di browser, sebagai Administrator dan sebagai Operator UJI.**
  - Setiap halaman dibuka di 390, 820, dan 1440 px.
  - Hak Operator dicabut lalu halaman dimuat ulang: tab menu yang dicabut tertutup sendiri (Review Focus 5).
  - Link lama `/unggah` dan `/unggahan/<id>` dialihkan.
  - Alur lama tetap berjalan: unggah, cek, setujui, lalu Ringkasan.
- [ ] **Step 3: Perbarui ketiga dokumen.** Isinya:
  - apa yang selesai;
  - apa yang belum diverifikasi;
  - Keputusan Claude 1–10 untuk dicek Lutfi.
- [ ] **Step 4: Rilis.** Setiap butir berikut ditanyakan ke Lutfi satu per satu, dan langkah ini berhenti di sini sampai ia menjawab:
  1. Migrasi production: `$env:DB_SCHEMA='finance'; npm run migrate`, lalu `-- --ya`. Harus memasang `003`, dan `Schema lain TIDAK berubah.`
  2. Commit di branch `tahap-0-fondasi`, lalu gabung ke `main`.
  3. Push, yang memicu deploy Vercel. Env Vercel tidak berubah, `DB_SCHEMA` tetap `finance`.
  4. Cek di production setelah Lutfi masuk sendiri.
- [ ] **Step 5: Matikan semua server per PID.**
