import { Router } from "express";
import { z } from "zod";
import { dalamTransaksi, kueri } from "../../shared/db/pool.js";
import { bacaBody, galat, kirim } from "../../shared/http.js";
import { hanyaAdmin, wajibMasuk } from "../../shared/middleware/auth.js";
import { catatLog } from "../../shared/log/log.js";
import { bulanTahun, tanggalPanjang } from "../../shared/format.js";

export const preferensiRouter = Router();
preferensiRouter.use(wajibMasuk);

const PILIH = `select p.nama, p.alamat, p.telepon, p.email, p.npwp,
                      to_char(p.mulai_periode, 'YYYY-MM-DD') as mulai_periode,
                      to_char(p.kunci_sampai, 'YYYY-MM-DD') as kunci_sampai,
                      p.akun_ekuitas_saldo_awal_id, e.kode || ' ' || e.nama as akun_ekuitas_saldo_awal_nama,
                      p.akun_laba_ditahan_id, l.kode || ' ' || l.nama as akun_laba_ditahan_nama,
                      p.akun_rekening_utama_id, r.kode || ' ' || r.nama as akun_rekening_utama_nama
                 from perusahaan p
                 left join akun e on e.id = p.akun_ekuitas_saldo_awal_id
                 left join akun l on l.id = p.akun_laba_ditahan_id
                 left join akun r on r.id = p.akun_rekening_utama_id`;

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
  // Tidak dikirim = tetap seperti sebelumnya.
  akun_ekuitas_saldo_awal_id: z.uuid({ error: "Akun Ekuitas Saldo Awal tidak dikenal." }).optional(),
  akun_laba_ditahan_id: z.uuid({ error: "Akun Laba Ditahan tidak dikenal." }).optional(),
  // Kosong (null) atau tidak dikirim = tetap seperti sebelumnya.
  akun_rekening_utama_id: z.uuid({ error: "Rekening utama tidak dikenal." }).nullable().optional(),
});

async function pastikanAkunModal(k, id, label) {
  if (!id) return;
  const { rows } = await k.query("select tipe, nonaktif, exists (select 1 from akun c where c.induk_id = akun.id) as punya_anak from akun where id = $1", [id]);
  const a = rows[0];
  if (!a) throw galat.permintaan(`${label} tidak ditemukan.`);
  if (a.tipe !== "modal") throw galat.permintaan(`${label} harus akun bertipe Modal.`);
  if (a.punya_anak) throw galat.permintaan(`${label} harus akun detail, bukan akun induk.`);
  if (a.nonaktif) throw galat.permintaan(`${label} tidak boleh akun nonaktif.`);
}

async function pastikanAkunKasBank(k, id) {
  if (!id) return;
  const { rows } = await k.query("select tipe, nonaktif, exists (select 1 from akun c where c.induk_id = akun.id) as punya_anak from akun where id = $1", [id]);
  const a = rows[0];
  if (!a) throw galat.permintaan("Rekening utama tidak ditemukan.");
  if (a.tipe !== "kas_bank") throw galat.permintaan("Rekening utama harus akun bertipe Kas & Bank.");
  if (a.punya_anak) throw galat.permintaan("Rekening utama harus akun detail, bukan akun induk.");
  if (a.nonaktif) throw galat.permintaan("Rekening utama tidak boleh akun nonaktif.");
}

const potret = (p) => ({
  "Nama perusahaan": p.nama,
  Alamat: p.alamat || "—",
  Telepon: p.telepon || "—",
  Email: p.email || "—",
  NPWP: p.npwp || "—",
  "Periode akuntansi dimulai": bulanTahun(p.mulai_periode),
  "Transaksi dikunci sampai": p.kunci_sampai ? tanggalPanjang(p.kunci_sampai) : "Tidak dikunci",
  "Akun Ekuitas Saldo Awal": p.akun_ekuitas_saldo_awal_nama || "—",
  "Akun Laba Ditahan": p.akun_laba_ditahan_nama || "—",
  "Rekening utama": p.akun_rekening_utama_nama || "—",
});

