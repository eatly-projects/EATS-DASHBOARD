import { Router } from "express";
import { z } from "zod";
import { bacaBody, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { wajibHak } from "../../shared/akses/hak.js";
import { ambilDepartemen, daftarDepartemen, hapusDepartemen, simpanDepartemen } from "./departemen.service.js";

export const departemenRouter = Router();
departemenRouter.use(wajibMasuk);

const skema = z.object({
  nama: z.string({ error: "Nama departemen wajib diisi." }).trim().min(1, "Nama departemen wajib diisi.").max(60, "Nama departemen paling panjang 60 karakter."),
  keterangan: z.string().trim().max(200, "Keterangan paling panjang 200 karakter.").default(""),
  induk_id: z.uuid({ error: "Departemen induk tidak dikenal." }).nullable().default(null),
  nonaktif: z.boolean().default(false),
});

// Daftar departemen aktif juga dibutuhkan formulir transaksi (pilihan Departemen), jadi
// cukup sudah masuk; daftar lengkap (termasuk nonaktif) butuh hak Lihat Departemen.
const hakLihat = wajibHak("departemen", "lihat");
const bolehDaftar = (req, res, next) => (req.query.aktif === "1" ? next() : hakLihat(req, res, next));
departemenRouter.get("/", bolehDaftar, async (req, res) => kirim(res, await daftarDepartemen({ aktif: req.query.aktif === "1" })));
departemenRouter.get("/:id", wajibHak("departemen", "lihat"), async (req, res) => kirim(res, await ambilDepartemen(req.params.id)));
departemenRouter.post("/", wajibHak("departemen", "buat"), async (req, res) => kirim(res, await simpanDepartemen(req, null, bacaBody(skema, req.body)), 201));
departemenRouter.put("/:id", wajibHak("departemen", "ubah"), async (req, res) => kirim(res, await simpanDepartemen(req, req.params.id, bacaBody(skema, req.body))));
departemenRouter.delete("/:id", wajibHak("departemen", "hapus"), async (req, res) => kirim(res, await hapusDepartemen(req, req.params.id)));
