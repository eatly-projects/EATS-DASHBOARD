-- ============================================================================
-- 003 — Fondasi pembukuan ala Accurate (Tahap 0)
--
-- Dijalankan oleh migrations/jalankan.js sebagai peran postgres, dalam satu
-- transaksi, dengan search_path = <DB_SCHEMA>, extensions. Tidak menyebut nama
-- schema, jadi berkas yang sama dipasang ke finance_uji (uji) dan finance.
--
-- Isi:
--   perusahaan          data usaha, awal periode akuntansi, kunci periode (selalu 1 baris)
--   akses_grup          grup hak akses untuk Operator
--   akses_grup_hak      hak per menu: lihat / buat / ubah / hapus
--   pengguna            + akses_grup_id
--   penomoran           susunan nomor otomatis per tipe transaksi
--   penomoran_counter   nomor urut terakhir per penomoran per periode reset
--   log_aktivitas       siapa mengubah apa, kapan; hanya bisa ditambah
-- ============================================================================

-- ── Perusahaan ──────────────────────────────────────────────────────────────
create table perusahaan (
  id            boolean primary key default true check (id),   -- selalu satu baris
  nama          text not null check (btrim(nama) <> ''),
  alamat        text not null default '',
  telepon       text not null default '',
  email         text not null default '',
  npwp          text not null default '' check (npwp ~ '^([0-9]{15,16})?$'),
  mulai_periode date not null check (extract(day from mulai_periode) = 1),
  kunci_sampai  date,
  diubah_at     timestamptz not null default now(),
  diubah_oleh   uuid references pengguna (id) on delete set null
);
insert into perusahaan (nama, mulai_periode) values ('PT Enak Aplikasi Tirta Sejahtera', '2027-01-01');

-- ── Akses grup ──────────────────────────────────────────────────────────────
create table akses_grup (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null check (btrim(nama) <> ''),
  keterangan  text not null default '',
  dibuat_at   timestamptz not null default now(),
  diubah_at   timestamptz not null default now()
);
create unique index akses_grup_nama_unik on akses_grup (lower(nama));

-- Kode menu tidak memakai foreign key: daftar menu tinggal di kode server
-- (src/shared/akses/menu.js), dan server menolak kode yang tidak dikenal.
create table akses_grup_hak (
  grup_id    uuid not null references akses_grup (id) on delete cascade,
  menu_kode  text not null check (menu_kode ~ '^[a-z][a-z0-9_]*$'),
  lihat      boolean not null default false,
  buat       boolean not null default false,
  ubah       boolean not null default false,
  hapus      boolean not null default false,
  primary key (grup_id, menu_kode),
  check (lihat or not (buat or ubah or hapus))
);

-- restrict: grup yang masih punya anggota tidak bisa dihapus.
alter table pengguna add column akses_grup_id uuid references akses_grup (id) on delete restrict;

-- ── Penomoran ───────────────────────────────────────────────────────────────
create table penomoran (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null check (btrim(nama) <> ''),
  tipe_transaksi  text not null check (tipe_transaksi ~ '^[a-z][a-z0-9_]*$'),
  format          jsonb not null check (jsonb_typeof(format) = 'array'),
  digit_counter   int  not null check (digit_counter between 1 and 10),
  reset           text not null check (reset in ('tidak', 'hari', 'bulan', 'tahun')),
  bawaan          boolean not null default false,
  dibuat_at       timestamptz not null default now(),
  diubah_at       timestamptz not null default now()
);
create unique index penomoran_nama_unik on penomoran (lower(nama));
create unique index penomoran_satu_bawaan on penomoran (tipe_transaksi) where bawaan;

-- kunci_periode: '' (tidak pernah diulang) | '2027' | '2027-01' | '2027-01-15'
create table penomoran_counter (
  penomoran_id   uuid not null references penomoran (id) on delete restrict,
  kunci_periode  text not null,
  terakhir       int  not null check (terakhir > 0),
  primary key (penomoran_id, kunci_periode)
);

insert into penomoran (nama, tipe_transaksi, format, digit_counter, reset, bawaan) values
  ('Jurnal Umum', 'jurnal_umum',
   '[{"jenis":"teks","nilai":"JU."},{"jenis":"tahun"},{"jenis":"teks","nilai":"."},{"jenis":"bulan"},{"jenis":"teks","nilai":"."},{"jenis":"counter"}]',
   5, 'bulan', true);

-- ── Log aktivitas ───────────────────────────────────────────────────────────
-- sebelum/sesudah berisi potret yang siap dibaca manusia: kuncinya label
-- ("Nama grup"), nilainya teks. Tidak pernah berisi hash atau ID mentah.
create table log_aktivitas (
  id                 bigint generated always as identity primary key,
  waktu              timestamptz not null default now(),
  pengguna_id        uuid references pengguna (id) on delete set null,
  pengguna_nama      text not null,
  pengguna_email     text not null,
  alamat_ip          text not null default '',
  tindakan           text not null check (tindakan in ('buat', 'ubah', 'hapus')),
  menu_kode          text not null,
  referensi          text not null default '',
  tanggal_transaksi  date,
  sebelum            jsonb,
  sesudah            jsonb
);
create index log_aktivitas_waktu on log_aktivitas (waktu desc);
create index log_aktivitas_menu on log_aktivitas (menu_kode, waktu desc);

-- ── Hak akses peran aplikasi ────────────────────────────────────────────────
-- Tabel baru otomatis mendapat select/insert/update/delete untuk finance_app
-- (default privileges). Dua pengecualian:
--   log_aktivitas : hanya boleh ditambah, supaya jejak tidak bisa dihapus diam-diam
--   perusahaan    : selalu tepat satu baris, hanya boleh dibaca & diubah
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'finance_app') then
    revoke update, delete on log_aktivitas from finance_app;
    revoke insert, delete on perusahaan from finance_app;
  end if;
end $$;
