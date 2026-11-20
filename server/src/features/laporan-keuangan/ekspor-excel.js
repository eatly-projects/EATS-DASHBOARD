// Ekspor laporan keuangan ke Excel (.xlsx). Setiap laporan diubah dulu menjadi tabel
// sederhana (kolom + baris), lalu ditulis dengan judul, nama perusahaan, dan periode.
import ExcelJS from "exceljs";
import { tanggalPanjang } from "../../shared/format.js";

const FORMAT_UANG = '#,##0.00;-#,##0.00;"—"';

const uang = (teks) => (teks === null || teks === undefined || teks === "" ? null : Number(teks));

export const periodeTeks = (data) => (data.per ? `Per ${tanggalPanjang(data.per)}` : `${tanggalPanjang(data.dari)} sampai ${tanggalPanjang(data.sampai)}`);

function tabelLabaRugi(d) {
  const kolom = [{ judul: "Kode", lebar: 12 }, { judul: "Akun", lebar: 40 }, ...d.kolom.map((k) => ({ judul: k.nama, lebar: 20, uang: true }))];
  const baris = [];
  const nilaiKolom = (nilai) => d.kolom.map((k) => uang(nilai[k.kunci]));
  for (const b of d.bagian) {
    if (b.jenis === "ringkasan") {
      baris.push({ sel: ["", b.judul, ...nilaiKolom(b.nilai)], tebal: true });
      continue;
    }
    baris.push({ sel: ["", b.judul], tebal: true });
    for (const r of b.baris) baris.push({ sel: [r.kode, r.nama, ...nilaiKolom(r.nilai)], menjorok: 1 });
    baris.push({ sel: ["", b.judul_total, ...nilaiKolom(b.total)], tebal: true });
  }
  return { kolom, baris };
}

function tabelNeraca(d) {
  const kolom = [{ judul: "Kode", lebar: 12 }, { judul: "Deskripsi", lebar: 44 }, { judul: "Nilai", lebar: 22, uang: true }];
  const baris = [];
  for (const k of d.bagian) {
    baris.push({ sel: ["", k.judul], tebal: true });
    for (const s of k.sub) {
      baris.push({ sel: ["", s.judul], tebal: true, menjorok: 1 });
      for (const r of s.baris) baris.push({ sel: [r.kode, r.nama, uang(r.nilai)], menjorok: 2 });
      baris.push({ sel: ["", s.judul_total, uang(s.total)], tebal: true, menjorok: 1 });
    }
    baris.push({ sel: ["", k.judul_total, uang(k.total)], tebal: true });
  }
  baris.push({ sel: ["", "JUMLAH LIABILITAS DAN EKUITAS", uang(d.jumlah_liabilitas_ekuitas)], tebal: true });
  return { kolom, baris };
}

function tabelNeracaPercobaan(d) {
  const kolom = [
    { judul: "Kode", lebar: 12 },
    { judul: "Nama Akun", lebar: 36 },
    { judul: "Tipe Akun", lebar: 24 },
    { judul: "Saldo Awal", lebar: 20, uang: true },
    { judul: "Debit", lebar: 20, uang: true },
    { judul: "Kredit", lebar: 20, uang: true },
    { judul: "Saldo Akhir", lebar: 20, uang: true },
  ];
  const baris = d.baris.map((r) => ({ sel: [r.kode, r.nama, r.tipe_nama, uang(r.saldo_awal), uang(r.debit), uang(r.kredit), uang(r.saldo_akhir)] }));
  baris.push({ sel: ["", "Total", "", null, uang(d.total.debit), uang(d.total.kredit), null], tebal: true });
  return { kolom, baris };
}

