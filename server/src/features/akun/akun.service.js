// Akun Perkiraan ala Accurate: akun bertingkat (Sub Akun dari), saldo per akun dari jurnal
// yang disetujui (saldo induk = jumlah keturunannya), dan saldo awal yang membuat jurnal
// "Saldo Awal akun X" melawan akun Ekuitas Saldo Awal (diatur di Preferensi).
import { dalamTransaksi, pool } from "../../shared/db/pool.js";
import { AppError, galat } from "../../shared/http.js";
import { catatLog } from "../../shared/log/log.js";
import { dariSen, keSen, rupiahTeks } from "../../shared/uang.js";
import { pastikanId } from "../akses-grup/akses-grup.service.js";
import { pastikanTanggalTerbuka, tanggalSaldoAwal } from "../preferensi/periode.js";
import { namaTipeAkun, saldoNormal, tipeAkun } from "./tipe-akun.js";

const KUERI_AKUN = `
  with recursive leluhur as (
    select id as akun_id, id as leluhur_id from akun
    union all
    select l.akun_id, a.induk_id from leluhur l join akun a on a.id = l.leluhur_id where a.induk_id is not null
  ),
  mutasi as (
    select b.akun_id, sum(b.debit - b.kredit) as dk
      from jurnal_baris b join jurnal j on j.id = b.jurnal_id and j.status = 'disetujui'
     group by b.akun_id
  ),
  saldo as (
    select l.leluhur_id as id, coalesce(sum(m.dk), 0) as dk
      from leluhur l left join mutasi m on m.akun_id = l.akun_id
     group by l.leluhur_id
  )
  select a.id, a.kode, a.nama, a.tipe, a.induk_id, a.catatan, a.nonaktif,
         s.dk::text as saldo_dk,
         exists (select 1 from akun c where c.induk_id = a.id) as punya_anak,
         exists (select 1 from jurnal_baris b join jurnal j on j.id = b.jurnal_id
                  where b.akun_id = a.id and not (j.tipe = 'saldo_awal' and j.akun_lawan_id = a.id)) as terpakai,
         (select (b.debit - b.kredit)::text from jurnal j join jurnal_baris b on b.jurnal_id = j.id and b.akun_id = a.id
           where j.tipe = 'saldo_awal' and j.akun_lawan_id = a.id) as saldo_awal_dk
    from akun a join saldo s on s.id = a.id`;

/** Semua akun berurutan seperti pohon (induk lalu anak-anaknya, per kode), dengan saldo di sisi normal. */
async function muatAkun(db) {
  const { rows } = await db.query(KUERI_AKUN);
  const anak = new Map();
  for (const a of rows) {
    const kunci = a.induk_id ?? "akar";
    if (!anak.has(kunci)) anak.set(kunci, []);
    anak.get(kunci).push(a);
  }
  for (const daftar of anak.values()) daftar.sort((x, y) => x.kode.localeCompare(y.kode, "id", { numeric: true }));
  const induk = new Map(rows.map((a) => [a.id, a]));
  const hasil = [];
  const telusuri = (kunci, tingkat) => {
    for (const a of anak.get(kunci) ?? []) {
      hasil.push({
        id: a.id,
        kode: a.kode,
        nama: a.nama,
        tipe: a.tipe,
        tipe_nama: namaTipeAkun(a.tipe),
        induk_id: a.induk_id,
        induk_nama: a.induk_id ? `${induk.get(a.induk_id)?.kode} ${induk.get(a.induk_id)?.nama}` : null,
        tingkat,
        catatan: a.catatan,
        nonaktif: a.nonaktif,
        punya_anak: a.punya_anak,
        terpakai: a.terpakai,
        saldo: dariSen(saldoNormal(a.tipe, keSen(a.saldo_dk))),
        saldo_awal: a.saldo_awal_dk === null ? null : dariSen(saldoNormal(a.tipe, keSen(a.saldo_awal_dk))),
      });
      telusuri(a.id, tingkat + 1);
    }
  };
  telusuri("akar", 0);
  return hasil;
}

export async function daftarAkun({ tipe, aktif = false, cari = "" } = {}) {
  const semua = await muatAkun(pool);
  const kata = cari.trim().toLowerCase();
  return semua.filter(
    (a) => (!tipe || a.tipe === tipe) && (!aktif || !a.nonaktif) && (!kata || `${a.kode} ${a.nama}`.toLowerCase().includes(kata)),
  );
}

