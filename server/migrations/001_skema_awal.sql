-- ============================================================================
-- 001 — Skema awal EATS Dashboard (schema `finance` di database bos)
--
-- Dijalankan oleh migrations/jalankan.js sebagai peran postgres, di dalam satu
-- transaksi, dengan search_path = finance, extensions. Tidak menyentuh schema
-- lain (public, pos, operation_v2, marketing).
--
-- Isi:
--   pengguna          akun login aplikasi ini (bukan Supabase Auth)
--   unit_usaha        PT EATS (maklon Hangry) dan Boomboo (retail & B2B)
--   pos_akun          daftar baku pos laba rugi; AI memetakan isi berkas ke sini
--   unggahan          catatan tiap berkas yang diunggah + rencana hasil bacaan AI
--   unggahan_berkas   berkas aslinya (disimpan sebagai bukti)
--   nilai_laporan     angka yang sudah disetujui; SATU angka per unit-bulan-pos
--
-- Angka total (laba kotor, laba bersih, EBITDA, dll.) TIDAK disimpan. Semuanya
-- dihitung dari pos rinci, supaya tidak pernah ada dua versi angka yang sama.
-- ============================================================================

comment on schema finance is
  'EATS Dashboard — dashboard keuangan PT EATS. Dibuat 2026-11-05. Hanya diakses backend lewat peran finance_app; tidak dipakai Data API.';

-- ── Pengguna ────────────────────────────────────────────────────────────────
create table pengguna (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null check (email = btrim(email) and email <> ''),
  nama               text not null check (btrim(nama) <> ''),
  kata_sandi_hash    text not null,
  peran              text not null check (peran in ('admin', 'staf')),
  aktif              boolean not null default true,
  login_terakhir_at  timestamptz,
  dibuat_at          timestamptz not null default now(),
  diubah_at          timestamptz not null default now()
);
create unique index pengguna_email_unik on pengguna (lower(email));

-- ── Unit usaha ──────────────────────────────────────────────────────────────
create table unit_usaha (
  kode        text primary key check (kode ~ '^[A-Z][A-Z0-9_]*$'),
  nama        text not null,
  keterangan  text not null default '',
  urutan      int  not null default 0
);

insert into unit_usaha (kode, nama, keterangan, urutan) values
  ('EATS',    'PT EATS', 'Maklon untuk Hangry', 1),
  ('BOOMBOO', 'Boomboo', 'Retail dan B2B',      2);

-- ── Pos laba rugi ───────────────────────────────────────────────────────────
-- kelompok:
--   pendapatan     dijumlah jadi Total pendapatan
--   hpp            dijumlah jadi Total harga pokok penjualan
--   biaya_maklon   biaya operasional maklon, pos a–i di berkas
--   biaya_lainnya  rincian pos "j - Lainnya" (ikut biaya maklon)
--   biaya_dimples  biaya operasional Dimples
--   di_bawah_laba  pos di bawah laba bersih (pajak, amortisasi) — hanya untuk EBITDA
-- tambah_ebitda: pos yang ditambahkan kembali ke laba bersih saat menghitung
--   EBITDA, mengikuti rumus berkas: laba bersih + pajak + penyusutan + amortisasi.
create table pos_akun (
  kode           text primary key check (kode ~ '^[a-z][a-z0-9_]*$'),
  nama           text not null,
  kelompok       text not null check (kelompok in
                   ('pendapatan', 'hpp', 'biaya_maklon', 'biaya_lainnya', 'biaya_dimples', 'di_bawah_laba')),
  urutan         int  not null,
  nama_di_berkas text not null default '',
  tambah_ebitda  boolean not null default false
);

