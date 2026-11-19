import { Router } from "express";
import { z } from "zod";
import { kueri } from "../../shared/db/pool.js";
import { bacaBody, galat, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { wajibHak } from "../../shared/akses/hak.js";
import { cariMenu } from "../../shared/akses/menu.js";

export const logAktivitasRouter = Router();
logAktivitasRouter.use(wajibMasuk, wajibHak("log_aktivitas", "lihat"));

const UKURAN = 50;
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const KOLOM = `id, waktu, tindakan, menu_kode, referensi, to_char(tanggal_transaksi, 'YYYY-MM-DD') as tanggal_transaksi,
               pengguna_id, pengguna_nama, pengguna_email, alamat_ip`;

const namaMenu = (kode) => cariMenu(kode)?.nama ?? kode;

const skemaFilter = z.object({
  menu: z.string().optional(),
  pengguna_id: z.uuid({ error: "Pengguna tidak dikenal." }).optional(),
  tindakan: z.enum(["buat", "ubah", "hapus"], { error: "Tindakan tidak dikenal." }).optional(),
  dari: z.string().regex(POLA_TANGGAL, "Tanggal awal tidak sah.").optional(),
  sampai: z.string().regex(POLA_TANGGAL, "Tanggal akhir tidak sah.").optional(),
  cari: z.string().trim().max(100).optional(),
  halaman: z.coerce.number().int().min(1).default(1),
});

logAktivitasRouter.get("/", async (req, res) => {
  const f = bacaBody(skemaFilter, req.query);
  const syarat = [];
  const nilai = [];
  const tambah = (sql, v) => {
    nilai.push(v);
    syarat.push(sql.replace("?", `$${nilai.length}`));
  };
  if (f.menu) tambah("menu_kode = ?", f.menu);
  if (f.pengguna_id) tambah("pengguna_id = ?", f.pengguna_id);
  if (f.tindakan) tambah("tindakan = ?", f.tindakan);
  // Tanggal dihitung per hari di Jakarta, inklusif di kedua ujung.
  if (f.dari) tambah("waktu >= (?::date)::timestamp at time zone 'Asia/Jakarta'", f.dari);
  if (f.sampai) tambah("waktu < (?::date + 1)::timestamp at time zone 'Asia/Jakarta'", f.sampai);
  if (f.cari) tambah("referensi ilike ?", `%${f.cari.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  const where = syarat.length ? `where ${syarat.join(" and ")}` : "";

  const [{ rows: jumlah }, { rows }] = await Promise.all([
    kueri(`select count(*)::int as n from log_aktivitas ${where}`, nilai),
    kueri(`select ${KOLOM} from log_aktivitas ${where} order by waktu desc, id desc limit ${UKURAN} offset ${(f.halaman - 1) * UKURAN}`, nilai),
  ]);
  kirim(res, {
    baris: rows.map((r) => ({ ...r, menu_nama: namaMenu(r.menu_kode) })),
    jumlah: jumlah[0].n,
    halaman: f.halaman,
    ukuran: UKURAN,
  });
});

logAktivitasRouter.get("/pilihan", async (_req, res) => {
  const [{ rows: menu }, { rows: pengguna }] = await Promise.all([
    kueri("select distinct menu_kode from log_aktivitas"),
    kueri("select distinct on (pengguna_id) pengguna_id as id, pengguna_nama as nama from log_aktivitas where pengguna_id is not null order by pengguna_id, id desc"),
  ]);
  kirim(res, {
    menu: menu.map((m) => ({ kode: m.menu_kode, nama: namaMenu(m.menu_kode) })).sort((a, b) => a.nama.localeCompare(b.nama, "id")),
    pengguna: pengguna.sort((a, b) => a.nama.localeCompare(b.nama, "id")),
  });
});

logAktivitasRouter.get("/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) throw galat.tidakAda("Catatan log tidak ditemukan.");
  const { rows } = await kueri(`select ${KOLOM}, sebelum, sesudah from log_aktivitas where id = $1`, [req.params.id]);
  if (!rows[0]) throw galat.tidakAda("Catatan log tidak ditemukan.");
  kirim(res, { ...rows[0], menu_nama: namaMenu(rows[0].menu_kode) });
});
