# EATS Dashboard — Rancangan

> Dashboard keuangan PT EATS. User mengunggah laporan (Excel, PDF, atau foto), AI membacanya,
> user **mengecek dan menyetujui**, baru angkanya masuk database dan tampil di dashboard bergaya PLD.
>
> Disusun 2026-11-05. Bagian bertanda **(keputusan Lutfi)** berasal dari Lutfi; sisanya
> **(keputusan Claude)** dan boleh diubah.

---

## 1. Alur utama

```text
Masuk (login)
  → Unggah berkas (.xlsx, .pdf, .png, .jpg, .jpeg, .webp; maks 4 MB)
  → AI membaca: Claude dulu, kalau gagal Gemini 3.5 Flash, lalu Gemini 3.5 Flash Lite   (keputusan Lutfi)
  → Sistem menyusun RENCANA: angka mana masuk pos apa, unit apa, bulan apa
  → Sistem mencocokkan hitungan dengan baris total di berkas (cek silang)
  → User MENGECEK dan MENYETUJUI rencana (boleh mengubah angka)                        (keputusan Lutfi)
  → Disimpan: data unit+bulan yang sama DIGANTI, bukan ditambah (tidak pernah dobel)
  → Dashboard
```

### Cara AI membaca, per jenis berkas (keputusan Claude)

| Jenis | Siapa membaca angka | Peran AI |
| :--- | :--- | :--- |
| **Excel** | **Program**, langsung dari sel (nilai hasil rumus) | Memetakan: baris ini = pos apa, kolom ini = unit apa + bulan apa, baris mana yang total |
| **PDF / foto** | **AI** | Membaca angka + memetakan sekaligus |

Alasannya: satu berkas contoh berisi lebih dari seribu angka. Kalau AI yang menyalin angka,
salah satu digit bisa lolos tanpa ketahuan. Di Excel, angka diambil apa adanya dari sel, dan AI
hanya memutuskan "artinya apa". Kesalahan pemetaan tertangkap oleh **cek silang** dengan baris
total milik berkas itu sendiri (TOTAL REVENUE, Gross Profit, NET PROFIT, EBITDA, dst.).

## 2. Stack

| Bagian | Pilihan |
| :--- | :--- |
| Frontend `client/` | Vite + React 18 (**JavaScript**), Tailwind, shadcn/ui, Zustand, TanStack Query, axios, react-router-dom, react-icons + lucide, react-hot-toast, Recharts, framer-motion |
| Backend `server/` | Express 5 (JavaScript), `pg` langsung, bcryptjs, jsonwebtoken, multer, zod, exceljs, `@anthropic-ai/sdk`; Gemini lewat `fetch` |
| Database | Supabase **milik bos** (project yang sama dengan POS/Operations/Marketing), **schema `finance`** |
| Deploy | Vercel, frontend & backend dua project terpisah, region `sin1` |
| Port lokal | frontend **5178**, backend **4910** (`strictPort`) |

Tampilan meniru PLD Dashboard (`C:\projects\PLD-dashboard\clone_code\web`): latar krem, warna tosca,
aksen coral, judul Fraunces, teks DM Sans, kartu angka, bagian bernomor dengan kalimat kesimpulan.

## 3. Database (schema `finance`)

Pola sama dengan Marketing Dashboard:

- Peran khusus **`finance_app`** (dipakai aplikasi): hanya baca-tulis **isi** tabel di `finance`.
  Tidak bisa membuat tabel, tidak bisa mengubah data master, tidak bisa melihat schema lain.
  Dibuktikan oleh `npm run uji:isolasi`.
- Peran **`postgres`** (`MIGRASI_DATABASE_URL`) hanya untuk migrasi.
- `search_path = finance, extensions` — **tanpa `public`**.
- `anon`, `authenticated`, `service_role`: tidak punya hak apa pun. Tidak lewat Data API.
- Data keuangan PT EATS lama di `public.stg_*` **tidak dipakai dan tidak disentuh** (keputusan Lutfi).

| Tabel | Isi |
| :--- | :--- |
| `pengguna` | Akun login aplikasi (email, nama, hash kata sandi, peran `admin`/`staf`, aktif) |
| `unit_usaha` | `EATS` (PT EATS — maklon untuk Hangry), `BOOMBOO` (Boomboo — retail dan B2B) |
| `pos_akun` | 46 pos baku laba rugi, dikelompokkan: pendapatan, hpp, biaya_maklon, biaya_lainnya, biaya_dimples, di_bawah_laba |
| `unggahan` | Tiap berkas: status, hasil mentah AI, **rencana**, siapa & kapan menyetujui, ringkasan simpan |
| `unggahan_berkas` | Berkas asli (bytea) sebagai bukti |
| `nilai_laporan` | Angka yang sudah disetujui. **Unik per (unit, bulan, pos)** |