export async function ambilAkun(id, db = pool) {
  pastikanId(id, "Akun tidak ditemukan.");
  const a = (await muatAkun(db)).find((x) => x.id === id);
  if (!a) throw galat.tidakAda("Akun tidak ditemukan.");
  return a;
}

const potret = (a) => ({
  Kode: a.kode,
  Nama: a.nama,
  "Tipe akun": a.tipe_nama,
  "Sub akun dari": a.induk_nama || "—",
  "Saldo awal": a.saldo_awal === null ? "—" : rupiahTeks(a.saldo_awal),
  Catatan: a.catatan || "—",
  Status: a.nonaktif ? "Nonaktif" : "Aktif",
});

async function dipasangDiPreferensi(k, id) {
  const { rows } = await k.query("select 1 from perusahaan where akun_ekuitas_saldo_awal_id = $1 or akun_laba_ditahan_id = $1", [id]);
  return rows.length > 0;
}

async function periksaInduk(k, id, indukId, tipe) {
  if (!indukId) return;
  pastikanId(indukId, "Akun induk tidak ditemukan.");
  if (indukId === id) throw galat.permintaan("Akun tidak boleh menjadi sub akun dari dirinya sendiri.");
  const { rows } = await k.query("select id, kode, nama, tipe from akun where id = $1", [indukId]);
  const induk = rows[0];
  if (!induk) throw galat.permintaan("Akun induk tidak ditemukan.");
  if (induk.tipe !== tipe) {
    throw galat.permintaan(`Sub akun harus bertipe sama dengan induknya (${namaTipeAkun(induk.tipe)}).`);
  }
  if (id) {
    const { rows: turunan } = await k.query(
      `with recursive t as (select id from akun where induk_id = $1 union all select a.id from akun a join t on a.induk_id = t.id)
       select 1 from t where id = $2`,
      [id, indukId],
    );
    if (turunan[0]) throw galat.permintaan("Akun induk tidak boleh salah satu sub akunnya sendiri.");
  }
  const { rows: dipakai } = await k.query("select 1 from jurnal_baris where akun_id = $1 limit 1", [indukId]);
  if (dipakai[0]) {
    throw galat.bentrok(`Akun ${induk.kode} ${induk.nama} sudah dipakai di transaksi atau punya saldo awal, jadi tidak bisa dijadikan induk.`);
  }
}

/** Menulis, mengganti, atau menghapus jurnal saldo awal sebuah akun. */
async function aturSaldoAwal(k, req, akun, sen, senLama) {
  const { rows: ada } = await k.query("select id from jurnal where tipe = 'saldo_awal' and akun_lawan_id = $1", [akun.id]);
  const jurnalLama = ada[0]?.id;
  if (sen === 0n && !jurnalLama) return;
  const tanggal = await tanggalSaldoAwal(k);
  if (sen !== senLama) await pastikanTanggalTerbuka(k, tanggal, { saldoAwal: true });
  if (sen === 0n) {
    await k.query("delete from jurnal where id = $1", [jurnalLama]);
    return;
  }
  const { rows: pref } = await k.query("select akun_ekuitas_saldo_awal_id as id from perusahaan");
  const ekuitas = pref[0].id;
  if (!ekuitas) {
    throw new AppError(409, "AKUN_PREFERENSI_KOSONG", "Akun Ekuitas Saldo Awal belum diatur. Atur dulu di Pengaturan, menu Preferensi.");
  }
  if (ekuitas === akun.id) {
    throw galat.permintaan("Akun Ekuitas Saldo Awal tidak bisa diberi saldo awal; ia otomatis menjadi lawan saldo awal akun lain.");
  }
  const akunDiDebit = (tipeAkun(akun.tipe).normal === "debit") === sen > 0n;
  const nilai = dariSen(sen < 0n ? -sen : sen);
  const kepala = [`SA.${akun.kode}`, tanggal, `Saldo Awal akun ${akun.nama}`, nilai, req.pengguna.id];
  let jurnalId = jurnalLama;
  if (jurnalId) {
    await k.query(
      "update jurnal set nomor = $2, tanggal = $3, keterangan = $4, total = $5, diubah_oleh = $6, diubah_at = now() where id = $1",
      [jurnalId, ...kepala],
    );
    await k.query("delete from jurnal_baris where jurnal_id = $1", [jurnalId]);
  } else {
    const { rows } = await k.query(
      `insert into jurnal (tipe, nomor, tanggal, keterangan, total, status, akun_lawan_id, dibuat_oleh, diubah_oleh)
       values ('saldo_awal', $1, $2, $3, $4, 'disetujui', $6, $5, $5) returning id`,
      [...kepala, akun.id],
    );
    jurnalId = rows[0].id;
  }
  const baris = "insert into jurnal_baris (jurnal_id, urutan, akun_id, debit, kredit) values ($1, $2, $3, $4, $5)";
  await k.query(baris, [jurnalId, 1, akun.id, akunDiDebit ? nilai : 0, akunDiDebit ? 0 : nilai]);
  await k.query(baris, [jurnalId, 2, ekuitas, akunDiDebit ? 0 : nilai, akunDiDebit ? nilai : 0]);
}

