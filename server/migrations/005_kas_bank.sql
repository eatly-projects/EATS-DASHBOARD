-- ============================================================================
-- 005 — Kas & Bank dasar (Tahap 2a)
--
-- Dijalankan oleh migrations/jalankan.js sebagai peran postgres, dalam satu
-- transaksi, dengan search_path = <DB_SCHEMA>, extensions. Tidak menyebut nama
-- schema, jadi berkas yang sama dipasang ke finance_uji (uji) dan finance.
--
-- Isi:
--   jurnal.tipe                   + penerimaan, pembayaran, transfer_bank
--   akun                          + bank_nama, nomor_rekening_akhir (untuk akun Kas & Bank)
--   perusahaan                    + akun_rekening_utama_id (bawaan: 110102 Bank, BCA)
--   penomoran                     bawaan BM. (Penerimaan), BK. (Pembayaran), TB. (Transfer Bank)
--
-- Rancangan: docs/superpowers/specs/2026-11-24-kas-bank-dan-sambungan-operasional-design.md §4.1–4.2.
-- ============================================================================

-- ── Tipe jurnal ────────────────────────────────────────────────────────────
-- Nama constraint bawaan Postgres untuk check kolom tipe; dicari dulu supaya
-- migrasi tetap jalan kalau namanya berbeda.
do $$
declare
  nama text;
begin
  for nama in
    select c.conname from pg_constraint c
     where c.conrelid = 'jurnal'::regclass and c.contype = 'c' and pg_get_constraintdef(c.oid) like '%tipe%jurnal_umum%'
  loop
    execute format('alter table jurnal drop constraint %I', nama);
  end loop;
end $$;
alter table jurnal add constraint jurnal_tipe_check
  check (tipe in ('jurnal_umum', 'pencatatan_beban', 'saldo_awal', 'penerimaan', 'pembayaran', 'transfer_bank'));

-- ── Rekening ───────────────────────────────────────────────────────────────
-- Dipakai untuk mencocokkan rekening tujuan dari aplikasi Operasional (bank + 4 angka terakhir).
alter table akun
  add column bank_nama            text not null default '',
  add column nomor_rekening_akhir text not null default '' check (nomor_rekening_akhir ~ '^([0-9]{4})?$');

update akun set bank_nama = 'BCA' where kode = '110102';

-- Pembayaran lama dari Operasional tanpa rekening tujuan masuk ke rekening utama.
alter table perusahaan add column akun_rekening_utama_id uuid references akun (id) on delete restrict;
update perusahaan set akun_rekening_utama_id = (select id from akun where kode = '110102');

-- ── Penomoran bawaan ───────────────────────────────────────────────────────
insert into penomoran (nama, tipe_transaksi, format, digit_counter, reset, bawaan) values
  ('Penerimaan', 'penerimaan',
   '[{"jenis":"teks","nilai":"BM."},{"jenis":"tahun"},{"jenis":"teks","nilai":"."},{"jenis":"bulan"},{"jenis":"teks","nilai":"."},{"jenis":"counter"}]',
   5, 'bulan', true),
  ('Pembayaran', 'pembayaran',
   '[{"jenis":"teks","nilai":"BK."},{"jenis":"tahun"},{"jenis":"teks","nilai":"."},{"jenis":"bulan"},{"jenis":"teks","nilai":"."},{"jenis":"counter"}]',
   5, 'bulan', true),
  ('Transfer Bank', 'transfer_bank',
   '[{"jenis":"teks","nilai":"TB."},{"jenis":"tahun"},{"jenis":"teks","nilai":"."},{"jenis":"bulan"},{"jenis":"teks","nilai":"."},{"jenis":"counter"}]',
   5, 'bulan', true);
