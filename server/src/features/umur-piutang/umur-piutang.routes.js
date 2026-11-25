// Penjualan › Umur Piutang (baca-saja). Data diambil langsung dari aplikasi Operasional setiap kali
// dibuka; kalau Operasional tidak bisa dihubungi, yang tampil data terakhir (basi = true).
// Kalau ada cek Operasional yang gagal, angkanya tidak dikirim (spec §5.1).
import { Router } from "express";
import { z } from "zod";
import { bacaBody, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { wajibHak } from "../../shared/akses/hak.js";
import { ambilOperasional } from "../operasional/operasional.klien.js";
import { SEGMEN, susunUmurPiutang } from "./umur-piutang.service.js";

export const umurPiutangRouter = Router();
umurPiutangRouter.use(wajibMasuk);

const skema = z.object({ segmen: z.enum(SEGMEN, { error: "Lini bisnis tidak dikenal." }).optional() });

umurPiutangRouter.get("/", wajibHak("umur_piutang", "lihat"), async (req, res) => {
  const { segmen = null } = bacaBody(skema, req.query);
  // Seluruh baris dibaca dulu: isi yang rusak tidak menimpa cadangan dan tidak menggeser data terakhir.
  const { data, basi, cekGagal } = await ambilOperasional("piutang", { periksa: (d) => susunUmurPiutang(d) });
  if (cekGagal.length) {
    return kirim(res, { diperbarui: data.generated_at, hari_ini: data.hari_ini_jakarta ?? null, basi, cek_gagal: cekGagal, total: null, pelanggan: [] });
  }
  kirim(res, { ...susunUmurPiutang(data, { segmen }), basi, cek_gagal: [] });
});
