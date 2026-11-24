// Modul jurnal bersama untuk Jurnal Umum, Pencatatan Beban, dan Kas & Bank (Penerimaan,
// Pembayaran, Transfer Bank). Satu dokumen = satu baris `jurnal` + rinciannya di
// `jurnal_baris`; semua laporan dihitung dari sini.
//
// Pencatatan Beban dan Kas & Bank menyimpan akun kepala (Hutang Beban / rekening) di
// `akun_lawan_id` dan menulis baris akun itu otomatis (`otomatis = true`).
//
// Urutan di dalam satu transaksi database:
//   periksa isian → periksa akun & departemen → periksa seimbang (dalam sen) →
//   periksa tanggal terbuka → tulis kepala & rincian → nilai aturan persetujuan →
//   beri nomor PALING AKHIR (kunci nomor urut ditahan sesingkat mungkin) → catat log.
import { dalamTransaksi, pool } from "../../shared/db/pool.js";
import { AppError, galat } from "../../shared/http.js";
import { catatLog } from "../../shared/log/log.js";
import { tanggalPanjang } from "../../shared/format.js";
import { dariSen, keSen, rupiahTeks } from "../../shared/uang.js";
import { pastikanId } from "../akses-grup/akses-grup.service.js";
import { namaTipeAkun } from "../akun/tipe-akun.js";
import { pastikanTanggalTerbuka } from "../preferensi/periode.js";
import { ambilNomorBerikut } from "../penomoran/penomoran.service.js";
import { nilaiAturan } from "../persetujuan/persetujuan.service.js";

export const NAMA_TIPE_JURNAL = {
  jurnal_umum: "Jurnal Umum",
  pencatatan_beban: "Pencatatan Beban",
  saldo_awal: "Saldo Awal",
  penerimaan: "Penerimaan",
  pembayaran: "Pembayaran",
  transfer_bank: "Transfer Bank",
};
export const NAMA_STATUS = { disetujui: "Disetujui", diajukan: "Menunggu persetujuan", ditolak: "Ditolak" };
const TIPE_BEBAN = ["beban", "beban_lainnya", "beban_pokok_penjualan"];
export const TIPE_KAS = ["penerimaan", "pembayaran", "transfer_bank"];
// Sisi rincian yang diisi orang; baris akun kepala (otomatis) di sisi sebaliknya.
const SISI_RINCIAN = { pencatatan_beban: "debit", pembayaran: "debit", transfer_bank: "debit", penerimaan: "kredit" };
// Spec Tahap 2 §4.2: uang penjualan dan pembelian barang hanya dicatat di aplikasi Operasional.
const TIPE_DARI_OPERASIONAL = ["piutang_usaha", "utang_usaha", "persediaan"];
const LABEL_REKENING = { penerimaan: "Setor ke", pembayaran: "Bayar dari", transfer_bank: "Dari rekening" };
const UKURAN = 50;

const KEPALA = `
  select j.id, j.tipe, j.nomor, to_char(j.tanggal, 'YYYY-MM-DD') as tanggal, j.keterangan, j.status,
         j.akun_lawan_id, la.kode || ' ' || la.nama as akun_lawan_nama,
         to_char(j.jatuh_tempo, 'YYYY-MM-DD') as jatuh_tempo, j.penomoran_id, j.total::text as total,
         j.dibuat_oleh, pb.nama as dibuat_oleh_nama, j.dibuat_at, pu.nama as diubah_oleh_nama, j.diubah_at,
         j.diputuskan_oleh, pd.nama as diputuskan_oleh_nama, j.diputuskan_at, j.alasan_keputusan
    from jurnal j
    left join akun la on la.id = j.akun_lawan_id
    left join pengguna pb on pb.id = j.dibuat_oleh
    left join pengguna pu on pu.id = j.diubah_oleh
    left join pengguna pd on pd.id = j.diputuskan_oleh`;

const RINCIAN = `
  select b.urutan, b.akun_id, a.kode as akun_kode, a.nama as akun_nama, b.debit::text as debit, b.kredit::text as kredit,
         b.departemen_id, d.nama as departemen_nama, b.catatan, b.otomatis
    from jurnal_baris b join akun a on a.id = b.akun_id left join departemen d on d.id = b.departemen_id
   where b.jurnal_id = $1 order by b.urutan`;