function tabelBukuBesar(d) {
  const kolom = [
    { judul: "Tanggal", lebar: 18 },
    { judul: "Nomor", lebar: 18 },
    { judul: "Tipe Transaksi", lebar: 18 },
    { judul: "Keterangan", lebar: 40 },
    { judul: "Debit", lebar: 18, uang: true },
    { judul: "Kredit", lebar: 18, uang: true },
    { judul: "Saldo", lebar: 20, uang: true },
  ];
  const baris = [];
  for (const a of d.akun) {
    baris.push({ sel: [`${a.kode} ${a.nama}`], tebal: true });
    baris.push({ sel: ["", "", "", "Saldo Awal", null, null, uang(a.saldo_awal)] });
    for (const r of a.baris) {
      baris.push({ sel: [tanggalPanjang(r.tanggal), r.nomor ?? "", r.tipe_nama, r.keterangan, uang(r.debit), uang(r.kredit), uang(r.saldo)] });
    }
    baris.push({ sel: ["", "", "", "Total", uang(a.total_debit), uang(a.total_kredit), uang(a.saldo_akhir)], tebal: true });
    baris.push({ sel: [] });
  }
  return { kolom, baris };
}

function tabelJurnal(d) {
  const kolom = [
    { judul: "Tanggal", lebar: 18 },
    { judul: "Nomor", lebar: 18 },
    { judul: "Tipe Transaksi", lebar: 18 },
    { judul: "Keterangan / Akun", lebar: 44 },
    { judul: "Departemen", lebar: 18 },
    { judul: "Debit", lebar: 18, uang: true },
    { judul: "Kredit", lebar: 18, uang: true },
  ];
  const baris = [];
  for (const j of d.jurnal) {
    baris.push({ sel: [tanggalPanjang(j.tanggal), j.nomor ?? "", j.tipe_nama, j.keterangan || "—"], tebal: true });
    for (const b of j.baris) {
      baris.push({ sel: ["", "", "", `${b.kode} ${b.nama}${b.catatan ? ` (${b.catatan})` : ""}`, b.departemen_nama ?? "", uang(b.debit) || null, uang(b.kredit) || null], menjorok: 1 });
    }
  }
  return { kolom, baris };
}

const PENYUSUN = {
  "laba-rugi": tabelLabaRugi,
  neraca: tabelNeraca,
  "neraca-percobaan": tabelNeracaPercobaan,
  "buku-besar": tabelBukuBesar,
  jurnal: tabelJurnal,
};

/** Mengembalikan { berkas: Buffer, nama: "Laba Rugi 1 Maret 2031 sampai 31 Maret 2031.xlsx" }. */
export async function buatExcel(jenis, data, namaPerusahaan) {
  const { kolom, baris } = PENYUSUN[jenis](data);
  const wb = new ExcelJS.Workbook();
  wb.creator = "EATS Dashboard";
  const ws = wb.addWorksheet(data.judul.slice(0, 31).replace(/[\\/*?:[\]]/g, "-"));
  ws.columns = kolom.map((k) => ({ width: k.lebar }));
  ws.addRow([namaPerusahaan]).font = { bold: true, size: 13 };
  ws.addRow([data.judul]).font = { bold: true, size: 12 };
  ws.addRow([periodeTeks(data)]);
  ws.addRow([]);
  const kepala = ws.addRow(kolom.map((k) => k.judul));
  kepala.font = { bold: true };
  kepala.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1EFEC" } };
    c.border = { bottom: { style: "thin", color: { argb: "FFBBBBBB" } } };
  });
  for (const b of baris) {
    const row = ws.addRow(b.sel);
    if (b.tebal) row.font = { bold: true };
    kolom.forEach((k, i) => {
      const c = row.getCell(i + 1);
      if (k.uang) c.numFmt = FORMAT_UANG;
      if (i === 1 && b.menjorok) c.alignment = { indent: b.menjorok };
    });
  }
  ws.views = [{ state: "frozen", ySplit: 5 }];
  const berkas = Buffer.from(await wb.xlsx.writeBuffer());
  // "Laba/Rugi (Standar)" → "Laba Rugi Standar": karakter yang dilarang di nama berkas diganti spasi.
  const nama = `${data.judul.replace(/[/\\:*?"<>|]/g, " ").replace(/[()]/g, "").replace(/\s+/g, " ").trim()} ${periodeTeks(data)}.xlsx`;
  return { berkas, nama };
}
