import { Router } from "express";
import { z } from "zod";
import { bacaBody, kirim } from "../../shared/http.js";
import { hanyaAdmin, wajibMasuk } from "../../shared/middleware/auth.js";
import { menuMatriks } from "../../shared/akses/menu.js";
import { ambilGrup, daftarGrup, hapusGrup, simpanGrup } from "./akses-grup.service.js";

export const aksesGrupRouter = Router();
aksesGrupRouter.use(wajibMasuk, hanyaAdmin);

const centang = z.object({
  lihat: z.boolean().optional(),
  buat: z.boolean().optional(),
  ubah: z.boolean().optional(),
  hapus: z.boolean().optional(),
});

const skemaGrup = z.object({
  nama: z.string({ error: "Nama grup wajib diisi." }).trim().min(1, "Nama grup wajib diisi.").max(60, "Nama grup paling panjang 60 karakter."),
  keterangan: z.string().trim().max(200, "Keterangan paling panjang 200 karakter.").default(""),
  anggota: z.array(z.uuid({ error: "Ada anggota yang tidak dikenal." })).max(200, "Anggota paling banyak 200 orang.").default([]),
  hak: z.record(z.string(), centang).default({}),
});

aksesGrupRouter.get("/menu", (_req, res) => kirim(res, menuMatriks()));
aksesGrupRouter.get("/", async (_req, res) => kirim(res, await daftarGrup()));
aksesGrupRouter.get("/:id", async (req, res) => kirim(res, await ambilGrup(req.params.id)));
aksesGrupRouter.post("/", async (req, res) => kirim(res, await simpanGrup(req, null, bacaBody(skemaGrup, req.body)), 201));
aksesGrupRouter.put("/:id", async (req, res) => kirim(res, await simpanGrup(req, req.params.id, bacaBody(skemaGrup, req.body))));
aksesGrupRouter.delete("/:id", async (req, res) => kirim(res, await hapusGrup(req, req.params.id)));