export async function simpanAkun(req, id, body) {
  if (id) pastikanId(id, "Akun tidak ditemukan.");
  return dalamTransaksi(async (k) => {
    const sebelum = id ? await ambilAkun(id, k) : null;
    await periksaInduk(k, id, body.induk_id, body.tipe);
    const sen = keSen(body.saldo_awal);
    if (sebelum) {
      if (sebelum.tipe !== body.tipe) {
        if (sebelum.terpakai || sebelum.saldo_awal !== null) {
          throw galat.bentrok(`Tipe akun ${sebelum.kode} ${sebelum.nama} tidak bisa diganti karena sudah dipakai di transaksi atau punya saldo awal.`);
        }
        if (sebelum.punya_anak) throw galat.bentrok(`Akun ${sebelum.kode} ${sebelum.nama} punya sub akun; ganti dulu tipe sub akunnya.`);
      }
      if (sebelum.punya_anak && sen !== 0n) {
        throw galat.permintaan("Akun induk tidak bisa diberi saldo awal. Isi saldo awal di sub akunnya.");
      }
      if (body.nonaktif && !sebelum.nonaktif && (await dipasangDiPreferensi(k, id))) {
        throw galat.bentrok(`Akun ${sebelum.kode} ${sebelum.nama} dipakai di Preferensi, jadi tidak bisa dinonaktifkan.`);
      }
    }
    let akunId = id;
    try {
      if (id) {
        await k.query(
          "update akun set kode = $2, nama = $3, tipe = $4, induk_id = $5, catatan = $6, nonaktif = $7, diubah_at = now() where id = $1",
          [id, body.kode, body.nama, body.tipe, body.induk_id, body.catatan, body.nonaktif],
        );
      } else {
        const { rows } = await k.query(
          "insert into akun (kode, nama, tipe, induk_id, catatan, nonaktif) values ($1, $2, $3, $4, $5, $6) returning id",
          [body.kode, body.nama, body.tipe, body.induk_id, body.catatan, body.nonaktif],
        );
        akunId = rows[0].id;
      }
    } catch (e) {
      if (e.code === "23505") throw galat.bentrok(`Kode ${body.kode} sudah dipakai akun lain.`);
      throw e;
    }
    const senLama = sebelum?.saldo_awal ? keSen(sebelum.saldo_awal) : 0n;
    await aturSaldoAwal(k, req, { id: akunId, kode: body.kode, nama: body.nama, tipe: body.tipe }, sen, senLama);
    const sesudah = await ambilAkun(akunId, k);
    await catatLog(k, req, {
      tindakan: id ? "ubah" : "buat",
      menu: "akun_perkiraan",
      referensi: `${sesudah.kode} ${sesudah.nama}`,
      sebelum: sebelum ? potret(sebelum) : null,
      sesudah: potret(sesudah),
    });
    return sesudah;
  });
}

export async function hapusAkun(req, id) {
  return dalamTransaksi(async (k) => {
    const a = await ambilAkun(id, k);
    if (a.punya_anak) throw galat.bentrok(`Akun ${a.kode} ${a.nama} masih punya sub akun, jadi tidak bisa dihapus.`);
    if (await dipasangDiPreferensi(k, id)) {
      throw galat.bentrok(`Akun ${a.kode} ${a.nama} dipakai di Preferensi (Ekuitas Saldo Awal atau Laba Ditahan), jadi tidak bisa dihapus.`);
    }
    if (a.terpakai || a.saldo_awal !== null) {
      throw galat.bentrok(`Akun ${a.kode} ${a.nama} sudah dipakai di transaksi atau punya saldo awal, jadi tidak bisa dihapus. Nonaktifkan saja supaya tidak bisa dipilih lagi.`);
    }
    await k.query("delete from akun where id = $1", [id]);
    await catatLog(k, req, { tindakan: "hapus", menu: "akun_perkiraan", referensi: `${a.kode} ${a.nama}`, sebelum: potret(a) });
    return { id };
  });
}