insert into pos_akun (kode, nama, kelompok, urutan, nama_di_berkas, tambah_ebitda) values
  -- Pendapatan
  ('pendapatan',            'Pendapatan usaha',                          'pendapatan',     10, 'Maklon / Revenue', false),
  ('pendapatan_lain',       'Pendapatan lain dari usaha',                'pendapatan',     20, '',                 false),
  -- Harga pokok penjualan
  ('hpp',                   'Harga pokok penjualan',                     'hpp',            30, 'COGS',             false),
  -- Biaya operasional maklon (a–i)
  ('marketing',             'Marketing',                                 'biaya_maklon',  100, 'a - Marketing',    false),
  ('event',                 'Event',                                     'biaya_maklon',  110, 'b - Event',        false),
  ('gaji',                  'Gaji karyawan',                             'biaya_maklon',  120, 'c - Gaji',         false),
  ('pekerja_harian',        'Pekerja harian lepas',                      'biaya_maklon',  130, 'd - DW',           false),
  ('mgm',                   'MGM',                                       'biaya_maklon',  140, 'e - MGM',          false),
  ('sewa',                  'Sewa tempat',                               'biaya_maklon',  150, 'f - Sewa',         false),
  ('listrik_air',           'Listrik dan air (pemilik gedung)',          'biaya_maklon',  160, 'g - Utilities/Water+Electricity (Landlord)', false),
  ('gas',                   'Gas',                                       'biaya_maklon',  170, 'h - Utilities/Gas (Gas supplier)', false),
  ('penyusutan',            'Penyusutan dan amortisasi',                 'biaya_maklon',  180, 'i - Depresiasi+Amortisasi', true),
  -- Rincian "j - Lainnya"
  ('printing',              'Printing dan tinta printer',                'biaya_lainnya', 200, 'printing + tinta printer', false),
  ('materai',               'Materai',                                   'biaya_lainnya', 205, 'Materai', false),
  ('ongkos_kirim',          'Ongkos kirim pembelian dan pengiriman',     'biaya_lainnya', 210, 'Ongkir pembelian/Pengiriman', false),
  ('bensin',                'Bensin kendaraan',                          'biaya_lainnya', 215, 'Eksploitasi Kend(Bensin)', false),
  ('kebersihan',            'Perlengkapan kebersihan',                   'biaya_lainnya', 220, 'cleaning supplies', false),
  ('riset_produk',          'Riset dan pengembangan produk',             'biaya_lainnya', 225, 'r n d', false),
  ('konsultan_hukum',       'Konsultan hukum',                           'biaya_lainnya', 230, 'Legal (Consultant)', false),
  ('pecah_belah',           'Pembelian barang pecah belah',              'biaya_lainnya', 235, 'beli pecah belah', false),
  ('perbaikan',             'Perbaikan dan perawatan',                   'biaya_lainnya', 240, 'r n m', false),
  ('tenaga_tambahan',       'Vendor, staf tambahan, lembur, dan kos',    'biaya_lainnya', 245, 'Vendor D + Staff C + lembur + KOST', false),
  ('telekomunikasi',        'Telekomunikasi dan wifi',                   'biaya_lainnya', 250, 'telekomunikasi/wifi', false),
  ('buka_puasa',            'Buka puasa bersama',                        'biaya_lainnya', 255, 'Bukber', false),
  ('hampers',               'Hampers',                                   'biaya_lainnya', 260, 'hamper', false),
  ('bpjs_asuransi',         'BPJS kesehatan dan asuransi',               'biaya_lainnya', 265, 'bpjs, kes + ass', false),
  ('asuransi_mobil',        'Asuransi mobil',                            'biaya_lainnya', 270, 'Ass Mobil', false),
  ('pengobatan',            'Pengobatan',                                'biaya_lainnya', 275, 'Pengobatan', false),
  ('seragam',               'Seragam',                                   'biaya_lainnya', 280, 'Beban Seragam', false),
  ('pelatihan',             'Pelatihan',                                 'biaya_lainnya', 285, 'PELATIHAN', false),
  ('beban_pajak',           'Beban pajak dan surat tagihan pajak',       'biaya_lainnya', 290, 'Beban Pajak/STP', false),
  ('bunga_leasing',         'Bunga leasing',                             'biaya_lainnya', 295, 'Bunga Leasing', false),
  ('administrasi_bank',     'Biaya administrasi bank',                   'biaya_lainnya', 300, 'Adm Bank', false),
  ('pendapatan_lain_lain',  'Pendapatan lain-lain (mengurangi biaya)',   'biaya_lainnya', 305, 'Other Income', false),
  ('komisi_insentif',       'Komisi dan insentif',                       'biaya_lainnya', 310, 'Komisi/Insentif', false),
  ('potongan_qris',         'Potongan transaksi QRIS',                   'biaya_lainnya', 315, 'MDR QRIS', false),
  ('lainnya_tanpa_kategori','Lain-lain yang belum dikelompokkan',        'biaya_lainnya', 399, '', false),
  -- Biaya operasional Dimples
  ('dimples_marketing',     'Marketing',                                 'biaya_dimples', 400, '- Marketing', false),
  ('dimples_gaji',          'Gaji karyawan',                             'biaya_dimples', 410, '- Gaji (Outlet, CK, THR)', false),
  ('dimples_pekerja_harian','Pekerja harian lepas',                      'biaya_dimples', 420, 'DW', false),
  ('dimples_sewa',          'Sewa outlet',                               'biaya_dimples', 430, '- Sewa', false),
  ('dimples_listrik_air',   'Listrik, air, dan gas',                     'biaya_dimples', 440, '- Utilities', false),
  ('dimples_penyusutan',    'Penyusutan dan amortisasi',                 'biaya_dimples', 450, '- Depresiasi+Amortisasi', true),
  ('dimples_lainnya',       'Lain-lain',                                 'biaya_dimples', 460, '-Lainnya', false),
  -- Di bawah laba bersih
  ('pajak_penghasilan',     'Pajak penghasilan',                         'di_bawah_laba', 500, 'Tax', true),
  ('amortisasi',            'Amortisasi',                                'di_bawah_laba', 510, 'Amotization', true);

