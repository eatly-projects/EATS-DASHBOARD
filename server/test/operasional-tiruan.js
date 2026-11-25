// Server tiruan aplikasi Operasional untuk tes dan pengecekan di browser lokal. Bentuk jawabannya
// menyalin kontrak C:\projects\boomboo-operations\docs\INTEGRASI-EAATS.md bagian 2–6 (§89 piutang).
// Tes tidak pernah memanggil Operasional sungguhan.
//
// Dijalankan langsung: node test/operasional-tiruan.js <port>
//   → menyala dengan contohPiutang() dan kunci "kunci-uji" sampai prosesnya dimatikan.
import http from "node:http";
import { pathToFileURL } from "node:url";

const DASAR = "https://boomboo-operations.vercel.app/pesanan-klien";

function dokumen(isi) {
  return {
    jenis_dokumen: "co",
    nomor_po_klien: null,
    brands: ["Boomboo"],
    total_retur_rp: 0,
    dikembalikan_rp: 0,
    harus_dikembalikan_rp: 0,
    ...isi,
  };
}

const NOL_UMUR = () => ({ belum_jatuh_tempo: 0, telat_1_30: 0, telat_31_60: 0, telat_lebih_60: 0, tanpa_jatuh_tempo: 0 });
const KOLOM_UANG = ["total_tagihan_rp", "total_retur_rp", "dibayar_rp", "dikembalikan_rp", "sisa_rp", "harus_dikembalikan_rp"];

/** Ringkasan per customer dan total yang konsisten dengan baris (kontrak bagian 5). */
export function ringkas(baris) {
  const peta = new Map();
  for (const b of baris) {
    const kunci = b.customer.id ?? `nama:${b.customer.nama.toLowerCase()}`;
    if (!peta.has(kunci)) peta.set(kunci, { customer: b.customer, jumlah_dokumen: 0, ...Object.fromEntries(KOLOM_UANG.map((k) => [k, 0])), sisa_per_umur: NOL_UMUR() });
    const c = peta.get(kunci);
    c.jumlah_dokumen += 1;
    for (const k of KOLOM_UANG) c[k] += b[k];
    if (b.umur_piutang) c.sisa_per_umur[b.umur_piutang] += b.sisa_rp;
  }
  const per_customer = [...peta.values()].sort((a, b) => b.sisa_rp - a.sisa_rp);
  const total = { jumlah_customer: per_customer.length, jumlah_dokumen: baris.length, ...Object.fromEntries(KOLOM_UANG.map((k) => [k, 0])), sisa_per_umur: NOL_UMUR() };
  for (const c of per_customer) {
    for (const k of KOLOM_UANG) total[k] += c[k];
    for (const u of Object.keys(total.sisa_per_umur)) total.sisa_per_umur[u] += c.sisa_per_umur[u];
  }
  return { per_customer, total };
}

