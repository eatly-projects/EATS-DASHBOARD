// Perusahaan › Persetujuan: transaksi yang menunggu disetujui atau ditolak.
import { Router } from "express";
import { z } from "zod";
import { bacaBody, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { wajibHak } from "../../shared/akses/hak.js";
import { ambilPersetujuan, daftarPersetujuan, jumlahMenungguSaya, putuskan } from "./keputusan.service.js";

export const persetujuanRouter = Router();
persetujuanRouter.use(wajibMasuk);

const skemaTolak = z.object({
  alasan: z.string({ error: "Tulis alasan penolakan." }).trim().min(1, "Tulis alasan penolakan.").max(300, "Alasan paling panjang 300 karakter."),
});

// Lencana di sidebar: berapa transaksi yang menunggu keputusan saya.
persetujuanRouter.get("/jumlah", async (req, res) => kirim(res, await jumlahMenungguSaya(req.pengguna.id)));
persetujuanRouter.get("/", wajibHak("persetujuan", "lihat"), async (req, res) =>
  kirim(res, await daftarPersetujuan(req.pengguna.id, { status: req.query.status || "diajukan" })),
);
persetujuanRouter.get("/:id", wajibHak("persetujuan", "lihat"), async (req, res) => kirim(res, await ambilPersetujuan(req.pengguna.id, req.params.id)));
// Memutuskan cukup sudah masuk; yang diperiksa adalah daftar penyetuju tipe transaksinya.
persetujuanRouter.post("/:id/setujui", async (req, res) => kirim(res, await putuskan(req, req.params.id, "setujui")));
persetujuanRouter.post("/:id/tolak", async (req, res) => kirim(res, await putuskan(req, req.params.id, "tolak", bacaBody(skemaTolak, req.body).alasan)));
