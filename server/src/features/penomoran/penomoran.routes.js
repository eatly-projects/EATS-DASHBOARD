import { Router } from "express";
import { z } from "zod";
import { bacaBody, kirim } from "../../shared/http.js";
import { hanyaAdmin, wajibMasuk } from "../../shared/middleware/auth.js";
import { TIPE_TRANSAKSI } from "./tipe-transaksi.js";
import { daftarPenomoran, hapusPenomoran, pratinjau, simpanPenomoran } from "./penomoran.service.js";

export const penomoranRouter = Router();
penomoranRouter.use(wajibMasuk, hanyaAdmin);

const bagian = z.object({ jenis: z.string(), nilai: z.string().optional() });
const susunan = {
  format: z.array(bagian, { error: "Susunan nomor wajib diisi." }).max(12, "Susunan nomor paling banyak 12 bagian."),
  digit_counter: z.number({ error: "Jumlah digit nomor urut harus berupa angka." }).int("Jumlah digit nomor urut harus bilangan bulat."),
  reset: z.string({ error: "Pilih kapan nomor urut diulang." }),
};
const skemaPenomoran = z.object({
  nama: z.string({ error: "Nama wajib diisi." }).trim().min(1, "Nama wajib diisi.").max(60, "Nama paling panjang 60 karakter."),
  tipe_transaksi: z.string({ error: "Pilih tipe transaksi." }),
  ...susunan,
  bawaan: z.boolean().default(false),
});

penomoranRouter.get("/tipe", (_req, res) => kirim(res, TIPE_TRANSAKSI));
penomoranRouter.get("/", async (_req, res) => kirim(res, await daftarPenomoran()));
penomoranRouter.post("/pratinjau", (req, res) => kirim(res, pratinjau(bacaBody(z.object(susunan), req.body))));
penomoranRouter.post("/", async (req, res) => kirim(res, await simpanPenomoran(req, null, bacaBody(skemaPenomoran, req.body)), 201));
penomoranRouter.put("/:id", async (req, res) => kirim(res, await simpanPenomoran(req, req.params.id, bacaBody(skemaPenomoran, req.body))));
penomoranRouter.delete("/:id", async (req, res) => kirim(res, await hapusPenomoran(req, req.params.id)));
