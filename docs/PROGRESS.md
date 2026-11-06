# EATS Dashboard — Progres

> Catatan kronologis. Yang terbaru di atas.

## 2026-11-06 — Sidebar bisa dibuka-tutup

Permintaan Lutfi. Di laptop, tombol ☰ di kiri judul halaman menciutkan sidebar jadi bilah ikon selebar 76 px.
Nama menu muncul sebagai keterangan saat ikon disentuh kursor, dan pilihannya diingat browser (`eats.sidebar`).
Di HP tidak berubah: tetap laci penuh. Dicek di browser lokal: ciut → buka, tetap ciut setelah dimuat ulang,
menu aktif tetap bersorot, laci HP 390 px tetap penuh. Saat menguji ketemu dan diperbaiki: keterangan melayang
yang langsung membungkus NavLink menghapus gaya menu aktif.

## 2026-11-06 — Tombol keluar, login awet, tampilan "Merah cabai", data dikosongkan

Permintaan Lutfi setelah berhasil login di Vercel:
1. **Tombol Keluar hanya memunculkan toast.** Sebabnya `qc.clear()` ikut membuang kueri sesi yang dipantau
   ProtectedRoute, jadi halaman tidak tahu sesinya sudah kosong. Sekarang sesi dikosongkan dulu, data lain dibuang,
   lalu pindah ke /masuk. Terbukti di browser lokal: klik Keluar → halaman login.
   **Login awet sampai Keluar:** cookie 365 hari dan diperpanjang otomatis saat dipakai (`wajibMasuk`). Terbukti:
   Max-Age 365 hari; token berumur 2 hari diperpanjang, token berumur 1 jam tidak.
2. **Tampilan lebih ramah, hijau → merah cabai.** Latar putih, sidebar putih, huruf Plus Jakarta Sans, kartu utama
   "Untung/Rugi" + "Dari setiap Rp100 penjualan", kartu angka berikon, tanpa label huruf kapital dan nomor bagian.
   "Membaik" kini biru (merah sudah dipakai merek dan "memburuk"). Dicek di browser lokal: desktop, HP 390 px,
   tablet 820 px (tidak ada yang melebar ke samping); halaman Masuk, Ringkasan, Unggah, Cek dan setujui, Pengguna,
   dan keadaan kosong.
3. **Semua data dihapus, akun Lutfi dibuat.** Dihapus dalam satu transaksi: 447 angka laporan, 6 unggahan beserta
   berkasnya, 3 akun uji. Pengaturan (46 pos laporan, 2 unit usaha) tetap. Akun baru: admin `boomboo.eatly@gmail.com`
   (nama Lutfi), kata sandinya di berkas `env-akun` di akar project (masuk `.gitignore`). Terbukti bisa masuk (200).
   `akun-baru.local.txt` (akun uji lama) dihapus. Akun uji sementara untuk cek tampilan sudah dihapus lagi.

Belum: perubahan 1 dan 2 belum di-push, jadi Vercel masih versi lama. Penghapusan data dan akun baru sudah berlaku
di production karena databasenya sama.

## 2026-11-06 — Deploy ke Vercel

| Project Vercel | Alamat | Root Directory |
| :--- | :--- | :--- |
| Backend `eats-dashboard-server` | https://eats-dashboard-server.vercel.app | `server` |
| Frontend | https://eat-dashboard-kappa.vercel.app | `client` |

Dua masalah di deploy pertama, diperbaiki di commit `7b878e5` (push atas izin Lutfi):
1. Frontend: "The deployment could not be found on Vercel". `client/vercel.json` masih berisi alamat contoh
   → diisi alamat backend.
2. Backend: "Invalid export found in module server/src/app.js". Vercel otomatis mendeteksi project sebagai
   Express dan mengambil `src/app.js` sebagai titik masuk; hanya alamat `/` yang rusak, `/api/...` sudah jalan
   → `"framework": null` (= Other) di `server/vercel.json`.

Ikut di commit yang sama: batas Claude 90 detik & Gemini 45 detik (proxy Vercel menunggu maks 120 detik),
dan halaman Unggah menunggu status dari server bila sambungan terputus.

Bukti setelah deploy ulang: backend `/` → "EATS Dashboard API"; frontend `/api/sehat` → `"status":"baik"`
(lewat proxy); `/api/auth/saya` → 401 "Silakan masuk dulu."; login dengan akun palsu → "Email atau kata sandi
salah" (backend tersambung ke database); halaman login tampil di browser.
`MIGRASI_DATABASE_URL` sudah dihapus Lutfi dari env Vercel.

Belum teruji di Vercel: masuk dengan akun sungguhan, unggah & baca AI (termasuk jalur "menunggu hasil").

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
