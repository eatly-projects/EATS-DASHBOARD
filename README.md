# EATS Dashboard

Dashboard keuangan PT EATS. User mengunggah laporan laba rugi (Excel, PDF, atau foto), AI membacanya,
user **mengecek dan menyetujui**, baru angkanya masuk database dan tampil di dashboard bergaya PLD.

| Bagian | Isi |
| :--- | :--- |
| `client/` | Frontend: Vite + React (JavaScript), Tailwind, shadcn/ui, Zustand, TanStack Query, Recharts |
| `server/` | Backend: Express + `pg` langsung ke Postgres, pembaca Excel, AI (Claude → Gemini) |
| `docs/` | `PLANNING.md` (rancangan & kontrak API), `PROGRESS.md` (catatan kerja) |
| Database | Supabase **milik bos**, schema **`finance`**, peran khusus **`finance_app`** |

## Alur

```text
Masuk → Unggah berkas → AI membaca → Rencana + cek silang dengan baris total di berkas
      → User mengecek & menyetujui → Disimpan (data unit+bulan yang sama DIGANTI, tidak dobel) → Dashboard
```

- **Excel**: angka diambil program langsung dari sel; AI hanya memetakan arti baris & kolom.
- **PDF/foto**: AI membaca angkanya; wajib dicocokkan dengan dokumen saat pengecekan.

## Menjalankan di laptop

Butuh Node.js 20+. Satu-satunya berkas rahasia adalah `.env` di akar project (contoh: `.env.example`).

```bash
# Terminal 1 — backend (port 4910)
cd server
npm install
npm run dev

# Terminal 2 — frontend (port 5178)
cd client
npm install
npm run dev
```

Buka **http://localhost:5178**. Frontend meneruskan `/api` ke backend lewat proxy Vite.

## Perintah backend (`server/`)

| Perintah | Kegunaan |
| :--- | :--- |
| `npm run dev` | Jalankan backend dengan muat ulang otomatis |
| `npm run migrate` | Tampilkan migrasi yang belum terpasang (tambah `-- --ya` untuk menjalankan). Memakai `MIGRASI_DATABASE_URL` |
| `npm run peran:buat -- --ya` | Buat/ganti kata sandi peran `finance_app`, lalu tulis `DATABASE_URL` baru ke `.env` |
| `npm run pengguna:buat -- --email a@b.com --nama "Nama" --peran admin` | Buat akun login (kata sandi diketik). Tambah `--sandi-acak` untuk kata sandi acak yang ditulis ke `akun-baru.local.txt`. Akun Lutfi: kata sandinya di berkas `env-akun` |
| `npm run cek:db` | Cek sambungan & isi singkat database |
| `npm run uji:isolasi` | Buktikan `finance_app` hanya bisa menyentuh schema `finance` |
| `npm run uji` | Uji rumus laba rugi & penyusun rencana |

## Database (schema `finance`)

| Tabel | Isi |
| :--- | :--- |
| `pengguna` | Akun login aplikasi (peran `admin` / `staf`) |
| `unit_usaha` | `EATS` (maklon Hangry), `BOOMBOO` (retail & B2B) |
| `pos_akun` | 46 pos laba rugi baku (data master, diubah hanya lewat migrasi) |
| `unggahan` + `unggahan_berkas` | Tiap unggahan, rencana hasil AI, keputusan, dan berkas aslinya |
| `nilai_laporan` | Angka yang sudah disetujui, unik per unit-bulan-pos |

Angka total (laba kotor, laba bersih, EBITDA) tidak disimpan; dihitung dari pos rinci (`docs/PLANNING.md` §5).
Schema lain di database bos (`public`, `pos`, `operation_v2`, `marketing`) tidak disentuh.

## Deploy ke Vercel (belum dilakukan)

Dua project Vercel terpisah, keduanya region `sin1`:

1. **Backend**: Root Directory `server`. Env: `DATABASE_URL` (peran `finance_app`, port 6543), `DB_SCHEMA=finance`,
   `JWT_SECRET`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `CLIENT_ORIGIN` (alamat frontend), `NODE_ENV=production`.
   **Jangan** isi `MIGRASI_DATABASE_URL` di Vercel. `vercel.json` sudah menyetel `maxDuration` 300 detik karena AI butuh ±60 detik.
2. **Frontend**: Root Directory `client`. Ganti alamat backend di `client/vercel.json` (rewrite `/api/...`), supaya browser
   melihat satu domain dan cookie login tetap aman.

## Mengosongkan data uji

Data dummy dari `Rekap_PT-EATS_2026_DUMMY.xlsx` sudah disetujui supaya dashboard bisa dilihat. Untuk mengosongkannya
(jalankan sebagai peran postgres di SQL Editor Supabase):

```sql
begin;
delete from finance.nilai_laporan;
delete from finance.unggahan;      -- berkas aslinya ikut terhapus
commit;
```

## Keamanan

- Jangan pernah meng-commit `.env`, `env-akun`, atau `akun-baru.local.txt` (sudah di `.gitignore`).
- Berkas Excel/PDF/CSV juga diabaikan git karena berisi angka keuangan.
