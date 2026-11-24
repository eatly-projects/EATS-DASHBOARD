// Rute Jurnal Umum (/jurnal-umum), Pencatatan Beban (/pencatatan-beban), dan Kas & Bank
// (/penerimaan, /pembayaran, /transfer-bank). Semuanya memakai modul jurnal bersama; hak
// akses mengikuti menu masing-masing.
import { Router } from "express";
import { z } from "zod";
import { bacaBody, kirim } from "../../shared/http.js";
import { wajibMasuk } from "../../shared/middleware/auth.js";
import { wajibHak } from "../../shared/akses/hak.js";
import { skemaUang } from "../../shared/uang.js";
import { skemaTanggal } from "../../shared/tanggal.js";
import { ambilJurnal, daftarJurnal, hapusJurnal, simpanJurnal } from "./jurnal.service.js";

const kosongJadiNol = (v) => (v === "" || v === null || v === undefined ? "0" : v);
const uangBoleh0 = (label) => z.preprocess(kosongJadiNol, skemaUang({ label }));
const idOpsional = (pesan) => z.uuid({ error: pesan }).nullable().default(null);

const umum = {
  tanggal: skemaTanggal("Tanggal"),
  keterangan: z.string().trim().max(500, "Keterangan paling panjang 500 karakter.").default(""),
  penomoran_id: idOpsional("Penomoran tidak dikenal.").optional(),
};

// Rincian bernilai (Pencatatan Beban, Penerimaan, Pembayaran): akun, nilai, departemen, catatan.
const rincianNilai = (labelAkun, labelNilai, pesanKosong) =>
  z
    .array(
      z.object({
        akun_id: z.uuid({ error: labelAkun }),
        nilai: skemaUang({ label: labelNilai }),
        departemen_id: idOpsional("Departemen tidak dikenal."),
        catatan: z.string().trim().max(300, "Catatan baris paling panjang 300 karakter.").default(""),
      }),
      { error: pesanKosong },
    )
    .min(1, pesanKosong)
    .max(200, "Rincian paling banyak 200 baris.");

const kasBank = z.object({
  ...umum,
  akun_lawan_id: z.uuid({ error: "Pilih rekening." }),
  baris: rincianNilai("Setiap baris harus punya akun.", "Nilai", "Isi paling sedikit satu rincian."),
});

const SKEMA = {
  jurnal_umum: z.object({
    ...umum,
    baris: z
      .array(
        z.object({
          akun_id: z.uuid({ error: "Setiap baris harus punya akun." }),
          debit: uangBoleh0("Debit"),
          kredit: uangBoleh0("Kredit"),
          departemen_id: idOpsional("Departemen tidak dikenal."),
          catatan: z.string().trim().max(300, "Catatan baris paling panjang 300 karakter.").default(""),
        }),
        { error: "Rincian jurnal wajib diisi." },
      )
      .min(2, "Jurnal Umum butuh paling sedikit dua baris.")
      .max(200, "Rincian paling banyak 200 baris."),
  }),
  pencatatan_beban: z.object({
    ...umum,
    akun_lawan_id: z.uuid({ error: "Pilih akun Hutang Beban." }),
    jatuh_tempo: skemaTanggal("Jatuh tempo").nullable().default(null),
    baris: z
      .array(
        z.object({
          akun_id: z.uuid({ error: "Setiap baris harus punya akun beban." }),
          nilai: skemaUang({ label: "Nilai beban" }),
          departemen_id: idOpsional("Departemen tidak dikenal."),
          catatan: z.string().trim().max(300, "Catatan baris paling panjang 300 karakter.").default(""),
        }),
        { error: "Rincian beban wajib diisi." },
      )
      .min(1, "Isi paling sedikit satu rincian beban.")
      .max(200, "Rincian paling banyak 200 baris."),
  }),
  penerimaan: kasBank,
  pembayaran: kasBank,
  transfer_bank: z.object({
    ...umum,
    akun_lawan_id: z.uuid({ error: "Pilih rekening asal." }),
    akun_tujuan_id: z.uuid({ error: "Pilih rekening tujuan." }),
    nilai: skemaUang({ label: "Nilai transfer" }),
  }),
};

const skemaDaftar = z.object({
  dari: skemaTanggal("Tanggal awal").optional(),
  sampai: skemaTanggal("Tanggal akhir").optional(),
  status: z.enum(["disetujui", "diajukan", "ditolak"]).optional(),
  cari: z.string().trim().max(100).optional(),
  halaman: z.coerce.number().int().min(1).default(1),
});

function buatRouter(tipe) {
  const r = Router();
  r.use(wajibMasuk);
  r.get("/", wajibHak(tipe, "lihat"), async (req, res) => kirim(res, await daftarJurnal(tipe, bacaBody(skemaDaftar, req.query))));
  r.get("/:id", wajibHak(tipe, "lihat"), async (req, res) => kirim(res, await ambilJurnal(tipe, req.params.id)));
  r.post("/", wajibHak(tipe, "buat"), async (req, res) => kirim(res, await simpanJurnal(req, tipe, null, bacaBody(SKEMA[tipe], req.body)), 201));
  r.put("/:id", wajibHak(tipe, "ubah"), async (req, res) => kirim(res, await simpanJurnal(req, tipe, req.params.id, bacaBody(SKEMA[tipe], req.body))));
  r.delete("/:id", wajibHak(tipe, "hapus"), async (req, res) => kirim(res, await hapusJurnal(req, tipe, req.params.id)));
  return r;
}

export const jurnalUmumRouter = buatRouter("jurnal_umum");
export const pencatatanBebanRouter = buatRouter("pencatatan_beban");
export const penerimaanRouter = buatRouter("penerimaan");
export const pembayaranRouter = buatRouter("pembayaran");
export const transferBankRouter = buatRouter("transfer_bank");
