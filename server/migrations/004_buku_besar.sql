-- ============================================================================
-- 004 — Buku Besar ala Accurate (Tahap 1)
--
-- Dijalankan oleh migrations/jalankan.js sebagai peran postgres, dalam satu
-- transaksi, dengan search_path = <DB_SCHEMA>, extensions. Tidak menyebut nama
-- schema, jadi berkas yang sama dipasang ke finance_uji (uji) dan finance.
--
-- Isi:
--   departemen                    lini bisnis (Maklon, Retail, HORECA, Modern Trade)
--   akun                          akun perkiraan, bertingkat (induk → anak)
--   jurnal                        kepala setiap dokumen: saldo awal, jurnal umum, pencatatan beban
--   jurnal_baris                  rincian debit/kredit; sumber semua laporan
--   penyetuju_transaksi(_pengguna) aturan persetujuan per tipe transaksi
--   perusahaan                    + akun Ekuitas Saldo Awal dan Laba Ditahan
--
-- Prinsip: laporan dihitung dari jurnal_baris milik jurnal berstatus 'disetujui'.
-- Angka total tidak disimpan di tempat lain (kecuali jurnal.total untuk daftar).
-- ============================================================================

-- ── Departemen (lini bisnis) ───────────────────────────────────────────────
create table departemen (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null check (btrim(nama) <> ''),
  keterangan  text not null default '',
  induk_id    uuid references departemen (id) on delete restrict,
  nonaktif    boolean not null default false,
  dibuat_at   timestamptz not null default now(),
  diubah_at   timestamptz not null default now(),
  check (induk_id is distinct from id)
);
create unique index departemen_nama_unik on departemen (lower(nama));

insert into departemen (nama, keterangan) values
  ('Maklon',       'Produksi untuk merek pihak lain'),
  ('Retail',       'Penjualan marketplace: Shopee dan TikTok Shop'),
  ('HORECA',       'Hotel, restoran, dan kafe'),
  ('Modern Trade', 'Supermarket dan toko modern');

-- ── Akun perkiraan ─────────────────────────────────────────────────────────
-- Tipe mengikuti nama di Accurate. Saldo normal: aset & beban di debit;
-- akumulasi penyusutan, liabilitas, modal, & pendapatan di kredit (lihat kode server).
create table akun (
  id          uuid primary key default gen_random_uuid(),
  kode        text not null check (kode ~ '^[0-9A-Za-z][0-9A-Za-z.\-]{0,19}$'),
  nama        text not null check (btrim(nama) <> ''),
  tipe        text not null check (tipe in (
                'kas_bank', 'piutang_usaha', 'persediaan', 'aset_lancar_lainnya', 'aset_tetap',
                'akumulasi_penyusutan', 'aset_lainnya', 'utang_usaha', 'liabilitas_jangka_pendek',
                'liabilitas_jangka_panjang', 'modal', 'pendapatan', 'beban_pokok_penjualan', 'beban',
                'pendapatan_lainnya', 'beban_lainnya')),
  induk_id    uuid references akun (id) on delete restrict,
  catatan     text not null default '',
  nonaktif    boolean not null default false,
  dibuat_at   timestamptz not null default now(),
  diubah_at   timestamptz not null default now(),
  check (induk_id is distinct from id)
);
create unique index akun_kode_unik on akun (kode);
create index akun_induk on akun (induk_id);

-- Akun bawaan: pola kode Accurate (induk 4 digit, anak 6 digit). Daftar lengkap
-- bawaan Accurate tidak diterbitkan; finance bisa menambah/mengubah/menonaktifkan.
insert into akun (kode, nama, tipe) values
  ('1101', 'Kas & Bank',                 'kas_bank'),
  ('1102', 'Piutang Usaha',              'piutang_usaha'),
  ('1103', 'Aset Lancar Lainnya',        'aset_lancar_lainnya'),
  ('1104', 'Persediaan',                 'persediaan'),
  ('1201', 'Aset Tetap',                 'aset_tetap'),
  ('1202', 'Akumulasi Penyusutan',       'akumulasi_penyusutan'),
  ('1301', 'Aset Lainnya',               'aset_lainnya'),
  ('2101', 'Utang Usaha',                'utang_usaha'),
  ('2102', 'Liabilitas Jangka Pendek',   'liabilitas_jangka_pendek'),
  ('2201', 'Liabilitas Jangka Panjang',  'liabilitas_jangka_panjang'),
  ('3000', 'Modal',                      'modal'),
  ('4000', 'Pendapatan Operasional',     'pendapatan'),
  ('5000', 'Beban Pokok Penjualan',      'beban_pokok_penjualan'),
  ('6000', 'Beban Operasional',          'beban'),
  ('7000', 'Pendapatan Lainnya',         'pendapatan_lainnya'),
  ('8000', 'Beban Lainnya',              'beban_lainnya');

