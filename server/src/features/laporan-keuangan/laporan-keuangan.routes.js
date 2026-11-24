// Laporan › Laporan Keuangan (dan Buku Besar › Histori Akun, Kas & Bank › Histori Bank):
// Laba/Rugi, Neraca, Neraca Percobaan, Rincian Buku Besar, Keseluruhan Jurnal, Arus Kas,
// beserta unduhan Excel; ditambah ringkasan saldo kas & bank untuk halaman utama.
import { Router } from "express";
import { z } from "zod";
import { AppError, bacaBody, galat, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { boleh, muatHak, wajibHak } from "../../shared/akses/hak.js";
import { skemaTanggal } from "../../shared/tanggal.js";
import {
  arusKas,
  bukuBesar,
  historiBank,
  infoPerusahaan,
  labaRugi,
  neraca,
  neracaPercobaan,
  ringkasanKasBank,
  semuaJurnal,
} from "./laporan-keuangan.service.js";
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

// Histori Bank juga bisa dibuka dari Laporan Keuangan.
async function hakHistoriBank(req, _res, next) {
  req.hak ??= await muatHak(req.pengguna);
  if (boleh(req.hak, "histori_bank", "lihat") || boleh(req.hak, "laporan_keuangan", "lihat")) return next();
  next(new AppError(403, "TANPA_HAK", "Anda belum diberi hak Lihat di menu Histori Bank."));
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
  "histori-bank": {
    hak: hakHistoriBank,
    skema: rentang.extend({ akun_id: z.uuid({ error: "Rekening tidak dikenal." }).optional() }),
    hitung: (q) => historiBank({ dari: q.dari, sampai: q.sampai, akunId: q.akun_id }),
  },
  "arus-kas": {
    hak: hakLaporan,
    skema: rentang.extend({ departemen_id: z.uuid({ error: "Lini bisnis tidak dikenal." }).optional() }),
    hitung: (q) => arusKas({ dari: q.dari, sampai: q.sampai, departemenId: q.departemen_id ?? null }),
  },
  "ringkasan-kas-bank": {
    hak: wajibHak("histori_bank", "lihat"),
    skema: z.object({ per: skemaTanggal("Tanggal") }),
    hitung: (q) => ringkasanKasBank({ per: q.per }),
  },
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
