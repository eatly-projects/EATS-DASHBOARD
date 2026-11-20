// Pengaturan › Penyetuju Transaksi (khusus Administrator).
import { Router } from "express";
import { z } from "zod";
import { bacaBody, kirim } from "../../shared/http.js";
import { hanyaAdmin, wajibMasuk } from "../../shared/middleware/auth.js";
import { skemaUang } from "../../shared/uang.js";
import { daftarAturan, simpanAturan } from "./persetujuan.service.js";

export const penyetujuRouter = Router();
penyetujuRouter.use(wajibMasuk, hanyaAdmin);

const skema = z.object({
  aktif: z.boolean({ error: "Pilih apakah transaksi ini perlu persetujuan." }),
  nilai_minimal: z.preprocess((v) => (v === "" ? null : v), skemaUang({ label: "Nilai minimal" }).nullable().default(null)),
  penyetuju: z.array(z.uuid({ error: "Ada penyetuju yang tidak dikenal." })).max(50).default([]),
});

penyetujuRouter.get("/", async (_req, res) => kirim(res, await daftarAturan()));
penyetujuRouter.put("/:tipe", async (req, res) => kirim(res, await simpanAturan(req, req.params.tipe, bacaBody(skema, req.body))));
