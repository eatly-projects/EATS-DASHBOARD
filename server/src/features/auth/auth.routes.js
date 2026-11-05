import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { kueri } from "../../shared/db/pool.js";
import { AppError, bacaBody, kirim } from "../../shared/http.js";
import { hapusSesi, pasangSesi, wajibMasuk } from "../../shared/middleware/auth.js";
import { env } from "../../config/env.js";

export const authRouter = Router();

const batasMasuk = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 10 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ ok: false, error: { code: "TERLALU_SERING", message: "Terlalu banyak percobaan masuk. Tunggu 15 menit lalu coba lagi." } }),
});

const skemaMasuk = z.object({
  email: z.string({ error: "Email wajib diisi." }).trim().min(3, "Email wajib diisi."),
  kata_sandi: z.string({ error: "Kata sandi wajib diisi." }).min(1, "Kata sandi wajib diisi."),
});

// Hash palsu untuk email yang tidak terdaftar, supaya waktu jawabnya sama dan
// tidak bisa dipakai menebak email mana yang terdaftar.
const HASH_PALSU = bcrypt.hashSync("tidak-ada-akun-ini", 10);

authRouter.post("/masuk", batasMasuk, async (req, res) => {
  const { email, kata_sandi } = bacaBody(skemaMasuk, req.body);
  const { rows } = await kueri(
    "select id, email, nama, peran, aktif, kata_sandi_hash from pengguna where lower(email) = lower($1)",
    [email],
  );
  const akun = rows[0];
  const cocok = await bcrypt.compare(kata_sandi, akun?.kata_sandi_hash ?? HASH_PALSU);
  if (!akun || !cocok) throw new AppError(401, "KREDENSIAL_SALAH", "Email atau kata sandi salah.");
  if (!akun.aktif) throw new AppError(403, "AKUN_NONAKTIF", "Akun Anda sudah dinonaktifkan. Hubungi admin.");
  await kueri("update pengguna set login_terakhir_at = now() where id = $1", [akun.id]);
  pasangSesi(res, akun);
  const { kata_sandi_hash: _abaikan, ...pengguna } = akun;
  kirim(res, { pengguna });
});

authRouter.post("/keluar", (_req, res) => {
  hapusSesi(res);
  kirim(res, {});
});

authRouter.get("/saya", wajibMasuk, (req, res) => kirim(res, { pengguna: req.pengguna }));