/**
 * Kepala + rincian. Pencatatan Beban dan Kas & Bank: `baris` tanpa baris otomatis (akun kepala),
 * dengan `nilai`. Transfer Bank juga membawa `akun_tujuan_id`, `akun_tujuan_nama`, dan `nilai`.
 */
export async function ambilJurnal(tipe, id, db = pool, { kunci = false } = {}) {
  pastikanId(id, "Transaksi tidak ditemukan.");
  const { rows } = await db.query(`${KEPALA} where j.id = $1 and ($2::text is null or j.tipe = $2)${kunci ? " for update of j" : ""}`, [id, tipe]);
  const j = rows[0];
  if (!j) throw galat.tidakAda("Transaksi tidak ditemukan.");
  const { rows: baris } = await db.query(RINCIAN, [id]);
  j.semua_baris = baris;
  const sisi = SISI_RINCIAN[j.tipe];
  j.baris = sisi ? baris.filter((b) => !b.otomatis).map((b) => ({ ...b, nilai: b[sisi] })) : baris;
  if (j.tipe === "transfer_bank") {
    const tujuan = j.baris[0];
    j.akun_tujuan_id = tujuan?.akun_id ?? null;
    j.akun_tujuan_nama = tujuan ? `${tujuan.akun_kode} ${tujuan.akun_nama}` : null;
    j.nilai = tujuan?.nilai ?? null;
  }
  return j;
}

