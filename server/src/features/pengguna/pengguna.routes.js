import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { dalamTransaksi, kueri } from "../../shared/db/pool.js";
import { bacaBody, galat, kirim } from "../../shared/http.js";
import { hanyaAdmin, wajibMasuk } from "../../shared/middleware/auth.js";
import { catatLog } from "../../shared/log/log.js";
import { pastikanId } from "../akses-grup/akses-grup.service.js";

export const penggunaRouter = Router();
penggunaRouter.use(wajibMasuk, hanyaAdmin);

const PILIH = `select p.id, p.email, p.nama, p.peran, p.aktif, p.login_terakhir_at, p.dibuat_at,
                      p.akses_grup_id, g.nama as akses_grup_nama
                 from pengguna p left join akses_grup g on g.id = p.akses_grup_id`;
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAMA_LEVEL = { admin: "Administrator", staf: "Operator" };

const kataSandi = z.string().min(8, "Kata sandi minimal 8 karakter.").max(72, "Kata sandi maksimal 72 karakter.");
const peran = z.enum(["admin", "staf"], { error: "Level harus Administrator atau Operator." });
const aksesGrup = z.uuid({ error: "Akses grup tidak ditemukan." }).nullable().optional();

const skemaBaru = z.object({
  email: z.string().trim().toLowerCase().regex(POLA_EMAIL, "Format email tidak sah."),
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(100, "Nama terlalu panjang."),
  peran,
  kata_sandi: kataSandi,
  akses_grup_id: aksesGrup,
});

const skemaUbah = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(100).optional(),
  peran: peran.optional(),
  aktif: z.boolean().optional(),
  kata_sandi: kataSandi.optional(),
  akses_grup_id: aksesGrup,
});

const potret = (p) => ({
  Nama: p.nama,
  Email: p.email,
  Level: NAMA_LEVEL[p.peran] ?? p.peran,
  "Akses grup": p.akses_grup_nama ?? "—",
  Status: p.aktif ? "Aktif" : "Nonaktif",
});

async function ambil(db, id) {
  const { rows } = await db.query(`${PILIH} where p.id = $1`, [id]);
  if (!rows[0]) throw galat.tidakAda("Pengguna tidak ditemukan.");
  return rows[0];
}

/** Administrator tidak memakai akses grup; Operator boleh tanpa grup (artinya belum punya akses). */
async function grupUntuk(db, peranAkhir, aksesGrupId) {
  if (peranAkhir === "admin" || !aksesGrupId) return null;
  const { rowCount } = await db.query("select 1 from akses_grup where id = $1", [aksesGrupId]);
  if (!rowCount) throw galat.permintaan("Akses grup tidak ditemukan.");
  return aksesGrupId;
}

penggunaRouter.get("/", async (_req, res) => {
  const { rows } = await kueri(`${PILIH} order by p.aktif desc, p.nama`);
  kirim(res, rows);
});

penggunaRouter.post("/", async (req, res) => {
  const b = bacaBody(skemaBaru, req.body);
  const hash = await bcrypt.hash(b.kata_sandi, 10);
  const baru = await dalamTransaksi(async (k) => {
    const grup = await grupUntuk(k, b.peran, b.akses_grup_id);
    let id;
    try {
      const { rows } = await k.query(
        "insert into pengguna (email, nama, peran, kata_sandi_hash, akses_grup_id) values ($1, $2, $3, $4, $5) returning id",
        [b.email, b.nama, b.peran, hash, grup],
      );
      id = rows[0].id;
    } catch (e) {
      if (e.code === "23505") throw galat.bentrok("Email itu sudah dipakai akun lain.");
      throw e;
    }
    const p = await ambil(k, id);
    await catatLog(k, req, { tindakan: "buat", menu: "pengguna", referensi: p.nama, sesudah: { ...potret(p), "Kata sandi": "Dibuat" } });
    return p;
  });
  kirim(res, baru, 201);
});

penggunaRouter.patch("/:id", async (req, res) => {
  const b = bacaBody(skemaUbah, req.body);
  pastikanId(req.params.id, "Pengguna tidak ditemukan.");
  const diriSendiri = req.params.id === req.pengguna.id;
  if (diriSendiri && b.aktif === false) throw galat.permintaan("Anda tidak bisa menonaktifkan akun Anda sendiri.");
  if (diriSendiri && b.peran && b.peran !== "admin") throw galat.permintaan("Anda tidak bisa menurunkan level Anda sendiri.");
  const hash = b.kata_sandi !== undefined ? await bcrypt.hash(b.kata_sandi, 10) : undefined;

  const hasil = await dalamTransaksi(async (k) => {
    const sebelum = await ambil(k, req.params.id);
    const peranAkhir = b.peran ?? sebelum.peran;
    const set = [];
    const nilai = [];
    const tambah = (kolom, v) => {
      nilai.push(v);
      set.push(`${kolom} = $${nilai.length}`);
    };
    if (b.nama !== undefined) tambah("nama", b.nama);
    if (b.peran !== undefined) tambah("peran", b.peran);
    if (b.aktif !== undefined) tambah("aktif", b.aktif);
    if (hash !== undefined) tambah("kata_sandi_hash", hash);
    if (peranAkhir === "admin" || b.akses_grup_id !== undefined) {
      // null = sengaja dikosongkan (akses dicabut); undefined = tidak dikirim, pakai yang lama.
      tambah("akses_grup_id", await grupUntuk(k, peranAkhir, b.akses_grup_id !== undefined ? b.akses_grup_id : sebelum.akses_grup_id));
    }
    if (!set.length) throw galat.permintaan("Tidak ada yang diubah.");
    nilai.push(req.params.id);
    await k.query(`update pengguna set ${set.join(", ")}, diubah_at = now() where id = $${nilai.length}`, nilai);

    const sesudah = await ambil(k, req.params.id);
    const potretSesudah = potret(sesudah);
    if (hash !== undefined) potretSesudah["Kata sandi"] = "Diganti";
    await catatLog(k, req, { tindakan: "ubah", menu: "pengguna", referensi: sesudah.nama, sebelum: potret(sebelum), sesudah: potretSesudah });
    return sesudah;
  });
  kirim(res, hasil);
});
