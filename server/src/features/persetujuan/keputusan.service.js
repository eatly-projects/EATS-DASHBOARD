// Perusahaan › Persetujuan: daftar transaksi yang menunggu, dan keputusan Setujui/Tolak.
// Hanya pengguna yang terdaftar sebagai penyetuju tipe transaksi itu yang bisa memutuskan.
import { dalamTransaksi, pool } from "../../shared/db/pool.js";
import { AppError, galat } from "../../shared/http.js";
import { catatLog } from "../../shared/log/log.js";
import { pastikanTanggalTerbuka } from "../preferensi/periode.js";
import { NAMA_TIPE_JURNAL, ambilJurnal, berikanNomor, potretJurnal, referensiJurnal } from "../jurnal/jurnal.service.js";

// Penyetuju boleh menyetujui transaksi buatannya sendiri (keputusan Lutfi 2026-11-20:
// saat bos sibuk, finance yang mengatur semuanya).
const STATUS = ["diajukan", "ditolak"];

export async function daftarPersetujuan(penggunaId, { status = "diajukan" } = {}) {
  if (!STATUS.includes(status)) throw galat.permintaan("Status tidak dikenal.");
  const { rows } = await pool.query(
    `select j.id, j.tipe, j.nomor, to_char(j.tanggal, 'YYYY-MM-DD') as tanggal, j.keterangan, j.total::text as total, j.status,
            coalesce(pu.nama, pb.nama) as diajukan_oleh_nama, j.diubah_at as diajukan_at, j.alasan_keputusan,
            (select string_agg(p.nama, ', ' order by p.nama) from penyetuju_transaksi_pengguna x join pengguna p on p.id = x.pengguna_id
              where x.tipe_transaksi = j.tipe) as penyetuju_nama,
            exists (select 1 from penyetuju_transaksi_pengguna x where x.tipe_transaksi = j.tipe and x.pengguna_id = $2) as bisa_putuskan
       from jurnal j left join pengguna pb on pb.id = j.dibuat_oleh left join pengguna pu on pu.id = j.diubah_oleh
      where j.status = $1 and j.tipe <> 'saldo_awal'
      order by j.tanggal, j.diubah_at`,
    [status, penggunaId],
  );
  return rows.map((r) => ({ ...r, tipe_nama: NAMA_TIPE_JURNAL[r.tipe] }));
}

export async function jumlahMenungguSaya(penggunaId) {
  const { rows } = await pool.query(
    `select count(*)::int as n from jurnal j
      where j.status = 'diajukan'
        and exists (select 1 from penyetuju_transaksi_pengguna x where x.tipe_transaksi = j.tipe and x.pengguna_id = $1)`,
    [penggunaId],
  );
  return { menunggu_saya: rows[0].n };
}

async function penyetuju(db, tipe) {
  const { rows } = await db.query(
    "select p.id, p.nama from penyetuju_transaksi_pengguna x join pengguna p on p.id = x.pengguna_id where x.tipe_transaksi = $1 order by p.nama",
    [tipe],
  );
  return rows;
}

export async function ambilPersetujuan(penggunaId, id) {
  const j = await ambilJurnal(null, id);
  const daftar = await penyetuju(pool, j.tipe);
  return { ...j, tipe_nama: NAMA_TIPE_JURNAL[j.tipe], penyetuju: daftar, bisa_putuskan: daftar.some((p) => p.id === penggunaId) };
}

/** keputusan: "setujui" | "tolak". */
export async function putuskan(req, id, keputusan, alasan = "") {
  return dalamTransaksi(async (k) => {
    const j = await ambilJurnal(null, id, k, { kunci: true });
    if (j.status !== "diajukan") throw galat.bentrok("Transaksi ini tidak sedang menunggu persetujuan; mungkin sudah diputuskan orang lain.");
    const daftar = await penyetuju(k, j.tipe);
    if (!daftar.some((p) => p.id === req.pengguna.id)) {
      throw new AppError(
        403,
        "BUKAN_PENYETUJU",
        `Anda bukan penyetuju ${NAMA_TIPE_JURNAL[j.tipe]}.${daftar.length ? ` Penyetujunya: ${daftar.map((p) => p.nama).join(", ")}.` : ""}`,
      );
    }
    if (keputusan === "setujui") {
      await pastikanTanggalTerbuka(k, j.tanggal);
      if (!j.nomor) await berikanNomor(k, j);
      else await k.query("update jurnal set status = 'disetujui' where id = $1", [id]);
      await k.query("update jurnal set diputuskan_oleh = $2, diputuskan_at = now(), alasan_keputusan = '' where id = $1", [id, req.pengguna.id]);
    } else {
      await k.query(
        "update jurnal set status = 'ditolak', diputuskan_oleh = $2, diputuskan_at = now(), alasan_keputusan = $3 where id = $1",
        [id, req.pengguna.id, alasan],
      );
    }
    const sesudah = await ambilJurnal(null, id, k);
    await catatLog(k, req, {
      tindakan: "ubah",
      menu: j.tipe,
      referensi: referensiJurnal(sesudah),
      tanggalTransaksi: sesudah.tanggal,
      sebelum: potretJurnal(j),
      sesudah: potretJurnal(sesudah),
    });
    return sesudah;
  });
}
