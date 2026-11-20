// Laporan › Laporan Keuangan (dan Buku Besar › Histori Akun): Laba/Rugi, Neraca, Neraca
// Percobaan, Rincian Buku Besar, Keseluruhan Jurnal, beserta unduhan Excel.
import { Router } from "express";
import { z } from "zod";
import { AppError, bacaBody, galat, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { boleh, muatHak, wajibHak } from "../../shared/akses/hak.js";
import { skemaTanggal } from "../../shared/tanggal.js";
import { bukuBesar, infoPerusahaan, labaRugi, neraca, neracaPercobaan, semuaJurnal } from "./laporan-keuangan.service.js";
import { buatExcel } from "./ekspor-excel.js";

export const laporanKeuanganRouter = Router();
laporanKeuanganRouter.use(wajibMasuk);

const hakLaporan = wajibHak("laporan_keuangan", "lihat");
// Rincian Buku Besar juga dipakai menu Histori Akun.
async function hakBukuBesar(req, _res, next) {
  req.hak ??= await muatHak(req.pengguna);
  if (boleh(req.hak, "laporan_keuangan", "lihat") || boleh(req.hak, "histori_akun", "lihat")) return next();
  next(new AppError(403, "TANPA_HAK", "Anda belum diberi hak Lihat di menu Histori Akun atau Laporan Keuangan."));
}

const rentang = z.object({ dari: skemaTanggal("Tanggal awal"), sampai: skemaTanggal("Tanggal akhir") });

const LAPORAN = {
  "laba-rugi": {
    hak: hakLaporan,
    skema: rentang.extend({ per_departemen: z.enum(["0", "1"]).default("0") }),
    hitung: (q) => labaRugi({ dari: q.dari, sampai: q.sampai, perDepartemen: q.per_departemen === "1" }),
  },
  neraca: { hak: hakLaporan, skema: z.object({ per: skemaTanggal("Tanggal neraca") }), hitung: (q) => neraca({ per: q.per }) },
  "neraca-percobaan": { hak: hakLaporan, skema: rentang, hitung: (q) => neracaPercobaan(q) },
  "buku-besar": {
    hak: hakBukuBesar,
    skema: rentang.extend({ akun_id: z.uuid({ error: "Akun tidak dikenal." }).optional() }),
    hitung: (q) => bukuBesar({ dari: q.dari, sampai: q.sampai, akunId: q.akun_id }),
  },
  jurnal: { hak: hakLaporan, skema: rentang, hitung: (q) => semuaJurnal(q) },
};

const laporan = (jenis) => {
  const l = LAPORAN[jenis];
  if (!l) throw galat.tidakAda("Laporan tidak dikenal.");
  return l;
};

const periksaHak = (req, res, next) => laporan(req.params.jenis).hak(req, res, next);

laporanKeuanganRouter.get("/:jenis/excel", periksaHak, async (req, res) => {
  const l = laporan(req.params.jenis);
  const data = await l.hitung(bacaBody(l.skema, req.query));
  const { nama } = await infoPerusahaan();
  const hasil = await buatExcel(req.params.jenis, data, nama);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const namaAscii = hasil.nama.replace(/[^\x20-\x7E]/g, "-");
  res.setHeader("Content-Disposition", `attachment; filename="${namaAscii}"; filename*=UTF-8''${encodeURIComponent(hasil.nama)}`);
  res.send(hasil.berkas);
});

laporanKeuanganRouter.get("/:jenis", periksaHak, async (req, res) => {
  const l = laporan(req.params.jenis);
  const data = await l.hitung(bacaBody(l.skema, req.query));
  const { nama } = await infoPerusahaan();
  kirim(res, { ...data, perusahaan: nama });
});