// Nama perusahaan tampil di bilah atas untuk semua pengguna.
preferensiRouter.get("/", async (_req, res) => {
  const { rows } = await kueri(PILIH);
  kirim(res, rows[0]);
});

preferensiRouter.put("/", hanyaAdmin, async (req, res) => {
  const b = bacaBody(skema, req.body);
  const hasil = await dalamTransaksi(async (k) => {
    const { rows: lama } = await k.query(`${PILIH} for update of p`);
    // Saldo awal bertanggal sehari sebelum periode dimulai; kalau periode digeser
    // setelah ada jurnal, tanggal-tanggal itu jadi tidak cocok lagi.
    if (b.mulai_periode !== lama[0].mulai_periode) {
      const { rows: ada } = await k.query("select 1 from jurnal limit 1");
      if (ada[0]) throw galat.bentrok("Awal periode akuntansi tidak bisa diubah karena sudah ada saldo awal atau transaksi.");
    }
    // Kunci yang maju tidak boleh menjebak transaksi yang masih menunggu persetujuan:
    // setelah terkunci, penyetuju tidak bisa menyetujuinya dan pembuat tidak bisa mengubahnya.
    if (b.kunci_sampai && (!lama[0].kunci_sampai || b.kunci_sampai > lama[0].kunci_sampai)) {
      const { rows: tertahan } = await k.query(
        `select coalesce(nomor, keterangan, '') as ref, to_char(tanggal, 'YYYY-MM-DD') as tanggal from jurnal
          where status = 'diajukan' and tanggal <= $1 order by tanggal limit 5`,
        [b.kunci_sampai],
      );
      if (tertahan.length) {
        const daftar = tertahan.map((t) => `${tanggalPanjang(t.tanggal)}${t.ref ? ` (${t.ref})` : ""}`).join("; ");
        throw galat.bentrok(
          `Masih ada transaksi yang menunggu persetujuan sampai tanggal itu: ${daftar}. Setujui atau tolak dulu di menu Perusahaan, Persetujuan, lalu kunci lagi.`,
        );
      }
    }
    const ekuitas = b.akun_ekuitas_saldo_awal_id ?? lama[0].akun_ekuitas_saldo_awal_id;
    const labaDitahan = b.akun_laba_ditahan_id ?? lama[0].akun_laba_ditahan_id;
    await pastikanAkunModal(k, ekuitas, "Akun Ekuitas Saldo Awal");
    await pastikanAkunModal(k, labaDitahan, "Akun Laba Ditahan");
    const rekeningUtama = b.akun_rekening_utama_id ?? lama[0].akun_rekening_utama_id;
    if (rekeningUtama !== lama[0].akun_rekening_utama_id) await pastikanAkunKasBank(k, rekeningUtama);
    if (ekuitas !== lama[0].akun_ekuitas_saldo_awal_id) {
      const { rows: sa } = await k.query("select 1 from jurnal where tipe = 'saldo_awal' limit 1");
      if (sa[0]) throw galat.bentrok("Akun Ekuitas Saldo Awal tidak bisa diganti karena sudah ada saldo awal yang memakainya.");
    }
    await k.query(
      `update perusahaan set nama = $1, alamat = $2, telepon = $3, email = $4, npwp = $5, mulai_periode = $6, kunci_sampai = $7,
              akun_ekuitas_saldo_awal_id = $9, akun_laba_ditahan_id = $10, akun_rekening_utama_id = $11,
              diubah_at = now(), diubah_oleh = $8`,
      [b.nama, b.alamat, b.telepon, b.email, b.npwp, b.mulai_periode, b.kunci_sampai, req.pengguna.id, ekuitas, labaDitahan, rekeningUtama],
    );
    const { rows: baru } = await k.query(PILIH);
    await catatLog(k, req, { tindakan: "ubah", menu: "preferensi", referensi: "Preferensi", sebelum: potret(lama[0]), sesudah: potret(baru[0]) });
    return baru[0];
  });
  kirim(res, hasil);
});
