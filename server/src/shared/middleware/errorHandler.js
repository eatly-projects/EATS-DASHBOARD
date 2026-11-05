import multer from "multer";
import { AppError } from "../http.js";
import { env } from "../../config/env.js";

export function tidakDitemukan(req, res) {
  res.status(404).json({ ok: false, error: { code: "TIDAK_ADA", message: `Alamat ${req.method} ${req.path} tidak dikenal.` } });
}

// eslint-disable-next-line no-unused-vars
export function penanganGalat(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof multer.MulterError) {
    const pesan = err.code === "LIMIT_FILE_SIZE" ? "Ukuran berkas maksimal 4 MB." : `Unggahan ditolak: ${err.message}`;
    return res.status(400).json({ ok: false, error: { code: "UNGGAHAN_DITOLAK", message: pesan } });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ ok: false, error: { code: "JSON_TIDAK_SAH", message: "Isi permintaan bukan JSON yang sah." } });
  }
  if (err?.message?.startsWith("CORS")) {
    return res.status(403).json({ ok: false, error: { code: "CORS", message: "Asal permintaan tidak diizinkan." } });
  }
  console.error(`[galat] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    ok: false,
    error: { code: "GALAT_SERVER", message: env.isProd ? "Terjadi kesalahan di server. Coba lagi sebentar." : err.message },
  });
}
