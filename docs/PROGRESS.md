# EATS Dashboard — Progres

> Catatan kronologis. Yang terbaru di atas.

## 2026-11-05 — Hari pertama: dari folder kosong sampai alur lengkap

Lutfi meminta dashboard bergaya PLD untuk PT EATS: user mengunggah laporan (Excel/PDF/foto),
AI membaca (Claude, cadangan Gemini), user mengecek dan menyetujui, lalu angka masuk database.
Lutfi menyerahkan pengerjaan ("kerjain sebisa lu") dan meminta dihubungkan ke GitHub
`eatly-projects/EATS-DASHBOARD`.

### Keputusan Lutfi
- Rencana hasil AI **wajib dicek dan disetujui user** sebelum masuk database.
- Koneksi database & kunci AI **disalin dari backend Operations** (database bos yang sama).
- Data keuangan PT EATS lama di `public.stg_*` **tidak dipakai dan tidak disentuh**.
- Stack mengikuti kebiasaan Lutfi; tampilan mengikuti PLD Dashboard.

### Yang sudah jadi & terbukti
| Bagian | Bukti |
| :--- | :--- |
| Schema `finance` di database bos (migrasi 001, 002) | Jumlah tabel/view schema `public`, `pos`, `operation_v2`, `marketing` sama persis sebelum & sesudah migrasi (dicetak `npm run migrate`) |
| Peran khusus `finance_app` | `npm run uji:isolasi`: 13/13 lulus — bisa baca schema sendiri; ditolak membuat tabel, mengubah data master, membaca catatan migrasi, dan melihat schema lain |
| Rumus laba rugi | `npm run uji`: 7/7 lulus, termasuk angka asli PT EATS Januari dari berkas contoh |
| AI membaca Excel contoh | Claude Opus 5.5, ±60 detik, 16.314 token masuk / 8.123 token keluar (±US$0,23). 447 angka; cek silang **307 dari 315 total cocok** — sisanya lihat "Temuan" |
| AI membaca PDF | PDF uji buatan sendiri: 20 angka terbaca benar, ±45 detik (±US$0,15). Cek silang menangkap laba bersih PDF yang salah hitung |
| Setujui → simpan | 447 angka tersimpan; setuju dua kali ditolak (409) |
| Unggah ulang tidak dobel | Berkas sama dikenali; disetujui ulang → "447 sama, 0 diganti, 0 dihapus", isi database tetap 447 |
| Laporan | Oktober: laba bersih PT EATS −Rp2.856.384, Boomboo Rp6.215.500, EBITDA PT EATS −Rp429.384 — sama dengan sel Excel |

### Uji tampilan di browser (localhost:5178 + backend 4910)
| Halaman | Hasil |
| :--- | :--- |
| Masuk | Tampil, salah kata sandi → pesan server sebagai toast + teks |
| Ringkasan laba rugi | Kartu angka, perbandingan, tren, biaya, rincian per bulan — angka Okt & total Jan–Okt sama dengan Excel; lonjakan listrik Okt ditandai "perlu dicek" |
| Unggah (alur penuh lewat layar) | Pilih berkas → peringatan "berkas sama pernah diunggah" → animasi menunggu ±60 dtk → otomatis ke halaman cek |
| Cek dan setujui | Cek silang, catatan AI, pemberitahuan "akan MENGGANTI", tabel bisa diubah, dialog konfirmasi → simpan → kembali ke ringkasan |
| Pengguna | Daftar akun, tombol tambah |
| HP 390 px & tablet 820 px | 4 halaman × 2 lebar: tidak ada yang melebar ke samping (diukur dengan skrip); menu HP jadi laci |

Diperbaiki saat uji: (1) cek silang di layar belum menghitung total setahun → "40 tidak cocok", sekarang 8 sama dengan
server; (2) tabel riwayat melebar 27 px di tablet (teks pembaca layar lolos dari wadah gulir); (3) kartu tiga langkah
terlalu sempit di tablet; (4) pindah halaman tidak kembali ke atas; (5) catatan AI memuat kode teknis → instruksi diubah
ke bahasa awam; (6) AI hanya melihat 8 contoh rumus per baris sehingga tidak tahu rumus EBITDA berubah mulai April →
ringkasan kini menyertakan semua pola rumus yang berbeda.

### Temuan di berkas contoh `Rekap_PT-EATS_2026_DUMMY.xlsx`
1. **EBITDA tidak konsisten di dalam berkas.** Kolom PT EATS April–Oktober menambahkan bunga leasing
   (Rp120.000/bulan, `=L68+L70+…`), kolom gabungan & total konsolidasi tidak. Aplikasi memakai definisi
   baku (bunga ditambahkan), jadi cek silang menandai 8 total EBITDA gabungan. **Perlu keputusan Lutfi.**
2. **Listrik & air PT EATS Oktober Rp10.195.384** (bulan lain ±Rp700 ribu). Isinya rumus `=10637384−gas`.
   Mungkin salah ketik; aplikasi menampilkannya apa adanya.
3. Gaji Boomboo September–Oktober = jumlah baris rincian tersembunyi yang kosong → 0.
4. Ada blok tersembunyi tanpa judul (baris 59–66) yang tidak ikut total mana pun → diabaikan.

### Data yang sekarang ada di database
Data DUMMY dari berkas contoh (Jan–Okt 2026, PT EATS & Boomboo) sudah **disetujui oleh akun uji**
supaya dashboard bisa dilihat. Kalau mau dikosongkan sebelum dipakai sungguhan, lihat README → "Mengosongkan data uji".

### Akun
- `uji@eats.test` (admin, aktif) — akun uji buatan Claude. Kata sandinya di `akun-baru.local.txt` (tidak ikut ke GitHub).
  Dipakai Lutfi untuk masuk pertama kali, lalu sebaiknya dinonaktifkan setelah Lutfi membuat akunnya sendiri.
- `uji-tampilan@eats.test` (admin, **sudah dinonaktifkan**) — akun sekali pakai untuk uji browser.

### Isi unggahan saat ini
3 disetujui (Excel dummy, isinya sama), 1 dibatalkan (PDF uji), **1 menunggu dicek** (Excel dummy, sengaja
disisakan supaya Lutfi bisa mencoba tombol "Benar, simpan" sendiri — hasilnya "447 sama", data tidak berubah).

### Biaya AI terukur
Excel contoh ±18 rb token masuk + ±8 rb token keluar ≈ US$0,23 per baca (±60 detik). PDF satu halaman ≈ US$0,15 (±45 detik).
Selama pengerjaan hari ini: 4× baca Excel + 1× PDF ≈ US$1,1.

### Git
Remote `origin` = `https://github.com/eatly-projects/EATS-DASHBOARD.git`, cabang `main`. Commit pertama `f3cba2f`
di-push atas izin Lutfi (2026-11-05). 110 berkas; dicek tidak ada `.env`, kunci, kata sandi, atau berkas Excel/PDF.

### Belum / terbuka
- Pertanyaan untuk Lutfi: (1) definisi EBITDA, (2) arti "MGM" di biaya maklon, (3) siapa saja penggunanya & perannya.
- Belum di-deploy ke Vercel.
- Cadangan Gemini belum pernah terpakai (Claude selalu berhasil), jadi jalurnya belum teruji sungguhan.
- Foto (png/jpg) memakai jalur yang sama dengan PDF tetapi belum diuji dengan foto sungguhan.