insert into akun (kode, nama, tipe, induk_id)
select v.kode, v.nama, i.tipe, i.id
  from (values
    ('110101', 'Kas',                                         '1101'),
    ('110102', 'Bank',                                        '1101'),
    ('110201', 'Piutang Usaha',                               '1102'),
    ('110301', 'Uang Muka Pembelian',                         '1103'),
    ('110302', 'Biaya Dibayar Di Muka',                       '1103'),
    ('110303', 'PPN Masukan',                                 '1103'),
    ('110401', 'Persediaan',                                  '1104'),
    ('120101', 'Tanah',                                       '1201'),
    ('120102', 'Bangunan',                                    '1201'),
    ('120103', 'Kendaraan',                                   '1201'),
    ('120104', 'Peralatan Kantor',                            '1201'),
    ('120105', 'Mesin dan Peralatan Produksi',                '1201'),
    ('120201', 'Akumulasi Penyusutan Bangunan',               '1202'),
    ('120202', 'Akumulasi Penyusutan Kendaraan',              '1202'),
    ('120203', 'Akumulasi Penyusutan Peralatan Kantor',       '1202'),
    ('120204', 'Akumulasi Penyusutan Mesin dan Peralatan Produksi', '1202'),
    ('130101', 'Uang Jaminan',                                '1301'),
    ('210101', 'Utang Usaha',                                 '2101'),
    ('210201', 'Uang Muka Penjualan',                         '2102'),
    ('210202', 'PPN Keluaran',                                '2102'),
    ('210203', 'Hutang Pembelian Belum Ditagih',              '2102'),
    ('210204', 'Hutang Biaya',                                '2102'),
    ('210205', 'Utang Gaji',                                  '2102'),
    ('210206', 'Utang Pajak Lainnya',                         '2102'),
    ('210207', 'Utang PPh 21',                                '2102'),
    ('220101', 'Utang Bank Jangka Panjang',                   '2201'),
    ('300001', 'Ekuitas Saldo Awal',                          '3000'),
    ('300002', 'Laba Ditahan',                                '3000'),
    ('300003', 'Modal Usaha',                                 '3000'),
    ('300004', 'Prive',                                       '3000'),
    ('400001', 'Penjualan',                                   '4000'),
    ('400002', 'Pendapatan Jasa',                             '4000'),
    ('400003', 'Retur Penjualan',                             '4000'),
    ('400004', 'Diskon Penjualan',                            '4000'),
    ('500001', 'Beban Pokok Penjualan',                       '5000'),
    ('500002', 'Diskon Pembelian',                            '5000'),
    ('600001', 'Beban Iklan dan Promosi',                     '6000'),
    ('600002', 'Beban Komisi',                                '6000'),
    ('600003', 'Beban Bensin, Parkir, Tol Kendaraan',         '6000'),
    ('600004', 'Beban Gaji dan Upah',                         '6000'),
    ('600005', 'Beban Sewa',                                  '6000'),
    ('600006', 'Beban Listrik dan Air',                       '6000'),
    ('600007', 'Beban Telepon dan Internet',                  '6000'),
    ('600008', 'Beban Perlengkapan Kantor',                   '6000'),
    ('600009', 'Beban Asuransi Karyawan',                     '6000'),
    ('600010', 'Beban Perbaikan dan Pemeliharaan',            '6000'),
    ('600011', 'Beban Ongkos Kirim',                          '6000'),
    ('600012', 'Beban Penyusutan Bangunan',                   '6000'),
    ('600013', 'Beban Penyusutan Kendaraan',                  '6000'),
    ('600014', 'Beban Penyusutan Peralatan',                  '6000'),
    ('600015', 'Beban Pajak',                                 '6000'),
    ('600016', 'Beban Lain-lain',                             '6000'),
    ('700001', 'Pendapatan Bunga',                            '7000'),
    ('700002', 'Pendapatan Lain-lain',                        '7000'),
    ('800001', 'Beban Bunga',                                 '8000'),
    ('800002', 'Beban Administrasi Bank',                     '8000'),
    ('800003', 'Beban Lain-lain',                             '8000')
  ) as v (kode, nama, induk)
  join akun i on i.kode = v.induk;

alter table perusahaan
  add column akun_ekuitas_saldo_awal_id uuid references akun (id) on delete restrict,
  add column akun_laba_ditahan_id       uuid references akun (id) on delete restrict;
update perusahaan set
  akun_ekuitas_saldo_awal_id = (select id from akun where kode = '300001'),
  akun_laba_ditahan_id       = (select id from akun where kode = '300002');