**Angka total tidak disimpan.** Semua dihitung dari pos rinci (§5), supaya tidak ada dua versi angka.

**Kosong ≠ nol.** Sel kosong tidak disimpan dan tampil "—". Sel berisi 0 disimpan sebagai 0.

Status unggahan: `diunggah` → `menunggu_cek` (atau `gagal_dibaca`) → `disetujui` / `dibatalkan`.

## 4. Peran pengguna (keputusan Claude)

| Peran | Boleh |
| :--- | :--- |
| `staf` | Melihat dashboard, mengunggah, mengecek, menyetujui, membatalkan |
| `admin` | Semua yang staf boleh + mengelola akun pengguna |

Akun pertama dibuat lewat `npm run pengguna:buat` di `server/`.

## 5. Rumus (mengikuti rumus di berkas Excel contoh)

| Ukuran | Rumus |
| :--- | :--- |
| Total pendapatan | Σ kelompok `pendapatan` |
| Total harga pokok penjualan | Σ kelompok `hpp` |
| Laba kotor | Total pendapatan − Total harga pokok penjualan |
| Biaya lain-lain (pos j) | Σ kelompok `biaya_lainnya` |
| Total biaya maklon | Σ `biaya_maklon` + Biaya lain-lain |
| Total biaya Dimples | Σ `biaya_dimples` |
| Total biaya operasional | Total biaya maklon + Total biaya Dimples |
| Laba bersih | Laba kotor − Total biaya operasional |
| Total penyusutan | `penyusutan` + `dimples_penyusutan` |
| EBITDA | Laba bersih + Σ pos `tambah_ebitda` (bunga leasing, pajak, penyusutan, amortisasi) — definisi baku. Lihat catatan di bawah |
| Persentase / margin | Dihitung dari total, bukan dirata-rata |
| Gabungan | Jumlah pos kedua unit, lalu total & margin dihitung ulang |

Jumlah dari pos yang semuanya kosong = kosong (bukan 0).

**Catatan EBITDA (menunggu keputusan Lutfi):** di berkas contoh, rumus EBITDA PT EATS April–Oktober
menambahkan bunga, tetapi kolom gabungan dan total konsolidasi tidak. Aplikasi memakai definisi baku
(bunga ditambahkan kembali, migrasi 002), sehingga cek silang menandai EBITDA gabungan April–Oktober
berselisih Rp120.000 per bulan. Itu memang ketidakcocokan di dalam berkasnya.

## 6. Kontrak API (`/api`, JSON)

Bentuk jawaban: `{ ok: true, data }` atau `{ ok: false, error: { code, message } }`.
Sesi: cookie httpOnly `eats_sesi` (JWT 12 jam, `SameSite=Lax`). Di lokal lewat proxy Vite,
di production lewat rewrite Vercel, jadi browser melihat satu domain.

### Auth
| Metode & alamat | Body | Jawaban `data` |
| :--- | :--- | :--- |
| `POST /api/auth/masuk` | `{ email, kata_sandi }` | `{ pengguna }` + set cookie. Galat: 401 `KREDENSIAL_SALAH`, 403 `AKUN_NONAKTIF`, 429 |
| `POST /api/auth/keluar` | – | `{}` |
| `GET /api/auth/saya` | – | `{ pengguna }`; 401 `BELUM_MASUK` |

`pengguna` = `{ id, email, nama, peran, aktif }`

### Pengguna (admin)
| | | |
| :--- | :--- | :--- |
| `GET /api/pengguna` | – | `[{ id, email, nama, peran, aktif, login_terakhir_at, dibuat_at }]` |
| `POST /api/pengguna` | `{ email, nama, peran, kata_sandi }` | pengguna baru |
| `PATCH /api/pengguna/:id` | `{ nama?, peran?, aktif?, kata_sandi? }` | pengguna. Tidak bisa menonaktifkan / menurunkan diri sendiri |

### Referensi
`GET /api/referensi` → `{ unit: [{kode,nama,keterangan,urutan}], pos: [{kode,nama,kelompok,urutan,nama_di_berkas,tambah_ebitda}], kelompok: [{kode,nama}] }`

### Unggahan
| | | |
| :--- | :--- | :--- |
| `POST /api/unggahan` | multipart, field `berkas` | `{ unggahan, berkas_sama: [{id,status,nama_berkas,diunggah_at}] }` |
| `POST /api/unggahan/:id/baca` | – | `unggahan` lengkap (status `menunggu_cek` atau `gagal_dibaca` + `pesan_gagal`). Bisa diulang |
| `GET /api/unggahan` | – | daftar ringkas, terbaru dulu |
| `GET /api/unggahan/:id` | – | `{ unggahan, data_tersimpan: [{unit_kode, periode, pos_kode, nilai}] }` — angka yang sekarang ada di database untuk unit+bulan yang sama (untuk perbandingan "lama → baru") |
| `GET /api/unggahan/:id/berkas` | – | berkas asli (unduh) |
| `POST /api/unggahan/:id/setujui` | `{ nilai: [{unit_kode, periode:'YYYY-MM', pos_kode, nilai}] }` | `{ unggahan, ringkasan: { ditulis, diganti, dihapus, unit:[], periode:[] } }` |
| `POST /api/unggahan/:id/batalkan` | – | `unggahan` |

