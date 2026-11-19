// Akses Grup: kumpulan hak per menu untuk Operator (Administrator selalu boleh semua).
import { dalamTransaksi, pool } from "../../shared/db/pool.js";
import { galat } from "../../shared/http.js";
import { catatLog } from "../../shared/log/log.js";
import { AKSI, NAMA_AKSI } from "../../shared/akses/hak.js";
import { aksiMenu, cariMenu, menuMatriks } from "../../shared/akses/menu.js";

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const pastikanId = (id, pesan) => {
  if (!POLA_UUID.test(String(id))) throw galat.tidakAda(pesan);
};

/** Mengecek dan merapikan hak kiriman browser: Buat/Ubah/Hapus otomatis menyalakan Lihat. */
export function rapikanHak(hak) {
  const hasil = {};
  for (const [kode, centang] of Object.entries(hak ?? {})) {
    const menu = cariMenu(kode);
    if (!menu) throw galat.permintaan(`Menu ${kode} tidak dikenal.`);
    if (menu.modul.khususAdministrator) {
      throw galat.permintaan(`Menu ${menu.nama} khusus Administrator dan tidak bisa diatur lewat akses grup.`);
    }
    const dimiliki = aksiMenu(menu);
    for (const a of AKSI) {
      if (centang[a] && !dimiliki.includes(a)) {
        throw galat.permintaan(`Menu ${menu.nama} hanya punya hak ${dimiliki.map((x) => NAMA_AKSI[x]).join(", ")}.`);
      }
    }
    const baris = Object.fromEntries(AKSI.map((a) => [a, Boolean(centang[a])]));
    baris.lihat ||= baris.buat || baris.ubah || baris.hapus;
    if (AKSI.some((a) => baris[a])) hasil[kode] = baris;
  }
  return hasil;
}

function potret(grup, namaAnggota, hak) {
  const isi = {
    "Nama grup": grup.nama,
    Keterangan: grup.keterangan || "—",
    Anggota: namaAnggota.length ? namaAnggota.join(", ") : "—",
  };
  for (const modul of menuMatriks()) {
    for (const menu of modul.menu) {
      const h = hak[menu.kode];
      if (!h) continue;
      isi[`Hak — ${menu.nama}`] = AKSI.filter((a) => h[a]).map((a) => NAMA_AKSI[a]).join(", ");
    }
  }
  return isi;
}

export async function daftarGrup() {
  const { rows } = await pool.query(
    `select g.id, g.nama, g.keterangan, count(p.id)::int as jumlah_anggota
       from akses_grup g left join pengguna p on p.akses_grup_id = g.id
      group by g.id order by lower(g.nama)`,
  );
  return rows;
}

export async function ambilGrup(id, db = pool) {
  pastikanId(id, "Akses grup tidak ditemukan.");
  const { rows } = await db.query("select id, nama, keterangan from akses_grup where id = $1", [id]);
  if (!rows[0]) throw galat.tidakAda("Akses grup tidak ditemukan.");
  const [anggota, hak] = await Promise.all([
    db.query("select id, nama, email from pengguna where akses_grup_id = $1 order by nama", [id]),
    db.query("select menu_kode, lihat, buat, ubah, hapus from akses_grup_hak where grup_id = $1", [id]),
  ]);
  return {
    ...rows[0],
    anggota: anggota.rows,
    hak: Object.fromEntries(hak.rows.map(({ menu_kode, ...h }) => [menu_kode, h])),
  };
}

async function periksaAnggota(k, anggota) {
  if (!anggota.length) return [];
  const { rows } = await k.query("select id, nama, peran from pengguna where id = any($1::uuid[])", [anggota]);
  if (rows.length !== new Set(anggota).size) throw galat.permintaan("Ada anggota yang tidak dikenal.");
  const admin = rows.find((r) => r.peran === "admin");
  if (admin) {
    throw galat.permintaan(`${admin.nama} adalah Administrator dan sudah bisa membuka semua menu, jadi tidak perlu akses grup.`);
  }
  return rows;
}

/** Membuat (id = null) atau mengubah akses grup, beserta hak dan anggotanya, dalam satu transaksi. */
export async function simpanGrup(req, id, { nama, keterangan, anggota, hak }) {
  if (id) pastikanId(id, "Akses grup tidak ditemukan.");
  const hakRapi = rapikanHak(hak);
  return dalamTransaksi(async (k) => {
    const sebelum = id ? await ambilGrup(id, k) : null;
    await periksaAnggota(k, anggota);
    let grupId = id;
    try {
      if (id) {
        await k.query("update akses_grup set nama = $2, keterangan = $3, diubah_at = now() where id = $1", [id, nama, keterangan]);
      } else {
        const { rows } = await k.query("insert into akses_grup (nama, keterangan) values ($1, $2) returning id", [nama, keterangan]);
        grupId = rows[0].id;
      }
    } catch (e) {
      if (e.code === "23505") throw galat.bentrok("Nama akses grup itu sudah dipakai.");
      throw e;
    }
    await k.query("delete from akses_grup_hak where grup_id = $1", [grupId]);
    for (const [menuKode, h] of Object.entries(hakRapi)) {
      await k.query(
        "insert into akses_grup_hak (grup_id, menu_kode, lihat, buat, ubah, hapus) values ($1, $2, $3, $4, $5, $6)",
        [grupId, menuKode, h.lihat, h.buat, h.ubah, h.hapus],
      );
    }
    await k.query("update pengguna set akses_grup_id = null where akses_grup_id = $1 and not (id = any($2::uuid[]))", [grupId, anggota]);
    await k.query("update pengguna set akses_grup_id = $1 where id = any($2::uuid[])", [grupId, anggota]);

    const sesudah = await ambilGrup(grupId, k);
    await catatLog(k, req, {
      tindakan: id ? "ubah" : "buat",
      menu: "akses_grup",
      referensi: sesudah.nama,
      sebelum: sebelum && potret(sebelum, sebelum.anggota.map((a) => a.nama), sebelum.hak),
      sesudah: potret(sesudah, sesudah.anggota.map((a) => a.nama), sesudah.hak),
    });
    return sesudah;
  });
}

export async function hapusGrup(req, id) {
  return dalamTransaksi(async (k) => {
    const grup = await ambilGrup(id, k);
    if (grup.anggota.length) {
      throw galat.bentrok(`Akses grup ini masih dipakai ${grup.anggota.length} pengguna. Pindahkan mereka ke grup lain dulu.`);
    }
    await k.query("delete from akses_grup where id = $1", [id]);
    await catatLog(k, req, { tindakan: "hapus", menu: "akses_grup", referensi: grup.nama, sebelum: potret(grup, [], grup.hak) });
    return { id };
  });
}