-- ── Jurnal ─────────────────────────────────────────────────────────────────
-- Satu baris per dokumen. tipe saldo_awal: akun_lawan_id = akun pemilik saldo
-- awal. tipe pencatatan_beban: akun_lawan_id = akun Hutang Beban.
-- Nomor kosong selama menunggu persetujuan; diberikan saat disetujui.
create table jurnal (
  id                uuid primary key default gen_random_uuid(),
  tipe              text not null check (tipe in ('jurnal_umum', 'pencatatan_beban', 'saldo_awal')),
  nomor             text check (nomor is null or btrim(nomor) <> ''),
  tanggal           date not null,
  keterangan        text not null default '',
  status            text not null default 'disetujui' check (status in ('disetujui', 'diajukan', 'ditolak')),
  akun_lawan_id     uuid references akun (id) on delete restrict,
  jatuh_tempo       date,
  penomoran_id      uuid references penomoran (id) on delete set null,
  total             numeric(18, 2) not null default 0 check (total >= 0),
  dibuat_oleh       uuid references pengguna (id) on delete set null,
  dibuat_at         timestamptz not null default now(),
  diubah_oleh       uuid references pengguna (id) on delete set null,
  diubah_at         timestamptz not null default now(),
  diputuskan_oleh   uuid references pengguna (id) on delete set null,
  diputuskan_at     timestamptz,
  alasan_keputusan  text not null default '',
  check (status <> 'disetujui' or nomor is not null)
);
-- Syarat §8: nomor tidak boleh kembar dalam satu tipe transaksi, apa pun penomorannya.
create unique index jurnal_nomor_unik on jurnal (tipe, nomor) where nomor is not null;
create unique index jurnal_saldo_awal_unik on jurnal (akun_lawan_id) where tipe = 'saldo_awal';
create index jurnal_tanggal on jurnal (tanggal);
create index jurnal_status on jurnal (status, tipe);

create table jurnal_baris (
  id             bigint generated always as identity primary key,
  jurnal_id      uuid not null references jurnal (id) on delete cascade,
  urutan         int  not null,
  akun_id        uuid not null references akun (id) on delete restrict,
  debit          numeric(18, 2) not null default 0 check (debit >= 0),
  kredit         numeric(18, 2) not null default 0 check (kredit >= 0),
  departemen_id  uuid references departemen (id) on delete restrict,
  catatan        text not null default '',
  otomatis       boolean not null default false,   -- baris buatan sistem (mis. kredit Hutang Beban)
  check ((debit > 0) <> (kredit > 0))
);
create index jurnal_baris_jurnal on jurnal_baris (jurnal_id);
create index jurnal_baris_akun on jurnal_baris (akun_id);
create index jurnal_baris_departemen on jurnal_baris (departemen_id);

-- Penjaga terakhir: setiap jurnal harus punya rincian dan seimbang. Diperiksa
-- saat commit (deferred), jadi kepala & baris boleh ditulis berurutan dalam satu
-- transaksi. Memakai TG_TABLE_SCHEMA supaya berlaku di finance maupun finance_uji.
create function periksa_jurnal_seimbang() returns trigger language plpgsql as $$
declare
  jid uuid;
  jumlah_debit numeric;
  jumlah_kredit numeric;
  jumlah_baris int;
  ada boolean;
begin
  if tg_table_name = 'jurnal' then
    jid := new.id;
  elsif tg_op = 'DELETE' then
    jid := old.jurnal_id;
  else
    jid := new.jurnal_id;
  end if;
  execute format('select exists (select 1 from %I.jurnal where id = $1)', tg_table_schema) into ada using jid;
  if not ada then
    return null;   -- jurnalnya ikut dihapus
  end if;
  execute format('select coalesce(sum(debit), 0), coalesce(sum(kredit), 0), count(*) from %I.jurnal_baris where jurnal_id = $1', tg_table_schema)
    into jumlah_debit, jumlah_kredit, jumlah_baris using jid;
  if jumlah_baris = 0 then
    raise exception 'Jurnal tanpa rincian tidak boleh disimpan.';
  end if;
  if jumlah_debit <> jumlah_kredit then
    raise exception 'Jurnal tidak seimbang: total debit % dan total kredit %.', jumlah_debit, jumlah_kredit;
  end if;
  return null;
end $$;

create constraint trigger jurnal_baris_seimbang
  after insert or update or delete on jurnal_baris
  deferrable initially deferred
  for each row execute function periksa_jurnal_seimbang();

create constraint trigger jurnal_punya_rincian
  after insert on jurnal
  deferrable initially deferred
  for each row execute function periksa_jurnal_seimbang();

-- ── Penomoran Pencatatan Beban ─────────────────────────────────────────────
insert into penomoran (nama, tipe_transaksi, format, digit_counter, reset, bawaan) values
  ('Pencatatan Beban', 'pencatatan_beban',
   '[{"jenis":"teks","nilai":"PB."},{"jenis":"tahun"},{"jenis":"teks","nilai":"."},{"jenis":"bulan"},{"jenis":"teks","nilai":"."},{"jenis":"counter"}]',
   5, 'bulan', true);

-- ── Penyetuju transaksi ────────────────────────────────────────────────────
create table penyetuju_transaksi (
  tipe_transaksi  text primary key check (tipe_transaksi ~ '^[a-z][a-z0-9_]*$'),
  aktif           boolean not null default false,
  nilai_minimal   numeric(18, 2) check (nilai_minimal is null or nilai_minimal >= 0),
  diubah_oleh     uuid references pengguna (id) on delete set null,
  diubah_at       timestamptz not null default now()
);

create table penyetuju_transaksi_pengguna (
  tipe_transaksi  text not null references penyetuju_transaksi (tipe_transaksi) on delete cascade,
  pengguna_id     uuid not null references pengguna (id) on delete cascade,
  primary key (tipe_transaksi, pengguna_id)
);