/** Data §89 contoh: 4 dokumen, semua cek lolos. `override` menimpa kolom tingkat atas. */
export function contohPiutang(override = {}) {
  const c1 = { id: "11111111-1111-4111-8111-111111111111", kode: "C-0001", nama: "PT Maju Rasa", telepon: "080000000001" };
  const c2 = { id: "22222222-2222-4222-8222-222222222222", kode: "C-0002", nama: "Resto Sederhana", telepon: "080000000002" };
  const baris = [
    dokumen({
      id_dokumen: "aaaaaaaa-0000-4000-8000-000000000001",
      nomor_dokumen: "03/boomboo/XI/2026",
      customer: c1,
      segmen: "maklon",
      tanggal_dokumen: "2026-11-02",
      jatuh_tempo: null,
      total_tagihan_rp: 1000000,
      dibayar_rp: 400000,
      sisa_rp: 600000,
      umur_piutang: "tanpa_jatuh_tempo",
      status: "sebagian",
      url_operasional: `${DASAR}/co/aaaaaaaa-0000-4000-8000-000000000001?tab=co`,
    }),
    dokumen({
      jenis_dokumen: "invoice_po",
      id_dokumen: "bbbbbbbb-0000-4000-8000-000000000002",
      nomor_dokumen: "01-Boomboo-PO/XI/2026",
      nomor_po_klien: "PO-KLIEN-77",
      customer: c1,
      segmen: "horeca",
      tanggal_dokumen: "2026-10-27",
      jatuh_tempo: "2026-11-10",
      total_tagihan_rp: 2500000,
      dibayar_rp: 0,
      sisa_rp: 2500000,
      umur_piutang: "telat_1_30",
      status: "belum",
      url_operasional: `${DASAR}/po/cccccccc-0000-4000-8000-000000000002?tab=po`,
    }),
    dokumen({
      jenis_dokumen: "invoice_po",
      id_dokumen: "bbbbbbbb-0000-4000-8000-000000000003",
      nomor_dokumen: "02-Boomboo-PO/XI/2026",
      nomor_po_klien: "PO-RS-1",
      customer: c2,
      segmen: "retail",
      tanggal_dokumen: "2026-11-03",
      jatuh_tempo: "2026-12-03",
      total_tagihan_rp: 500000,
      dibayar_rp: 500000,
      sisa_rp: 0,
      umur_piutang: null,
      status: "lunas",
      url_operasional: `${DASAR}/po/cccccccc-0000-4000-8000-000000000003?tab=po`,
    }),
    dokumen({
      id_dokumen: "aaaaaaaa-0000-4000-8000-000000000004",
      nomor_dokumen: "01/boomboo/X/2026",
      customer: { id: null, kode: null, nama: "Toko Lama", telepon: null },
      segmen: null,
      tanggal_dokumen: "2026-10-28",
      jatuh_tempo: null,
      total_tagihan_rp: 300000,
      total_retur_rp: 150000,
      dibayar_rp: 300000,
      sisa_rp: 0,
      harus_dikembalikan_rp: 150000,
      umur_piutang: null,
      status: "harus_dikembalikan",
      url_operasional: `${DASAR}/co/aaaaaaaa-0000-4000-8000-000000000004?tab=co`,
    }),
  ];
  const isi = {
    generated_at: "2026-11-25T03:00:00.000Z",
    hari_ini_jakarta: "2026-11-25",
    per_tanggal: null,
    mata_uang: "IDR",
    baris,
    cek: [
      { nama: "setiap dokumen muncul satu kali", ok: true },
      { nama: "jumlah uang baris = per customer = total", ok: true },
    ],
    ...override,
  };
  return { ...isi, ...ringkas(isi.baris), ...override };
}

/**
 * Menyalakan tiruan di 127.0.0.1 port acak (atau `port`).
 * Opsi: status (bawaan 200), isi (data §89), tunda (ms sebelum menjawab), mentah (teks jawaban apa adanya),
 * kunci (kalau diisi, header X-Api-Key lain dijawab 401 seperti Operasional).
 */
export async function mulaiTiruan(opsiAwal = {}, port = 0) {
  let opsi = { status: 200, isi: contohPiutang(), tunda: 0, mentah: null, kunci: null, ...opsiAwal };
  const kunciDiterima = [];
  const server = http.createServer((req, res) => {
    const kirim = () => {
      if (req.method !== "GET" || !req.url.startsWith("/api/eaats/piutang")) {
        res.writeHead(404, { "content-type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "Tidak ada." }));
      }
      const kunci = req.headers["x-api-key"];
      kunciDiterima.push(kunci);
      if (opsi.kunci && kunci !== opsi.kunci) {
        res.writeHead(401, { "content-type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "Kunci Eaats salah atau tidak dikirim." }));
      }
      if (opsi.mentah !== null) {
        res.writeHead(opsi.status, { "content-type": "text/html" });
        return res.end(opsi.mentah);
      }
      res.writeHead(opsi.status, { "content-type": "application/json", "cache-control": "no-store" });
      const pesan = { 401: "Kunci Eaats salah atau tidak dikirim.", 503: "Kunci Eaats belum diatur" }[opsi.status] ?? "galat";
      res.end(JSON.stringify(opsi.status < 400 ? { ok: true, data: opsi.isi } : { ok: false, error: pesan }));
    };
    if (opsi.tunda) setTimeout(kirim, opsi.tunda);
    else kirim();
  });
  await new Promise((selesai) => server.listen(port, "127.0.0.1", selesai));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    kunciDiterima,
    ubah: (baru) => {
      opsi = { ...opsi, ...baru };
    },
    tutup: () =>
      new Promise((selesai) => {
        server.close(() => selesai());
        server.closeAllConnections();
      }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2]) || 4921;
  const t = await mulaiTiruan({ kunci: "kunci-uji" }, port);
  console.log(`Tiruan Operasional menyala di ${t.url} (kunci: kunci-uji). Matikan dengan Ctrl+C.`);
}
