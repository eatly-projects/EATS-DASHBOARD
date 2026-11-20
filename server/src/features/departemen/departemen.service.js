// Departemen (lini bisnis): data induk ala Accurate. Tidak ada kode, cukup nama;
// bisa bertingkat (Sub Departemen dari). Departemen yang sudah dipakai jurnal
// tidak bisa dihapus, hanya dinonaktifkan.
import { dalamTransaksi, pool } from "../../shared/db/pool.js";
import { galat } from "../../shared/http.js";
import { catatLog } from "../../shared/log/log.js";
import { pastikanId } from "../akses-grup/akses-grup.service.js";

const PILIH = `select d.id, d.nama, d.keterangan, d.induk_id, i.nama as induk_nama, d.nonaktif,
                      exists (select 1 from jurnal_baris b where b.departemen_id = d.id) as terpakai
                 from departemen d left join departemen i on i.id = d.induk_id`;

const potret = (d) => ({
  Nama: d.nama,
  Keterangan: d.keterangan || "—",
  "Sub departemen dari": d.induk_nama || "—",
  Status: d.nonaktif ? "Nonaktif" : "Aktif",
});

export async function daftarDepartemen({ aktif = false } = {}) {
  const { rows } = await pool.query(`${PILIH} where ($1::boolean is not true or not d.nonaktif) order by lower(d.nama)`, [aktif]);
  return rows;
}

export async function ambilDepartemen(id, db = pool) {
  pastikanId(id, "Departemen tidak ditemukan.");
  const { rows } = await db.query(`${PILIH} where d.id = $1`, [id]);
  if (!rows[0]) throw galat.tidakAda("Departemen tidak ditemukan.");
  return rows[0];
}

async function periksaInduk(k, id, indukId) {
  if (!indukId) return;
  pastikanId(indukId, "Departemen induk tidak ditemukan.");
  if (indukId === id) throw galat.permintaan("Departemen tidak boleh menjadi sub departemen dari dirinya sendiri.");
  const { rows } = await k.query("select id from departemen where id = $1", [indukId]);
  if (!rows[0]) throw galat.permintaan("Departemen induk tidak ditemukan.");
  if (!id) return;
  // Induk tidak boleh salah satu keturunan departemen ini (akan melingkar).
  const { rows: turunan } = await k.query(
    `with recursive t as (select id from departemen where induk_id = $1
                          union all select d.id from departemen d join t on d.induk_id = t.id)
     select 1 from t where id = $2`,
    [id, indukId],
  );
  if (turunan[0]) throw galat.permintaan("Departemen induk tidak boleh salah satu sub departemennya sendiri.");
}

export async function simpanDepartemen(req, id, body) {
  if (id) pastikanId(id, "Departemen tidak ditemukan.");
  return dalamTransaksi(async (k) => {
    const sebelum = id ? await ambilDepartemen(id, k) : null;
    await periksaInduk(k, id, body.induk_id ?? null);
    let simpanId = id;
    try {
      if (id) {
        await k.query("update departemen set nama = $2, keterangan = $3, induk_id = $4, nonaktif = $5, diubah_at = now() where id = $1", [
          id,
          body.nama,
          body.keterangan,
          body.induk_id ?? null,
          body.nonaktif,
        ]);
      } else {
        const { rows } = await k.query("insert into departemen (nama, keterangan, induk_id, nonaktif) values ($1, $2, $3, $4) returning id", [
          body.nama,
          body.keterangan,
          body.induk_id ?? null,
          body.nonaktif,
        ]);
        simpanId = rows[0].id;
      }
    } catch (e) {
      if (e.code === "23505") throw galat.bentrok(`Nama departemen ${body.nama} sudah dipakai. Pakai nama lain.`);
      throw e;
    }
    const sesudah = await ambilDepartemen(simpanId, k);
    await catatLog(k, req, {
      tindakan: id ? "ubah" : "buat",
      menu: "departemen",
      referensi: sesudah.nama,
      sebelum: sebelum ? potret(sebelum) : null,
      sesudah: potret(sesudah),
    });
    return sesudah;
  });
}

export async function hapusDepartemen(req, id) {
  return dalamTransaksi(async (k) => {
    const d = await ambilDepartemen(id, k);
    if (d.terpakai) {
      throw galat.bentrok(`Departemen ${d.nama} sudah dipakai di transaksi, jadi tidak bisa dihapus. Nonaktifkan saja supaya tidak bisa dipilih lagi.`);
    }
    const { rows } = await k.query("select nama from departemen where induk_id = $1 order by nama", [id]);
    if (rows.length) throw galat.bentrok(`Departemen ${d.nama} masih punya sub departemen (${rows.map((r) => r.nama).join(", ")}).`);
    await k.query("delete from departemen where id = $1", [id]);
    await catatLog(k, req, { tindakan: "hapus", menu: "departemen", referensi: d.nama, sebelum: potret(d) });
    return { id };
  });
}