export async function daftarJurnal(tipe, { dari, sampai, status, cari, halaman = 1 }) {
  const syarat = ["j.tipe = $1"];
  const nilai = [tipe];
  const tambah = (sql, v) => {
    nilai.push(v);
    syarat.push(sql.replace("?", `$${nilai.length}`));
  };
  if (dari) tambah("j.tanggal >= ?", dari);
  if (sampai) tambah("j.tanggal <= ?", sampai);
  if (status) tambah("j.status = ?", status);
  if (cari) {
    nilai.push(`%${cari.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    syarat.push(`(j.nomor ilike $${nilai.length} or j.keterangan ilike $${nilai.length})`);
  }
  const where = `where ${syarat.join(" and ")}`;
  const { rows: jumlah } = await pool.query(`select count(*)::int as n from jurnal j ${where}`, nilai);
  const { rows } = await pool.query(
    `select j.id, j.nomor, to_char(j.tanggal, 'YYYY-MM-DD') as tanggal, j.keterangan, j.total::text as total, j.status,
            pb.nama as dibuat_oleh_nama, la.kode || ' ' || la.nama as akun_lawan_nama,
            case when j.tipe = 'transfer_bank' then
              (select a2.kode || ' ' || a2.nama from jurnal_baris b2 join akun a2 on a2.id = b2.akun_id
                where b2.jurnal_id = j.id and not b2.otomatis order by b2.urutan limit 1)
            end as akun_tujuan_nama
       from jurnal j left join pengguna pb on pb.id = j.dibuat_oleh left join akun la on la.id = j.akun_lawan_id
       ${where}
      order by j.tanggal desc, j.nomor desc nulls first, j.dibuat_at desc
      limit ${UKURAN} offset ${(halaman - 1) * UKURAN}`,
    nilai,
  );
  return { baris: rows, jumlah: jumlah[0].n, halaman, ukuran: UKURAN };
}

/** Body browser → baris jurnal { akun_id, debit (sen), kredit (sen), departemen_id, catatan, otomatis }. */
function susunBaris(tipe, body) {
  if (tipe === "transfer_bank") {
    const nilai = keSen(body.nilai);
    if (nilai <= 0n) throw galat.permintaan("Nilai transfer harus lebih dari nol.");
    return [
      { akun_id: body.akun_tujuan_id, debit: nilai, kredit: 0n, departemen_id: null, catatan: "", otomatis: false },
      { akun_id: body.akun_lawan_id, debit: 0n, kredit: nilai, departemen_id: null, catatan: "", otomatis: true },
    ];
  }
  const sisi = SISI_RINCIAN[tipe];
  if (sisi) {
    const kataNilai = tipe === "pencatatan_beban" ? "nilai beban" : "nilai";
    const di = (nilai) => (sisi === "debit" ? { debit: nilai, kredit: 0n } : { debit: 0n, kredit: nilai });
    let total = 0n;
    const baris = body.baris.map((b, i) => {
      const nilai = keSen(b.nilai);
      if (nilai <= 0n) throw galat.permintaan(`Baris ke-${i + 1}: ${kataNilai} harus lebih dari nol.`);
      total += nilai;
      return { akun_id: b.akun_id, ...di(nilai), departemen_id: b.departemen_id, catatan: b.catatan, otomatis: false };
    });
    const lawan = sisi === "debit" ? { debit: 0n, kredit: total } : { debit: total, kredit: 0n };
    baris.push({ akun_id: body.akun_lawan_id, ...lawan, departemen_id: null, catatan: "", otomatis: true });
    return baris;
  }
  return body.baris.map((b, i) => {
    const debit = keSen(b.debit);
    const kredit = keSen(b.kredit);
    if ((debit > 0n) === (kredit > 0n)) throw galat.permintaan(`Baris ke-${i + 1}: isi debit atau kredit, salah satu saja.`);
    return { akun_id: b.akun_id, debit, kredit, departemen_id: b.departemen_id, catatan: b.catatan, otomatis: false };
  });
}

async function periksaAkunDanDepartemen(k, tipe, body, baris, sebelum) {
  const lamaAkun = new Set((sebelum?.semua_baris ?? []).map((b) => b.akun_id));
  const lamaDep = new Set((sebelum?.semua_baris ?? []).map((b) => b.departemen_id).filter(Boolean));
  const idAkun = [...new Set(baris.map((b) => b.akun_id))];
  const { rows: akun } = await k.query(
    `select a.id, a.kode, a.nama, a.tipe, a.nonaktif, exists (select 1 from akun c where c.induk_id = a.id) as punya_anak
       from akun a where a.id = any($1::uuid[])`,
    [idAkun],
  );
  const peta = new Map(akun.map((a) => [a.id, a]));
  for (const id of idAkun) {
    const a = peta.get(id);
    if (!a) throw galat.permintaan("Ada akun yang tidak ditemukan. Muat ulang halaman lalu pilih lagi.");
    if (a.punya_anak) throw galat.permintaan(`Akun ${a.kode} ${a.nama} adalah akun induk; pilih salah satu sub akunnya.`);
    if (a.nonaktif && !lamaAkun.has(id)) throw galat.permintaan(`Akun ${a.kode} ${a.nama} nonaktif, jadi tidak bisa dipakai.`);
  }
  if (tipe === "pencatatan_beban") {
    const lawan = peta.get(body.akun_lawan_id);
    if (lawan.tipe !== "liabilitas_jangka_pendek") throw galat.permintaan("Hutang Beban harus akun bertipe Liabilitas Jangka Pendek, misalnya 210204 Hutang Biaya.");
    for (const b of baris.filter((x) => !x.otomatis)) {
      const a = peta.get(b.akun_id);
      if (!TIPE_BEBAN.includes(a.tipe)) {
        throw galat.permintaan(`Akun ${a.kode} ${a.nama} bukan akun beban. Rincian Pencatatan Beban hanya untuk akun bertipe Beban, Beban Lainnya, atau Beban Pokok Penjualan.`);
      }
    }
  }
  if (TIPE_KAS.includes(tipe)) {
    const rekening = tipe === "transfer_bank" ? [body.akun_lawan_id, body.akun_tujuan_id] : [body.akun_lawan_id];
    if (rekening.some((id) => peta.get(id).tipe !== "kas_bank")) throw galat.permintaan("Rekening harus akun bertipe Kas & Bank.");
    if (tipe === "transfer_bank" && body.akun_lawan_id === body.akun_tujuan_id) {
      throw galat.permintaan("Rekening asal dan tujuan tidak boleh sama.");
    }
    if (tipe !== "transfer_bank") {
      for (const b of baris.filter((x) => !x.otomatis)) {
        const a = peta.get(b.akun_id);
        if (a.tipe === "kas_bank") {
          throw galat.permintaan(`Akun ${a.kode} ${a.nama} adalah rekening. Untuk memindah uang antar-rekening, pakai Transfer Bank.`);
        }
        if (TIPE_DARI_OPERASIONAL.includes(a.tipe)) {
          throw galat.permintaan(
            `Transaksi ini dicatat di aplikasi Operasional. Akun ${a.kode} ${a.nama} (${namaTipeAkun(a.tipe)}) terisi otomatis dari sana, jadi tidak diketik di sini.`,
          );
        }
      }
    }
  }
  const idDep = [...new Set(baris.map((b) => b.departemen_id).filter(Boolean))];
  if (idDep.length) {
    const { rows: dep } = await k.query("select id, nama, nonaktif from departemen where id = any($1::uuid[])", [idDep]);
    const petaDep = new Map(dep.map((d) => [d.id, d]));
    for (const id of idDep) {
      const d = petaDep.get(id);
      if (!d) throw galat.permintaan("Ada departemen yang tidak ditemukan. Muat ulang halaman lalu pilih lagi.");
      if (d.nonaktif && !lamaDep.has(id)) throw galat.permintaan(`Departemen ${d.nama} nonaktif, jadi tidak bisa dipakai.`);
    }
  }
}

/** Memberi nomor dan status disetujui. Nomor kembar karena simpan bersamaan → coba nomor berikutnya. */
async function berikanNomor(k, j) {
  const dipakai = async (n) => (await k.query("select 1 from jurnal where tipe = $1 and nomor = $2", [j.tipe, n])).rowCount > 0;
  for (let coba = 0; coba < 20; coba++) {
    const nomor = await ambilNomorBerikut(k, j.tipe, j.tanggal, j.penomoran_id, { dipakai });
    await k.query("savepoint beri_nomor");
    try {
      await k.query("update jurnal set nomor = $2, status = 'disetujui' where id = $1", [j.id, nomor]);
      await k.query("release savepoint beri_nomor");
      return nomor;
    } catch (e) {
      await k.query("rollback to savepoint beri_nomor");
      if (e.code !== "23505") throw e;
    }
  }
  throw new AppError(409, "NOMOR_BENTROK", "Nomor transaksi terus bentrok dengan transaksi lain. Coba simpan lagi.");
}

export function potretJurnal(j) {
  const isi = {
    Nomor: j.nomor ?? "Belum ada (menunggu persetujuan)",
    Tanggal: tanggalPanjang(j.tanggal),
    Keterangan: j.keterangan || "—",
    Status: NAMA_STATUS[j.status],
    Total: rupiahTeks(j.total),
  };
  if (j.diputuskan_oleh_nama) isi["Diputuskan oleh"] = j.diputuskan_oleh_nama;
  if (j.status === "ditolak" && j.alasan_keputusan) isi["Alasan penolakan"] = j.alasan_keputusan;
  if (j.tipe === "pencatatan_beban") {
    isi["Hutang beban"] = j.akun_lawan_nama;
    isi["Jatuh tempo"] = j.jatuh_tempo ? tanggalPanjang(j.jatuh_tempo) : "—";
  }
  if (LABEL_REKENING[j.tipe]) isi[LABEL_REKENING[j.tipe]] = j.akun_lawan_nama ?? "—";
  if (j.tipe === "transfer_bank") {
    isi["Ke rekening"] = j.akun_tujuan_nama ?? "—";
    return isi;
  }
  const bernilai = Boolean(SISI_RINCIAN[j.tipe]);
  isi.Rincian = j.semua_baris
    .filter((b) => !b.otomatis)
    .map((b) => {
      const debit = keSen(b.debit) > 0n;
      const nilai = rupiahTeks(debit ? b.debit : b.kredit);
      return `${b.akun_kode} ${b.akun_nama}: ${bernilai ? nilai : `${debit ? "Debit" : "Kredit"} ${nilai}`}${b.departemen_nama ? `, ${b.departemen_nama}` : ""}${b.catatan ? ` (${b.catatan})` : ""}`;
    })
    .join("; ");
  return isi;
}

export const referensiJurnal = (j) => j.nomor ?? `${NAMA_TIPE_JURNAL[j.tipe]} ${tanggalPanjang(j.tanggal)} (menunggu persetujuan)`;

export async function simpanJurnal(req, tipe, id, body) {
  if (id) pastikanId(id, "Transaksi tidak ditemukan.");
  return dalamTransaksi(async (k) => {
    const sebelum = id ? await ambilJurnal(tipe, id, k, { kunci: true }) : null;
    const baris = susunBaris(tipe, body);
    await periksaAkunDanDepartemen(k, tipe, body, baris, sebelum);

    const debit = baris.reduce((s, b) => s + b.debit, 0n);
    const kredit = baris.reduce((s, b) => s + b.kredit, 0n);
    if (debit !== kredit) {
      throw galat.permintaan(`Total debit ${rupiahTeks(dariSen(debit))} belum sama dengan total kredit ${rupiahTeks(dariSen(kredit))}.`);
    }
    if (debit === 0n) throw galat.permintaan("Total transaksi tidak boleh nol.");

    if (sebelum) await pastikanTanggalTerbuka(k, sebelum.tanggal);
    await pastikanTanggalTerbuka(k, body.tanggal);

    if (body.penomoran_id) {
      const { rows } = await k.query("select tipe_transaksi from penomoran where id = $1", [body.penomoran_id]);
      if (rows[0]?.tipe_transaksi !== tipe) throw galat.permintaan("Penomoran yang dipilih bukan untuk tipe transaksi ini.");
    }

    const { perluPersetujuan } = await nilaiAturan(k, tipe, debit);
    const nomorLama = sebelum?.nomor ?? null;
    // Status disetujui baru dipasang bersama nomornya (lihat berikanNomor).
    const statusSementara = perluPersetujuan || !nomorLama ? "diajukan" : "disetujui";
    const kepala = [
      body.tanggal,
      body.keterangan,
      tipe === "pencatatan_beban" || TIPE_KAS.includes(tipe) ? body.akun_lawan_id : null,
      tipe === "pencatatan_beban" ? body.jatuh_tempo : null,
      body.penomoran_id ?? sebelum?.penomoran_id ?? null,
      dariSen(debit),
      req.pengguna.id,
      statusSementara,
    ];
    let jurnalId = id;
    if (sebelum) {
      await k.query(
        `update jurnal set tanggal = $2, keterangan = $3, akun_lawan_id = $4, jatuh_tempo = $5, penomoran_id = $6, total = $7,
                diubah_oleh = $8, diubah_at = now(), status = $9, diputuskan_oleh = null, diputuskan_at = null, alasan_keputusan = ''
          where id = $1`,
        [id, ...kepala],
      );
      await k.query("delete from jurnal_baris where jurnal_id = $1", [id]);
    } else {
      const { rows } = await k.query(
        `insert into jurnal (tipe, tanggal, keterangan, akun_lawan_id, jatuh_tempo, penomoran_id, total, dibuat_oleh, diubah_oleh, status)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9) returning id`,
        [tipe, ...kepala],
      );
      jurnalId = rows[0].id;
    }
    let urutan = 0;
    for (const b of baris) {
      await k.query(
        "insert into jurnal_baris (jurnal_id, urutan, akun_id, debit, kredit, departemen_id, catatan, otomatis) values ($1, $2, $3, $4, $5, $6, $7, $8)",
        [jurnalId, ++urutan, b.akun_id, dariSen(b.debit), dariSen(b.kredit), b.departemen_id, b.catatan, b.otomatis],
      );
    }

    if (!perluPersetujuan && !nomorLama) {
      await berikanNomor(k, { id: jurnalId, tipe, tanggal: body.tanggal, penomoran_id: body.penomoran_id ?? sebelum?.penomoran_id ?? null });
    }

    const sesudah = await ambilJurnal(tipe, jurnalId, k);
    await catatLog(k, req, {
      tindakan: sebelum ? "ubah" : "buat",
      menu: tipe,
      referensi: referensiJurnal(sesudah),
      tanggalTransaksi: sesudah.tanggal,
      sebelum: sebelum ? potretJurnal(sebelum) : null,
      sesudah: potretJurnal(sesudah),
    });
    return sesudah;
  });
}

export async function hapusJurnal(req, tipe, id) {
  return dalamTransaksi(async (k) => {
    const j = await ambilJurnal(tipe, id, k, { kunci: true });
    await pastikanTanggalTerbuka(k, j.tanggal);
    await k.query("delete from jurnal where id = $1", [id]);
    await catatLog(k, req, { tindakan: "hapus", menu: tipe, referensi: referensiJurnal(j), tanggalTransaksi: j.tanggal, sebelum: potretJurnal(j) });
    return { id };
  });
}

export { berikanNomor };
