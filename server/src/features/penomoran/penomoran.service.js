// Penomoran otomatis. Nomor urut diambil di dalam transaksi dokumennya, jadi:
//   - dua orang yang menyimpan bersamaan tidak pernah mendapat nomor yang sama
//     (baris nomor urut terkunci sampai transaksi pertama selesai);
//   - transaksi yang batal tidak memakan nomor.
import { dalamTransaksi, pool } from "../../shared/db/pool.js";
import { AppError, galat } from "../../shared/http.js";
import { catatLog } from "../../shared/log/log.js";
import { pastikanId } from "../akses-grup/akses-grup.service.js";
import { kunciPeriode, periksaFormat, susunNomor } from "./format.js";
import { TIPE_TRANSAKSI, namaTipe } from "./tipe-transaksi.js";

export const NAMA_RESET = { tidak: "Tidak pernah", hari: "Setiap hari", bulan: "Setiap bulan", tahun: "Setiap tahun" };

/** Tanggal hari ini di Jakarta, 'YYYY-MM-DD'. */
export const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

/** Nomor berikutnya. WAJIB dipanggil dengan klien transaksi dokumen yang sedang disimpan. */
export async function ambilNomorBerikut(klien, tipeTransaksi, tanggal, penomoranId = null) {
  const { rows } = penomoranId
    ? await klien.query("select * from penomoran where id = $1", [penomoranId])
    : await klien.query("select * from penomoran where tipe_transaksi = $1 and bawaan", [tipeTransaksi]);
  const p = rows[0];
  if (!p) {
    throw new AppError(409, "PENOMORAN_BELUM_ADA", `Belum ada penomoran bawaan untuk ${namaTipe(tipeTransaksi)}. Buat di Pengaturan, menu Penomoran.`);
  }
  const { rows: c } = await klien.query(
    `insert into penomoran_counter (penomoran_id, kunci_periode, terakhir) values ($1, $2, 1)
     on conflict (penomoran_id, kunci_periode) do update set terakhir = penomoran_counter.terakhir + 1
     returning terakhir`,
    [p.id, kunciPeriode(p.reset, tanggal)],
  );
  return susunNomor(p, tanggal, c[0].terakhir);
}

const rapikanFormat = (format) => format.map((b) => (b.jenis === "teks" ? { jenis: "teks", nilai: String(b.nilai) } : { jenis: b.jenis }));

function potret(p) {
  return {
    Nama: p.nama,
    "Tipe transaksi": namaTipe(p.tipe_transaksi),
    "Contoh nomor": susunNomor(p, hariIni(), 1),
    "Jumlah digit nomor urut": String(p.digit_counter),
    "Nomor urut diulang": NAMA_RESET[p.reset],
    Bawaan: p.bawaan ? "Ya" : "Tidak",
  };
}

async function ambil(db, id) {
  pastikanId(id, "Penomoran tidak ditemukan.");
  const { rows } = await db.query(
    `select p.*, coalesce((select sum(terakhir) from penomoran_counter where penomoran_id = p.id), 0)::int as terpakai
       from penomoran p where p.id = $1`,
    [id],
  );
  if (!rows[0]) throw galat.tidakAda("Penomoran tidak ditemukan.");
  return rows[0];
}

export async function daftarPenomoran() {
  const tanggal = hariIni();
  const [{ rows }, { rows: counter }] = await Promise.all([
    pool.query(
      `select p.id, p.nama, p.tipe_transaksi, p.format, p.digit_counter, p.reset, p.bawaan,
              coalesce(sum(c.terakhir), 0)::int as terpakai
         from penomoran p left join penomoran_counter c on c.penomoran_id = p.id
        group by p.id order by p.tipe_transaksi, lower(p.nama)`,
    ),
    pool.query("select penomoran_id, kunci_periode, terakhir from penomoran_counter"),
  ]);
  return rows.map((p) => {
    const kunci = kunciPeriode(p.reset, tanggal);
    const terakhir = counter.find((c) => c.penomoran_id === p.id && c.kunci_periode === kunci)?.terakhir ?? 0;
    return { ...p, tipe_nama: namaTipe(p.tipe_transaksi), contoh: susunNomor(p, tanggal, terakhir + 1) };
  });
}

