import { Router } from "express";
import { kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { muatHak, susunNavigasi } from "../../shared/akses/hak.js";

export const navigasiRouter = Router();

// Menu yang boleh dibuka pengguna yang sedang masuk, beserta haknya per menu.
navigasiRouter.get("/", wajibMasuk, async (req, res) => kirim(res, susunNavigasi(await muatHak(req.pengguna))));
