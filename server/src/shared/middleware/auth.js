// Sesi login: JWT di cookie httpOnly `eats_sesi`. Setiap permintaan membaca
// ulang pengguna dari database, jadi akun yang dinonaktifkan langsung terkunci
// tanpa menunggu token kedaluwarsa.
//
// Permintaan Lutfi: sekali masuk, tidak perlu masuk lagi sampai menekan Keluar.
// Caranya sesi "bergulir": cookie berlaku 365 hari dan diperpanjang otomatis
// (paling sering sehari sekali) setiap kali dashboard dipakai. Sesi baru
// berakhir kalau pengguna menekan Keluar, akunnya dinonaktifkan, atau dashboard
// tidak dibuka sama sekali selama setahun.
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { kueri } from "../db/pool.js";
import { AppError, galat } from "../http.js";

export const NAMA_COOKIE = "eats_sesi";
const UMUR_HARI = 365;
const PERPANJANG_SETELAH_DETIK = 24 * 3600;

export const opsiCookie = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: env.isProd,
  path: "/",
});

export function pasangSesi(res, pengguna) {
  const token = jwt.sign({ sub: pengguna.id }, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: `${UMUR_HARI}d`,
    issuer: "eats-dashboard",
  });
  res.cookie(NAMA_COOKIE, token, { ...opsiCookie(), maxAge: UMUR_HARI * 24 * 3600 * 1000 });
}

export const hapusSesi = (res) => res.clearCookie(NAMA_COOKIE, opsiCookie());

export async function wajibMasuk(req, res, next) {
  const token = req.cookies?.[NAMA_COOKIE];
  if (!token) return next(galat.belumMasuk());
  let isi;
  try {
    isi = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"], issuer: "eats-dashboard" });
  } catch {
    return next(galat.belumMasuk("Sesi Anda sudah berakhir. Silakan masuk lagi."));
  }
  const { rows } = await kueri("select id, email, nama, peran, aktif from pengguna where id = $1", [isi.sub]);
  const pengguna = rows[0];
  if (!pengguna) return next(galat.belumMasuk());
  if (!pengguna.aktif) return next(new AppError(403, "AKUN_NONAKTIF", "Akun Anda sudah dinonaktifkan. Hubungi admin."));
  req.pengguna = pengguna;
  if (Date.now() / 1000 - (isi.iat ?? 0) > PERPANJANG_SETELAH_DETIK) pasangSesi(res, pengguna);
  next();
}

export function hanyaAdmin(req, _res, next) {
  if (req.pengguna?.peran !== "admin") return next(galat.dilarang("Hanya admin yang boleh mengelola pengguna."));
  next();
}
