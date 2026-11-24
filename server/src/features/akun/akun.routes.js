import { Router } from "express";
import { z } from "zod";
import { AppError, bacaBody, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { boleh, muatHak, wajibHak } from "../../shared/akses/hak.js";
import { skemaUang } from "../../shared/uang.js";
import { KODE_TIPE_AKUN, TIPE_AKUN } from "./tipe-akun.js";
import { ambilAkun, daftarAkun, hapusAkun, simpanAkun } from "./akun.service.js";

export const akunRouter = Router();
akunRouter.use(wajibMasuk);

const skema = z.object({
  kode: z
    .string({ error: "Kode perkiraan wajib diisi." })
    .trim()
    .regex(/^[0-9A-Za-z][0-9A-Za-z.-]{0,19}$/, "Kode perkiraan hanya boleh berisi huruf, angka, titik, atau strip, paling panjang 20."),
  nama: z.string({ error: "Nama akun wajib diisi." }).trim().min(1, "Nama akun wajib diisi.").max(100, "Nama akun paling panjang 100 karakter."),
  tipe: z.enum(KODE_TIPE_AKUN, { error: "Tipe akun tidak dikenal." }),
  induk_id: z.uuid({ error: "Akun induk tidak dikenal." }).nullable().default(null),
  catatan: z.string().trim().max(500, "Catatan paling panjang 500 karakter.").default(""),
  nonaktif: z.boolean().default(false),
  saldo_awal: skemaUang({ negatif: true, label: "Saldo awal" }).default("0"),
  // Hanya untuk akun Kas & Bank; tipe lain selalu disimpan kosong.
  bank_nama: z.string().trim().max(50, "Nama bank paling panjang 50 karakter.").default(""),
  nomor_rekening_akhir: z
    .string()
    .trim()
    .regex(/^([0-9]{4})?$/, "Nomor rekening diisi 4 angka terakhir saja.")
    .default(""),
});

// Daftar akun dibutuhkan juga oleh formulir transaksi dan laporan (pilih akun),
// jadi cukup hak Lihat di salah satu menu yang memakainya.
const MENU_PAKAI_AKUN = [
  "akun_perkiraan",
  "jurnal_umum",
  "pencatatan_beban",
  "histori_akun",
  "laporan_keuangan",
  "penerimaan",
  "pembayaran",
  "transfer_bank",
  "histori_bank",
];
async function bolehLihatDaftar(req, _res, next) {
  req.hak ??= await muatHak(req.pengguna);
  if (MENU_PAKAI_AKUN.some((m) => boleh(req.hak, m, "lihat"))) return next();
  next(new AppError(403, "TANPA_HAK", "Anda belum diberi hak Lihat di menu Akun Perkiraan. Minta Administrator menambahkannya di Pengaturan, menu Akses Grup."));
}

akunRouter.get("/tipe", (_req, res) => kirim(res, TIPE_AKUN.map(({ kode, nama, normal }) => ({ kode, nama, normal }))));
// Pengguna yang hanya punya hak Histori Bank cukup melihat akun Kas & Bank (beserta saldonya),
// bukan saldo semua akun.
const hanyaHistoriBank = (hak) => !MENU_PAKAI_AKUN.some((m) => m !== "histori_bank" && boleh(hak, m, "lihat"));

akunRouter.get("/", bolehLihatDaftar, async (req, res) =>
  kirim(
    res,
    await daftarAkun({
      tipe: hanyaHistoriBank(req.hak) ? "kas_bank" : req.query.tipe || undefined,
      aktif: req.query.aktif === "1",
      cari: String(req.query.cari ?? ""),
    }),
  ),
);
akunRouter.get("/:id", wajibHak("akun_perkiraan", "lihat"), async (req, res) => kirim(res, await ambilAkun(req.params.id)));
akunRouter.post("/", wajibHak("akun_perkiraan", "buat"), async (req, res) => kirim(res, await simpanAkun(req, null, bacaBody(skema, req.body)), 201));
akunRouter.put("/:id", wajibHak("akun_perkiraan", "ubah"), async (req, res) => kirim(res, await simpanAkun(req, req.params.id, bacaBody(skema, req.body))));
akunRouter.delete("/:id", wajibHak("akun_perkiraan", "hapus"), async (req, res) => kirim(res, await hapusAkun(req, req.params.id)));
