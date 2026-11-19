import { Router } from "express";
import { z } from "zod";
import { dalamTransaksi, kueri } from "../../shared/db/pool.js";
import { bacaBody, kirim } from "../../shared/http.js";
import { hanyaAdmin, wajibMasuk } from "../../shared/middleware/auth.js";
import { catatLog } from "../../shared/log/log.js";
import { bulanTahun, tanggalPanjang } from "../../shared/format.js";

export const preferensiRouter = Router();
preferensiRouter.use(wajibMasuk);

const PILIH = `select nama, alamat, telepon, email, npwp,
                      to_char(mulai_periode, 'YYYY-MM-DD') as mulai_periode,
                      to_char(kunci_sampai, 'YYYY-MM-DD') as kunci_sampai
                 from perusahaan`;

const POLA_TANGGAL = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const tanggalSah = (v) => POLA_TANGGAL.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

const skema = z.object({
  nama: z.string({ error: "Nama perusahaan wajib diisi." }).trim().min(1, "Nama perusahaan wajib diisi.").max(150, "Nama perusahaan terlalu panjang."),
  alamat: z.string().trim().max(500, "Alamat terlalu panjang.").default(""),
  telepon: z.string().trim().max(40, "Nomor telepon terlalu panjang.").default(""),
  email: z
    .string()
    .trim()
    .max(150)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Format email tidak sah.")
    .default(""),
  npwp: z
    .string()
    .trim()
    .refine((v) => /^([0-9]{15,16})?$/.test(v), "NPWP harus 15 atau 16 angka, tanpa titik dan strip.")
    .default(""),
  mulai_periode: z
    .string({ error: "Periode akuntansi dimulai wajib diisi." })
    .refine((v) => tanggalSah(v) && v.endsWith("-01"), "Periode akuntansi harus dimulai pada tanggal 1."),
  kunci_sampai: z
    .string()
    .refine(tanggalSah, "Tanggal kunci tidak sah.")
    .nullable()
    .default(null),
});

const potret = (p) => ({
  "Nama perusahaan": p.nama,
  Alamat: p.alamat || "—",
  Telepon: p.telepon || "—",
  Email: p.email || "—",
  NPWP: p.npwp || "—",
  "Periode akuntansi dimulai": bulanTahun(p.mulai_periode),
  "Transaksi dikunci sampai": p.kunci_sampai ? tanggalPanjang(p.kunci_sampai) : "Tidak dikunci",
});

// Nama perusahaan tampil di bilah atas untuk semua pengguna.
preferensiRouter.get("/", async (_req, res) => {
  const { rows } = await kueri(PILIH);
  kirim(res, rows[0]);
});

preferensiRouter.put("/", hanyaAdmin, async (req, res) => {
  const b = bacaBody(skema, req.body);
  const hasil = await dalamTransaksi(async (k) => {
    const { rows: lama } = await k.query(PILIH);
    await k.query(
      `update perusahaan set nama = $1, alamat = $2, telepon = $3, email = $4, npwp = $5, mulai_periode = $6, kunci_sampai = $7,
              diubah_at = now(), diubah_oleh = $8`,
      [b.nama, b.alamat, b.telepon, b.email, b.npwp, b.mulai_periode, b.kunci_sampai, req.pengguna.id],
    );
    const { rows: baru } = await k.query(PILIH);
    await catatLog(k, req, { tindakan: "ubah", menu: "preferensi", referensi: "Preferensi", sebelum: potret(lama[0]), sesudah: potret(baru[0]) });
    return baru[0];
  });
  kirim(res, hasil);
});