-- ── Unggahan ────────────────────────────────────────────────────────────────
create table unggahan (
  id                uuid primary key default gen_random_uuid(),
  nama_berkas       text not null,
  jenis_berkas      text not null check (jenis_berkas in ('excel', 'pdf', 'gambar')),
  mime              text not null,
  ukuran            int  not null check (ukuran > 0),
  sidik_sha256      text not null check (sidik_sha256 ~ '^[0-9a-f]{64}$'),
  status            text not null default 'diunggah' check (status in
                      ('diunggah', 'menunggu_cek', 'gagal_dibaca', 'disetujui', 'dibatalkan')),
  diunggah_oleh     uuid not null references pengguna (id),
  diunggah_at       timestamptz not null default now(),
  dibaca_at         timestamptz,
  sumber_ai         text,
  pemakaian_ai      jsonb,
  hasil_ai          jsonb,
  rencana           jsonb,
  pesan_gagal       text,
  diputuskan_oleh   uuid references pengguna (id),
  diputuskan_at     timestamptz,
  ringkasan_simpan  jsonb
);
create index unggahan_waktu on unggahan (diunggah_at desc);
create index unggahan_sidik on unggahan (sidik_sha256);

create table unggahan_berkas (
  unggahan_id  uuid primary key references unggahan (id) on delete cascade,
  isi          bytea not null
);

-- ── Nilai laporan yang sudah disetujui ──────────────────────────────────────
-- Unik per unit-bulan-pos: upload ulang bulan yang sama MENGGANTI, tidak dobel.
create table nilai_laporan (
  id           bigint generated always as identity primary key,
  unit_kode    text not null references unit_usaha (kode),
  periode      date not null check (extract(day from periode) = 1),
  pos_kode     text not null references pos_akun (kode),
  nilai        numeric(18, 2) not null,
  sumber       jsonb not null default '[]'::jsonb,
  unggahan_id  uuid not null references unggahan (id),
  dibuat_at    timestamptz not null default now(),
  constraint nilai_laporan_unik unique (unit_kode, periode, pos_kode)
);
create index nilai_laporan_periode on nilai_laporan (periode);
create index nilai_laporan_unggahan on nilai_laporan (unggahan_id);

-- ── Hak akses ───────────────────────────────────────────────────────────────
-- Tidak ada yang boleh lewat Data API / kunci publik Supabase. Hak untuk peran
-- aplikasi (finance_app) diberikan oleh scripts/buat-peran-aplikasi.js.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema finance from %I', r);
      execute format('revoke all on all tables in schema finance from %I', r);
      execute format('revoke all on all sequences in schema finance from %I', r);
    end if;
  end loop;
end $$;
revoke all on schema finance from public;