`unggahan` ringkas = `{ id, nama_berkas, jenis_berkas, ukuran, status, diunggah_at, diunggah_oleh_nama, dibaca_at, sumber_ai, pesan_gagal, diputuskan_at, diputuskan_oleh_nama, jumlah_nilai, periode_awal, periode_akhir }`
`unggahan` lengkap = ringkas + `{ rencana, ringkasan_simpan }`

**`rencana`**:
```js
{
  versi: 1,
  jenis_berkas: "excel" | "pdf" | "gambar",
  adalah_laporan_keuangan: true,
  judul: "LAPORAN KEU PT.EATS 2026 (DUMMY DATA)",
  catatan_ai: "…",
  nilai: [{ unit_kode, periode: "2026-01", pos_kode, nilai: 57299000,
            sumber: [{ label: "Revenue", letak: "Sheet 2026!C9" }], ragu: false, alasan_ragu: "" }],
  pemeriksaan: [{ unit_kode: "EATS" | "BOOMBOO" | "GABUNGAN", periode: "2026-01",
                  ukuran: "laba_bersih", nama_ukuran: "Laba bersih",
                  angka_berkas: -1905000, angka_hitung: -1905000, selisih: 0, cocok: true }],
  diabaikan: [{ label, letak, alasan }],
  peringatan: ["…"]
}
```

### Laporan
`GET /api/laporan?tahun=2026` →
```js
{
  tahun: 2026,
  tahun_tersedia: [2026],
  periode: ["2026-01", …],                 // bulan yang punya data (unit mana pun)
  unit: [{ kode, nama, keterangan }],
  laporan: {
    EATS:     { "2026-01": { pos: { pendapatan: 57299000, … }, ukuran: { total_pendapatan, … } } },
    BOOMBOO:  { … },
    GABUNGAN: { "2026-01": { pos, ukuran, unit_ada: ["EATS","BOOMBOO"] } }
  },
  asal: { "EATS|2026-01": { unggahan_id, nama_berkas, disetujui_at, disetujui_oleh_nama } }
}
```
`ukuran` = `{ total_pendapatan, total_hpp, laba_kotor, margin_laba_kotor, persen_hpp, biaya_lainnya,
total_biaya_maklon, total_biaya_dimples, total_biaya_operasional, laba_bersih, margin_laba_bersih,
total_penyusutan, ebitda }` — margin/persen berupa pecahan (0,339 = 33,9%), `null` kalau tidak bisa dihitung.

## 7. Halaman

| Alamat | Isi |
| :--- | :--- |
| `/masuk` | Login (email + kata sandi dengan tombol lihat) |
| `/` | **Ringkasan laba rugi**: pilih unit (Gabungan / PT EATS / Boomboo) dan bulan. Bagian bernomor: 1 · Hasil bulan ini (kartu angka + perbandingan bulan lalu), 2 · Tren bulanan (grafik), 3 · Ke mana biayanya pergi, 4 · Rincian laba rugi per bulan (tabel + unduh CSV) |
| `/unggah` | Kotak unggah + riwayat unggahan |
| `/unggahan/:id` | **Cek & setujui**: hasil cek silang, tabel rencana per unit (bisa diubah), sorotan kuning untuk yang AI ragukan, perbandingan dengan data lama, tombol "Benar, simpan" / "Batalkan" |
| `/pengguna` | Kelola akun (admin) |

Aturan tampilan: tanpa singkatan, angka rupiah penuh (tidak dipotong), rentang bulan ditulis jelas
("Jan–Okt 2026"), skeleton saat memuat, toast untuk setiap permintaan ke server, responsif HP/tablet/desktop,
sidebar sticky setinggi layar.

## 8. Batasan versi pertama

- Satu berkas per unggahan. Sheet ganda di satu Excel didukung (AI memilih yang relevan).
- Format berkas yang dikenal: laba rugi bulanan seperti `Rekap_PT-EATS_2026_DUMMY.xlsx`. Pos yang tidak
  dikenal masuk "Lain-lain yang belum dikelompokkan" dengan label aslinya tercatat di `sumber`.
- Batas Vercel ±4,5 MB per permintaan → batas unggah 4 MB.
- Belum ada neraca / arus kas.
