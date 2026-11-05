-- ============================================================================
-- 002 — EBITDA menambahkan kembali bunga (definisi baku)
--
-- EBITDA = laba sebelum Bunga, pajak (Tax), penyusutan (Depreciation), dan
-- amortisasi. Bunga leasing di berkas contoh tercatat di dalam biaya lain-lain,
-- jadi sudah mengurangi laba bersih; untuk EBITDA ia harus ditambahkan kembali.
--
-- Temuan di Rekap_PT-EATS_2026_DUMMY.xlsx (2026-11-05): rumus EBITDA PT EATS
-- April–Oktober memang menambahkan bunga (=L68+L70+…, baris 70 = Bunga Leasing),
-- tetapi kolom gabungan per bulan dan total konsolidasi TIDAK. Berkas itu tidak
-- konsisten di dalamnya sendiri; aplikasi memakai definisi baku dan cek silang
-- akan menandai kolom gabungan April–Oktober. Keputusan akhir: Lutfi.
-- ============================================================================

update pos_akun set tambah_ebitda = true where kode = 'bunga_leasing';
