import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { bacaBody, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import {
  BATAS_UKURAN,
  ambilBerkas,
  ambilLengkap,
  bacaUnggahan,
  batalkanUnggahan,
  dataTersimpanUntuk,
  daftarUnggahan,
  setujuiUnggahan,
  simpanUnggahan,
} from "./unggahan.service.js";

export const unggahanRouter = Router();
unggahanRouter.use(wajibMasuk);

const terima = multer({ storage: multer.memoryStorage(), limits: { fileSize: BATAS_UKURAN, files: 1 } });

unggahanRouter.get("/", async (_req, res) => kirim(res, await daftarUnggahan()));

unggahanRouter.post("/", terima.single("berkas"), async (req, res) => {
  kirim(res, await simpanUnggahan({ berkas: req.file, pengguna: req.pengguna }), 201);
});

unggahanRouter.get("/:id", async (req, res) => {
  const unggahan = await ambilLengkap(req.params.id);
  kirim(res, { unggahan, data_tersimpan: await dataTersimpanUntuk(unggahan.rencana) });
});

unggahanRouter.get("/:id/berkas", async (req, res) => {
  const b = await ambilBerkas(req.params.id);
  res.setHeader("Content-Type", b.mime);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(b.nama_berkas)}`);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(b.isi);
});

unggahanRouter.post("/:id/baca", async (req, res) => kirim(res, await bacaUnggahan(req.params.id)));

const skemaSetujui = z.object({
  nilai: z
    .array(
      z.object({
        unit_kode: z.string().min(1),
        periode: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode harus berbentuk YYYY-MM."),
        pos_kode: z.string().min(1),
        nilai: z.number({ error: "Setiap angka harus berupa angka." }).refine((v) => Math.abs(v) < 1e15, "Angka terlalu besar."),
      }),
    )
    .max(20000, "Terlalu banyak angka dalam satu unggahan."),
});

unggahanRouter.post("/:id/setujui", async (req, res) => {
  const { nilai } = bacaBody(skemaSetujui, req.body);
  const ringkasan = await setujuiUnggahan(req.params.id, nilai, req.pengguna);
  kirim(res, { unggahan: await ambilLengkap(req.params.id), ringkasan });
});

unggahanRouter.post("/:id/batalkan", async (req, res) => kirim(res, await batalkanUnggahan(req.params.id, req.pengguna)));
