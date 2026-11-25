-- ============================================================================
-- 006 — Cadangan data dari aplikasi Operasional (Tahap 3a)
--
-- Dijalankan oleh migrations/jalankan.js sebagai peran postgres, dalam satu
-- transaksi, dengan search_path = <DB_SCHEMA>, extensions. Tidak menyebut nama
-- schema, jadi berkas yang sama dipasang ke finance_uji (uji) dan finance.
--
-- Isi:
--   operasional_cadangan   jawaban sah terakhir dari API Operasional per jenis
--                          (kunci 'piutang'), supaya saat Operasional tidak bisa
--                          dihubungi EATS tetap bisa menampilkan data terakhir
--                          beserta waktunya. Hak finance_app mengikuti default
--                          privileges schema ini.
--
-- Rancangan: docs/superpowers/specs/2026-11-24-kas-bank-dan-sambungan-operasional-design.md §5.1.
-- ============================================================================

create table operasional_cadangan (
  kunci         text primary key,
  isi           jsonb not null,
  diambil_pada  timestamptz not null default now()
);

comment on table operasional_cadangan is
  'Jawaban sah terakhir dari API Operasional (Boomboo Operations), dipakai saat Operasional tidak bisa dihubungi.';
