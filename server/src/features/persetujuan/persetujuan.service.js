// Penyetuju Transaksi ala Accurate: aturan per tipe transaksi. Transaksi yang kena
// aturan berstatus "diajukan" (tanpa nomor, belum masuk laporan) sampai disetujui.
import { dalamTransaksi, pool } from "../../shared/db/pool.js";
import { galat } from "../../shared/http.js";
import { catatLog } from "../../shared/log/log.js";
import { keSen, rupiahTeks } from "../../shared/uang.js";
import { TIPE_TRANSAKSI, namaTipe } from "../penomoran/tipe-transaksi.js";
import { boleh, muatHak } from "../../shared/akses/hak.js";

/** Apakah transaksi bertipe ini dengan total `totalSen` (BigInt) harus disetujui dulu? */
export async function nilaiAturan(k, tipe, totalSen) {
  const { rows } = await k.query(
    `select a.aktif, a.nilai_minimal::text as nilai_minimal,
            (select count(*)::int from penyetuju_transaksi_pengguna p where p.tipe_transaksi = a.tipe_transaksi) as jumlah_penyetuju
       from penyetuju_transaksi a where a.tipe_transaksi = $1`,
    [tipe],
  );
  const aturan = rows[0];
  if (!aturan?.aktif || !aturan.jumlah_penyetuju) return { perluPersetujuan: false };
  const batas = aturan.nilai_minimal === null ? 0n : keSen(aturan.nilai_minimal);
  return { perluPersetujuan: totalSen >= batas };
}

// ── Aturan (Pengaturan › Penyetuju Transaksi, khusus Administrator) ─────────

export async function daftarAturan(db = pool) {
  const { rows } = await db.query(
    `select a.tipe_transaksi, a.aktif, a.nilai_minimal::text as nilai_minimal,
            coalesce(json_agg(json_build_object('id', p.id, 'nama', p.nama, 'email', p.email) order by p.nama)
                     filter (where p.id is not null), '[]') as penyetuju
       from penyetuju_transaksi a
       left join penyetuju_transaksi_pengguna x on x.tipe_transaksi = a.tipe_transaksi
       left join pengguna p on p.id = x.pengguna_id
      group by a.tipe_transaksi`,
  );
  const peta = new Map(rows.map((r) => [r.tipe_transaksi, r]));
  return TIPE_TRANSAKSI.map((t) => {
    const r = peta.get(t.kode);
    return { tipe_transaksi: t.kode, nama: t.nama, aktif: r?.aktif ?? false, nilai_minimal: r?.nilai_minimal ?? null, penyetuju: r?.penyetuju ?? [] };
  });
}

const potretAturan = (a) => ({
  "Tipe transaksi": namaTipe(a.tipe_transaksi),
  "Perlu persetujuan": a.aktif ? "Ya" : "Tidak",
  "Nilai minimal": a.nilai_minimal === null ? "Semua nilai" : rupiahTeks(a.nilai_minimal),
  Penyetuju: a.penyetuju.length ? a.penyetuju.map((p) => p.nama).join(", ") : "—",
});

export async function simpanAturan(req, tipe, body) {
  if (!TIPE_TRANSAKSI.some((t) => t.kode === tipe)) throw galat.tidakAda("Tipe transaksi tidak dikenal.");
  const penyetuju = [...new Set(body.penyetuju)];
  if (body.aktif && !penyetuju.length) throw galat.permintaan("Pilih paling sedikit satu penyetuju.");
  return dalamTransaksi(async (k) => {
    if (penyetuju.length) {
      const { rows } = await k.query("select id, nama, peran, akses_grup_id from pengguna where id = any($1::uuid[]) and aktif", [penyetuju]);
      if (rows.length !== penyetuju.length) throw galat.permintaan("Ada penyetuju yang tidak ditemukan atau akunnya nonaktif.");
      // Penyetuju tanpa hak Lihat Persetujuan tidak pernah melihat antreannya, jadi transaksi akan menunggu selamanya.
      for (const p of rows) {
        if (!boleh(await muatHak(p), "persetujuan", "lihat")) {
          throw galat.permintaan(
            `${p.nama} belum punya hak Lihat di menu Persetujuan, jadi tidak akan melihat transaksi yang menunggu. Tambahkan dulu lewat Pengaturan, menu Akses Grup.`,
          );
        }
      }
    }
    const sebelum = (await daftarAturan(k)).find((a) => a.tipe_transaksi === tipe);
    await k.query(
      `insert into penyetuju_transaksi (tipe_transaksi, aktif, nilai_minimal, diubah_oleh) values ($1, $2, $3, $4)
       on conflict (tipe_transaksi) do update set aktif = excluded.aktif, nilai_minimal = excluded.nilai_minimal,
                                                diubah_oleh = excluded.diubah_oleh, diubah_at = now()`,
      [tipe, body.aktif, body.nilai_minimal, req.pengguna.id],
    );
    await k.query("delete from penyetuju_transaksi_pengguna where tipe_transaksi = $1", [tipe]);
    for (const id of penyetuju) {
      await k.query("insert into penyetuju_transaksi_pengguna (tipe_transaksi, pengguna_id) values ($1, $2)", [tipe, id]);
    }
    const sesudah = (await daftarAturan(k)).find((a) => a.tipe_transaksi === tipe);
    await catatLog(k, req, {
      tindakan: "ubah",
      menu: "penyetuju_transaksi",
      referensi: namaTipe(tipe),
      sebelum: potretAturan(sebelum),
      sesudah: potretAturan(sesudah),
    });
    return sesudah;
  });
}

