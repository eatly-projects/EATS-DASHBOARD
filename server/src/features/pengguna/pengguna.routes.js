import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { kueri } from "../../shared/db/pool.js";
import { bacaBody, galat, kirim } from "../../shared/http.js";
import { hanyaAdmin, wajibMasuk } from "../../shared/middleware/auth.js";

export const penggunaRouter = Router();
penggunaRouter.use(wajibMasuk, hanyaAdmin);

const KOLOM = "id, email, nama, peran, aktif, login_terakhir_at, dibuat_at";
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const kataSandi = z.string().min(8, "Kata sandi minimal 8 karakter.").max(72, "Kata sandi maksimal 72 karakter.");
const peran = z.enum(["admin", "staf"], { error: "Peran harus admin atau staf." });

const skemaBaru = z.object({
  email: z.string().trim().toLowerCase().regex(POLA_EMAIL, "Format email tidak sah."),
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(100, "Nama terlalu panjang."),
  peran,
  kata_sandi: kataSandi,
});

const skemaUbah = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(100).optional(),
  peran: peran.optional(),
  aktif: z.boolean().optional(),
  kata_sandi: kataSandi.optional(),
});

penggunaRouter.get("/", async (_req, res) => {
  const { rows } = await kueri(`select ${KOLOM} from pengguna order by aktif desc, nama`);
  kirim(res, rows);
});

penggunaRouter.post("/", async (req, res) => {
  const b = bacaBody(skemaBaru, req.body);
  const hash = await bcrypt.hash(b.kata_sandi, 10);
  try {
    const { rows } = await kueri(
      `insert into pengguna (email, nama, peran, kata_sandi_hash) values ($1, $2, $3, $4) returning ${KOLOM}`,
      [b.email, b.nama, b.peran, hash],
    );
    kirim(res, rows[0], 201);
  } catch (e) {
    if (e.code === "23505") throw galat.bentrok("Email itu sudah dipakai akun lain.");
    throw e;
  }
});

penggunaRouter.patch("/:id", async (req, res) => {
  const b = bacaBody(skemaUbah, req.body);
  const diriSendiri = req.params.id === req.pengguna.id;
  if (diriSendiri && b.aktif === false) throw galat.permintaan("Anda tidak bisa menonaktifkan akun Anda sendiri.");
  if (diriSendiri && b.peran && b.peran !== "admin") throw galat.permintaan("Anda tidak bisa menurunkan peran Anda sendiri.");

  const set = [];
  const nilai = [];
  const tambah = (kolom, v) => { nilai.push(v); set.push(`${kolom} = $${nilai.length}`); };
  if (b.nama !== undefined) tambah("nama", b.nama);
  if (b.peran !== undefined) tambah("peran", b.peran);
  if (b.aktif !== undefined) tambah("aktif", b.aktif);
  if (b.kata_sandi !== undefined) tambah("kata_sandi_hash", await bcrypt.hash(b.kata_sandi, 10));
  if (!set.length) throw galat.permintaan("Tidak ada yang diubah.");
  nilai.push(req.params.id);
  const { rows } = await kueri(
    `update pengguna set ${set.join(", ")}, diubah_at = now() where id = $${nilai.length}::uuid returning ${KOLOM}`,
    nilai,
  ).catch((e) => {
    if (e.code === "22P02") throw galat.tidakAda("Pengguna tidak ditemukan.");
    throw e;
  });
  if (!rows[0]) throw galat.tidakAda("Pengguna tidak ditemukan.");
  kirim(res, rows[0]);
});
