import { Router } from "express";
import { kueri } from "../../shared/db/pool.js";
import { galat, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { ambilReferensi } from "../referensi/referensi.service.js";
import { gabungPos, hitungUkuran } from "./hitung.js";

export const laporanRouter = Router();
laporanRouter.use(wajibMasuk);

laporanRouter.get("/", async (req, res) => {
  const { rows: daftarTahun } = await kueri(
    "select distinct extract(year from periode)::int as tahun from nilai_laporan order by 1 desc",
  );
  const tahun_tersedia = daftarTahun.map((r) => r.tahun);
  let tahun = req.query.tahun ? Number(req.query.tahun) : tahun_tersedia[0] ?? new Date().getFullYear();
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) throw galat.permintaan("Tahun tidak sah.");

  const ref = await ambilReferensi();
  const [{ rows }, { rows: asalRows }] = await Promise.all([
    kueri(
      `select unit_kode, to_char(periode, 'YYYY-MM') as periode, pos_kode, nilai
         from nilai_laporan
        where periode >= make_date($1, 1, 1) and periode < make_date($1 + 1, 1, 1)`,
      [tahun],
    ),
    kueri(
      `select distinct on (n.unit_kode, n.periode)
              n.unit_kode, to_char(n.periode, 'YYYY-MM') as periode, u.id as unggahan_id, u.nama_berkas,
              u.diputuskan_at as disetujui_at, p.nama as disetujui_oleh_nama
         from nilai_laporan n
         join unggahan u on u.id = n.unggahan_id
         left join pengguna p on p.id = u.diputuskan_oleh
        where n.periode >= make_date($1, 1, 1) and n.periode < make_date($1 + 1, 1, 1)
        order by n.unit_kode, n.periode, u.diputuskan_at desc`,
      [tahun],
    ),
  ]);

  // Susun: pos per unit per bulan.
  const posPer = {};
  for (const r of rows) {
    ((posPer[r.unit_kode] ??= {})[r.periode] ??= {})[r.pos_kode] = r.nilai;
  }
  const periode = [...new Set(rows.map((r) => r.periode))].sort();

  const laporan = {};
  for (const u of ref.unit) {
    laporan[u.kode] = {};
    for (const [p, pos] of Object.entries(posPer[u.kode] ?? {})) {
      laporan[u.kode][p] = { pos, ukuran: hitungUkuran(pos, ref.pos) };
    }
  }
  laporan.GABUNGAN = {};
  for (const p of periode) {
    const unit_ada = ref.unit.filter((u) => posPer[u.kode]?.[p]).map((u) => u.kode);
    const pos = gabungPos(unit_ada.map((k) => posPer[k][p]));
    laporan.GABUNGAN[p] = { pos, ukuran: hitungUkuran(pos, ref.pos), unit_ada };
  }

  const asal = {};
  for (const a of asalRows) {
    asal[`${a.unit_kode}|${a.periode}`] = {
      unggahan_id: a.unggahan_id,
      nama_berkas: a.nama_berkas,
      disetujui_at: a.disetujui_at,
      disetujui_oleh_nama: a.disetujui_oleh_nama,
    };
  }

  kirim(res, {
    tahun,
    tahun_tersedia: tahun_tersedia.length ? tahun_tersedia : [tahun],
    periode,
    unit: ref.unit.map(({ kode, nama, keterangan }) => ({ kode, nama, keterangan })),
    laporan,
    asal,
  });
});
