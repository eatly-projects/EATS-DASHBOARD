// Merakit aplikasi Express. Tidak memanggil listen(): dipakai server.js (lokal)
// dan api/index.js (Vercel).
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { kirim } from "./shared/http.js";
import { penanganGalat, tidakDitemukan } from "./shared/middleware/errorHandler.js";
import { wajibMasuk } from "./shared/middleware/auth.js";
import { authRouter } from "./features/auth/auth.routes.js";
import { penggunaRouter } from "./features/pengguna/pengguna.routes.js";
import { ambilReferensi } from "./features/referensi/referensi.service.js";
import { unggahanRouter } from "./features/unggahan/unggahan.routes.js";
import { laporanRouter } from "./features/laporan/laporan.routes.js";
import { navigasiRouter } from "./features/navigasi/navigasi.routes.js";
import { aksesGrupRouter } from "./features/akses-grup/akses-grup.routes.js";
import { penomoranRouter } from "./features/penomoran/penomoran.routes.js";
import { preferensiRouter } from "./features/preferensi/preferensi.routes.js";
import { logAktivitasRouter } from "./features/log-aktivitas/log-aktivitas.routes.js";
import { departemenRouter } from "./features/departemen/departemen.routes.js";
import { akunRouter } from "./features/akun/akun.routes.js";
import { jurnalUmumRouter, pembayaranRouter, pencatatanBebanRouter, penerimaanRouter, transferBankRouter } from "./features/jurnal/jurnal.routes.js";
import { penyetujuRouter } from "./features/persetujuan/penyetuju.routes.js";
import { persetujuanRouter } from "./features/persetujuan/persetujuan.routes.js";
import { laporanKeuanganRouter } from "./features/laporan-keuangan/laporan-keuangan.routes.js";
import { umurPiutangRouter } from "./features/umur-piutang/umur-piutang.routes.js";

export function buatAplikasi() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet({ contentSecurityPolicy: false }));
  // Di production browser memanggil /api lewat rewrite Vercel (satu domain), jadi
  // CORS hanya lapis kedua. Di lokal lewat proxy Vite.
  app.use(
    cors({
      origin: (origin, cb) => (!origin || env.clientOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS ditolak"))),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan("dev"));

  const batasApi = rateLimit({
    windowMs: 60 * 1000,
    limit: env.isProd ? 300 : 3000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ ok: false, error: { code: "TERLALU_SERING", message: "Terlalu banyak permintaan. Tunggu sebentar." } }),
  });

  const api = express.Router();
  api.get("/sehat", (_req, res) => kirim(res, { status: "baik", waktu: new Date().toISOString() }));
  api.use("/auth", authRouter);
  api.use("/pengguna", penggunaRouter);
  api.get("/referensi", wajibMasuk, async (_req, res) => kirim(res, await ambilReferensi()));
  api.use("/unggahan", unggahanRouter);
  api.use("/laporan", laporanRouter);
  api.use("/navigasi", navigasiRouter);
  api.use("/akses-grup", aksesGrupRouter);
  api.use("/penomoran", penomoranRouter);
  api.use("/preferensi", preferensiRouter);
  api.use("/log-aktivitas", logAktivitasRouter);
  api.use("/departemen", departemenRouter);
  api.use("/akun", akunRouter);
  api.use("/jurnal-umum", jurnalUmumRouter);
  api.use("/pencatatan-beban", pencatatanBebanRouter);
  api.use("/penerimaan", penerimaanRouter);
  api.use("/pembayaran", pembayaranRouter);
  api.use("/transfer-bank", transferBankRouter);
  api.use("/penyetuju-transaksi", penyetujuRouter);
  api.use("/persetujuan", persetujuanRouter);
  api.use("/laporan-keuangan", laporanKeuanganRouter);
  api.use("/umur-piutang", umurPiutangRouter);

  app.use("/api", batasApi, api);
  app.get("/", (_req, res) => kirim(res, { nama: "EATS Dashboard API", dokumentasi: "docs/PLANNING.md §6" }));
  app.use(tidakDitemukan);
  app.use(penanganGalat);
  return app;
}