/** Contoh nomor pertama untuk susunan yang sedang diisi di formulir. */
export function pratinjau(body) {
  const galatFormat = periksaFormat(body);
  return { contoh: galatFormat ? null : susunNomor(body, hariIni(), 1), galat: galatFormat };
}

const PESAN_BAWAAN = "Setiap tipe transaksi butuh satu penomoran bawaan. Jadikan penomoran lain sebagai bawaan; yang ini otomatis berhenti jadi bawaan.";

/** Membuat (id = null) atau mengubah penomoran. */
export async function simpanPenomoran(req, id, body) {
  if (!TIPE_TRANSAKSI.some((t) => t.kode === body.tipe_transaksi)) throw galat.permintaan("Tipe transaksi tidak dikenal.");
  const galatFormat = periksaFormat(body);
  if (galatFormat) throw galat.permintaan(galatFormat);
  const data = { ...body, format: rapikanFormat(body.format) };

  return dalamTransaksi(async (k) => {
    const sebelum = id ? await ambil(k, id) : null;
    if (sebelum?.terpakai > 0) {
      const susunanBerubah =
        JSON.stringify(sebelum.format) !== JSON.stringify(data.format) ||
        sebelum.digit_counter !== data.digit_counter ||
        sebelum.reset !== data.reset ||
        sebelum.tipe_transaksi !== data.tipe_transaksi;
      if (susunanBerubah) {
        throw galat.bentrok(
          `Penomoran ini sudah dipakai untuk ${sebelum.terpakai} nomor, jadi susunannya tidak bisa diubah supaya tidak ada nomor kembar. Buat penomoran baru.`,
        );
      }
    }
    if (sebelum?.bawaan && (!data.bawaan || data.tipe_transaksi !== sebelum.tipe_transaksi)) throw galat.permintaan(PESAN_BAWAAN);

    // Tipe yang belum punya bawaan: penomoran pertamanya otomatis jadi bawaan.
    const { rowCount: adaBawaan } = await k.query("select 1 from penomoran where tipe_transaksi = $1 and bawaan and id is distinct from $2", [
      data.tipe_transaksi,
      id,
    ]);
    const bawaan = data.bawaan || !adaBawaan;
    if (bawaan) {
      await k.query("update penomoran set bawaan = false, diubah_at = now() where tipe_transaksi = $1 and bawaan and id is distinct from $2", [
        data.tipe_transaksi,
        id,
      ]);
    }

    const nilai = [data.nama, data.tipe_transaksi, JSON.stringify(data.format), data.digit_counter, data.reset, bawaan];
    let simpanId = id;
    try {
      if (id) {
        await k.query(
          `update penomoran set nama = $1, tipe_transaksi = $2, format = $3::jsonb, digit_counter = $4, reset = $5, bawaan = $6, diubah_at = now()
            where id = $7`,
          [...nilai, id],
        );
      } else {
        const { rows } = await k.query(
          `insert into penomoran (nama, tipe_transaksi, format, digit_counter, reset, bawaan)
           values ($1, $2, $3::jsonb, $4, $5, $6) returning id`,
          nilai,
        );
        simpanId = rows[0].id;
      }
    } catch (e) {
      if (e.code === "23505") throw galat.bentrok("Nama penomoran itu sudah dipakai.");
      throw e;
    }
    const sesudah = await ambil(k, simpanId);
    await catatLog(k, req, {
      tindakan: id ? "ubah" : "buat",
      menu: "penomoran",
      referensi: sesudah.nama,
      sebelum: sebelum && potret(sebelum),
      sesudah: potret(sesudah),
    });
    return sesudah;
  });
}

export async function hapusPenomoran(req, id) {
  return dalamTransaksi(async (k) => {
    const p = await ambil(k, id);
    if (p.bawaan) throw galat.bentrok("Penomoran bawaan tidak bisa dihapus. Jadikan penomoran lain sebagai bawaan dulu.");
    if (p.terpakai > 0) throw galat.bentrok(`Penomoran ini sudah dipakai untuk ${p.terpakai} nomor, jadi tidak bisa dihapus.`);
    await k.query("delete from penomoran where id = $1", [id]);
    await catatLog(k, req, { tindakan: "hapus", menu: "penomoran", referensi: p.nama, sebelum: potret(p) });
    return { id };
  });
}
