// Alur unggahan: simpan berkas → AI membaca → rencana → user menyetujui →
// angka disimpan (mengganti data unit+bulan yang sama dalam satu transaksi).
import crypto from "node:crypto";
import { dalamTransaksi, kueri } from "../../shared/db/pool.js";
import { AppError, galat } from "../../shared/http.js";
import { ambilReferensi } from "../referensi/referensi.service.js";
import { bacaDokumen, petakanExcel } from "./ai.js";
import { bacaBukuKerja, ringkasanUntukAi } from "./excel.js";
import { butirDariDokumen, butirDariPetaExcel, susunRencana } from "./rencana.js";

export const BATAS_UKURAN = 4 * 1024 * 1024; // batas Vercel ±4,5 MB per permintaan

// Jenis berkas dikenali dari isi (tanda tangan byte), bukan hanya nama/mime.
export function kenaliBerkas(buf, namaBerkas) {
  const ext = (namaBerkas.split(".").pop() || "").toLowerCase();
  const awal = buf.subarray(0, 12);
  const hex = awal.toString("hex");
  if (hex.startsWith("504b0304") && ext === "xlsx") return { jenis: "excel", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  if (awal.toString("latin1").startsWith("%PDF")) return { jenis: "pdf", mime: "application/pdf" };
  if (hex.startsWith("89504e47")) return { jenis: "gambar", mime: "image/png" };
  if (hex.startsWith("ffd8ff")) return { jenis: "gambar", mime: "image/jpeg" };
  if (awal.toString("latin1", 0, 4) === "RIFF" && awal.toString("latin1", 8, 12) === "WEBP") return { jenis: "gambar", mime: "image/webp" };
  if (ext === "xls") throw galat.permintaan("Format .xls lama belum didukung. Buka di Excel lalu simpan ulang sebagai .xlsx.");
  throw galat.permintaan("Jenis berkas tidak didukung. Gunakan Excel (.xlsx), PDF, atau foto (.png, .jpg, .jpeg, .webp).");
}

const KOLOM_RINGKAS = `
  u.id, u.nama_berkas, u.jenis_berkas, u.mime, u.ukuran, u.status, u.diunggah_at, pu.nama as diunggah_oleh_nama,
  u.dibaca_at, u.sumber_ai, u.pesan_gagal, u.diputuskan_at, pd.nama as diputuskan_oleh_nama,
  coalesce(jsonb_array_length(u.rencana -> 'nilai'), 0)::int as jumlah_nilai,
  (select min(x ->> 'periode') from jsonb_array_elements(coalesce(u.rencana -> 'nilai', '[]'::jsonb)) x) as periode_awal,
  (select max(x ->> 'periode') from jsonb_array_elements(coalesce(u.rencana -> 'nilai', '[]'::jsonb)) x) as periode_akhir`;
const DARI = `from unggahan u join pengguna pu on pu.id = u.diunggah_oleh left join pengguna pd on pd.id = u.diputuskan_oleh`;

export async function simpanUnggahan({ berkas, pengguna }) {
  if (!berkas?.buffer?.length) throw galat.permintaan("Belum ada berkas yang dipilih.");
  const { jenis, mime } = kenaliBerkas(berkas.buffer, berkas.originalname || "berkas");
  const sidik = crypto.createHash("sha256").update(berkas.buffer).digest("hex");
  const nama = namaBerkasUtf8(berkas.originalname || "berkas");

  const { rows: sama } = await kueri(
    `select u.id, u.status, u.nama_berkas, u.diunggah_at from unggahan u
      where u.sidik_sha256 = $1 and u.status <> 'dibatalkan' order by u.diunggah_at desc limit 5`,
    [sidik],
  );
  const id = await dalamTransaksi(async (k) => {
    const { rows } = await k.query(
      `insert into unggahan (nama_berkas, jenis_berkas, mime, ukuran, sidik_sha256, diunggah_oleh)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [nama, jenis, mime, berkas.buffer.length, sidik, pengguna.id],
    );
    await k.query("insert into unggahan_berkas (unggahan_id, isi) values ($1, $2)", [rows[0].id, berkas.buffer]);
    return rows[0].id;
  });
  return { unggahan: await ambilRingkas(id), berkas_sama: sama };
}

export async function ambilRingkas(id) {
  const { rows } = await kueri(`select ${KOLOM_RINGKAS} ${DARI} where u.id = $1::uuid`, [id]).catch(tangkapUuid);
  if (!rows[0]) throw galat.tidakAda("Unggahan tidak ditemukan.");
  return rows[0];
}

export async function ambilLengkap(id) {
  const { rows } = await kueri(`select ${KOLOM_RINGKAS}, u.rencana, u.ringkasan_simpan, u.pemakaian_ai ${DARI} where u.id = $1::uuid`, [id]).catch(tangkapUuid);
  if (!rows[0]) throw galat.tidakAda("Unggahan tidak ditemukan.");
  return rows[0];
}

export async function daftarUnggahan() {
  const { rows } = await kueri(`select ${KOLOM_RINGKAS} ${DARI} order by u.diunggah_at desc limit 100`);
  return rows;
}

/** Angka yang SEKARANG ada di database untuk unit+bulan yang disentuh rencana. */
export async function dataTersimpanUntuk(rencana) {
  const pasangan = [...new Set((rencana?.nilai ?? []).map((n) => `${n.unit_kode}|${n.periode}`))];
  if (!pasangan.length) return [];
  const unit = pasangan.map((p) => p.split("|")[0]);
  const periode = pasangan.map((p) => `${p.split("|")[1]}-01`);
  const { rows } = await kueri(
    `select n.unit_kode, to_char(n.periode, 'YYYY-MM') as periode, n.pos_kode, n.nilai
       from nilai_laporan n
       join unnest($1::text[], $2::date[]) as t(unit_kode, periode) on t.unit_kode = n.unit_kode and t.periode = n.periode
      order by 1, 2, 3`,
    [unit, periode],
  );
  return rows;
}

export async function ambilBerkas(id) {
  const { rows } = await kueri(
    `select u.nama_berkas, u.mime, b.isi from unggahan u join unggahan_berkas b on b.unggahan_id = u.id where u.id = $1::uuid`,
    [id],
  ).catch(tangkapUuid);
  if (!rows[0]) throw galat.tidakAda("Berkas tidak ditemukan.");
  return rows[0];
}

/** Menjalankan AI dan menyimpan rencananya. Bisa diulang selama belum diputuskan. */
export async function bacaUnggahan(id) {
  const { rows } = await kueri(
    `select u.id, u.status, u.jenis_berkas, u.mime, b.isi from unggahan u join unggahan_berkas b on b.unggahan_id = u.id where u.id = $1::uuid`,
    [id],
  ).catch(tangkapUuid);
  const u = rows[0];
  if (!u) throw galat.tidakAda("Unggahan tidak ditemukan.");
  if (!["diunggah", "gagal_dibaca", "menunggu_cek"].includes(u.status)) {
    throw galat.bentrok(`Unggahan ini sudah ${u.status === "disetujui" ? "disetujui" : "dibatalkan"}, jadi tidak bisa dibaca ulang.`);
  }

  const ref = await ambilReferensi();
  let hasilAi;
  let rencana;
  try {
    if (u.jenis_berkas === "excel") {
      const buku = await bacaBukuKerja(u.isi);
      const ringkasan = ringkasanUntukAi(buku);
      hasilAi = await petakanExcel(ringkasan, ref);
      const { butir, diabaikan, peringatan } = butirDariPetaExcel(buku, hasilAi.hasil);
      if (buku.tanpaHasil) peringatan.push(`${buku.tanpaHasil} sel rumus tidak menyimpan hasil (berkas belum pernah disimpan ulang di Excel). Angka di sel itu tidak terbaca; buka berkasnya di Excel, simpan, lalu unggah ulang bila angkanya penting.`);
      rencana = susunRencana({ jenis_berkas: "excel", hasilAi: hasilAi.hasil, butir, diabaikan, peringatan, ref });
    } else {
      hasilAi = await bacaDokumen({ data: u.isi, mime: u.mime }, ref);
      const { butir, diabaikan, peringatan } = butirDariDokumen(hasilAi.hasil);
      peringatan.unshift("Angka pada PDF/foto dibaca oleh AI. Cocokkan setiap angka dengan dokumen aslinya sebelum menyetujui.");
      rencana = susunRencana({ jenis_berkas: u.jenis_berkas, hasilAi: hasilAi.hasil, butir, diabaikan, peringatan, ref });
    }
  } catch (e) {
    const pesan = e.semuaAiGagal
      ? "AI belum bisa membaca berkas ini sekarang (Claude dan cadangan Gemini sama-sama gagal). Coba baca lagi beberapa saat lagi."
      : e.message;
    console.warn(`[baca] unggahan ${id} gagal:`, e.message);
    await kueri(
      `update unggahan set status = 'gagal_dibaca', pesan_gagal = $2, dibaca_at = now() where id = $1`,
      [id, pesan],
    );
    return ambilLengkap(id);
  }

  const bukanLaporan = !rencana.adalah_laporan_keuangan && rencana.nilai.length === 0;
  await kueri(
    `update unggahan set status = $2, pesan_gagal = $3, dibaca_at = now(), sumber_ai = $4,
            pemakaian_ai = $5, hasil_ai = $6, rencana = $7
      where id = $1`,
    [
      id,
      bukanLaporan ? "gagal_dibaca" : "menunggu_cek",
      bukanLaporan ? "Berkas ini tidak terlihat seperti laporan laba rugi, jadi tidak ada angka yang bisa diambil." : null,
      hasilAi.sumber,
      JSON.stringify(hasilAi.pemakaian),
      JSON.stringify(hasilAi.hasil),
      JSON.stringify(rencana),
    ],
  );
  return ambilLengkap(id);
}

/**
 * Menyimpan angka yang sudah dicek user. Data unit+bulan yang disentuh DIGANTI
 * seluruhnya (hapus lalu tulis dalam satu transaksi), jadi unggah ulang tidak
 * pernah membuat data dobel.
 */
export async function setujuiUnggahan(id, nilaiBaru, pengguna) {
  const ref = await ambilReferensi();
  const unitSah = new Set(ref.unit.map((u) => u.kode));
  const posSah = new Set(ref.pos.map((p) => p.kode));
  const kunci = new Set();
  for (const n of nilaiBaru) {
    if (!unitSah.has(n.unit_kode)) throw galat.permintaan(`Unit "${n.unit_kode}" tidak dikenal.`);
    if (!posSah.has(n.pos_kode)) throw galat.permintaan(`Pos "${n.pos_kode}" tidak dikenal.`);
    const k = `${n.unit_kode}|${n.periode}|${n.pos_kode}`;
    if (kunci.has(k)) throw galat.permintaan(`Angka untuk ${k} tercantum dua kali.`);
    kunci.add(k);
  }

  return dalamTransaksi(async (k) => {
    const { rows } = await k.query("select status, rencana from unggahan where id = $1::uuid for update", [id]).catch(tangkapUuid);
    const u = rows[0];
    if (!u) throw galat.tidakAda("Unggahan tidak ditemukan.");
    if (u.status !== "menunggu_cek") throw galat.bentrok("Unggahan ini tidak sedang menunggu dicek (mungkin sudah disetujui atau dibatalkan).");

    // Asal tiap angka dari rencana AI; angka yang diubah user ditandai.
    const asalAi = new Map((u.rencana?.nilai ?? []).map((n) => [`${n.unit_kode}|${n.periode}|${n.pos_kode}`, n]));
    let diubahUser = 0;
    const baris = nilaiBaru.map((n) => {
      const kunciN = `${n.unit_kode}|${n.periode}|${n.pos_kode}`;
      const ai = asalAi.get(kunciN);
      const sumber = [...(ai?.sumber ?? [])];
      if (!ai || ai.nilai !== n.nilai) {
        diubahUser++;
        sumber.push({ label: `Diubah oleh ${pengguna.nama} saat pengecekan${ai ? ` (bacaan AI: ${ai.nilai})` : " (ditambah manual)"}`, letak: "" });
      }
      return { ...n, sumber };
    });

    const pasangan = [...new Set(baris.map((n) => `${n.unit_kode}|${n.periode}`))];
    const pUnit = pasangan.map((p) => p.split("|")[0]);
    const pPeriode = pasangan.map((p) => `${p.split("|")[1]}-01`);

    const { rows: lama } = await k.query(
      `delete from nilai_laporan n using unnest($1::text[], $2::date[]) as t(unit_kode, periode)
        where n.unit_kode = t.unit_kode and n.periode = t.periode
        returning n.unit_kode, to_char(n.periode, 'YYYY-MM') as periode, n.pos_kode, n.nilai, n.unggahan_id`,
      [pUnit, pPeriode],
    );
    if (baris.length) {
      await k.query(
        `insert into nilai_laporan (unit_kode, periode, pos_kode, nilai, sumber, unggahan_id)
         select t.unit_kode, (t.periode || '-01')::date, t.pos_kode, t.nilai, t.sumber, $6
           from unnest($1::text[], $2::text[], $3::text[], $4::numeric[], $5::jsonb[]) as t(unit_kode, periode, pos_kode, nilai, sumber)`,
        [
          baris.map((n) => n.unit_kode),
          baris.map((n) => n.periode),
          baris.map((n) => n.pos_kode),
          baris.map((n) => n.nilai),
          baris.map((n) => JSON.stringify(n.sumber)),
          id,
        ],
      );
    }
    const lamaPer = new Map(lama.map((r) => [`${r.unit_kode}|${r.periode}|${r.pos_kode}`, r.nilai]));
    let diganti = 0;
    let sama = 0;
    for (const n of baris) {
      const k2 = `${n.unit_kode}|${n.periode}|${n.pos_kode}`;
      if (!lamaPer.has(k2)) continue;
      if (lamaPer.get(k2) === n.nilai) sama++;
      else diganti++;
    }
    const dihapus = lama.filter((r) => !kunci.has(`${r.unit_kode}|${r.periode}|${r.pos_kode}`)).length;
    const ringkasan = {
      ditulis: baris.length,
      baru: baris.length - diganti - sama,
      diganti,
      sama,
      dihapus,
      diubah_user: diubahUser,
      unit: [...new Set(pUnit)],
      periode: [...new Set(baris.map((n) => n.periode))].sort(),
      nilai_lama: lama,
    };
    await k.query(
      `update unggahan set status = 'disetujui', diputuskan_oleh = $2, diputuskan_at = now(), ringkasan_simpan = $3 where id = $1`,
      [id, pengguna.id, JSON.stringify(ringkasan)],
    );
    const { nilai_lama: _abaikan, ...tanpaLama } = ringkasan;
    return tanpaLama;
  });
}

export async function batalkanUnggahan(id, pengguna) {
  const { rowCount } = await kueri(
    `update unggahan set status = 'dibatalkan', diputuskan_oleh = $2, diputuskan_at = now()
      where id = $1::uuid and status in ('diunggah', 'menunggu_cek', 'gagal_dibaca')`,
    [id, pengguna.id],
  ).catch(tangkapUuid);
  if (!rowCount) {
    await ambilRingkas(id); // 404 kalau memang tidak ada
    throw galat.bentrok("Unggahan ini sudah diputuskan, jadi tidak bisa dibatalkan.");
  }
  return ambilLengkap(id);
}

// Pengurai multipart kadang membaca nama berkas UTF-8 sebagai latin1
// ("LaporanÃ©.xlsx"). Hanya dikonversi kalau memang terlihat begitu.
function namaBerkasUtf8(nama) {
  if (!/[À-ÿ][\u0080-¿]/.test(nama)) return nama.slice(0, 200);
  const ulang = Buffer.from(nama, "latin1").toString("utf8");
  return (ulang.includes("�") ? nama : ulang).slice(0, 200);
}

function tangkapUuid(e) {
  if (e.code === "22P02") throw new AppError(404, "TIDAK_ADA", "Unggahan tidak ditemukan.");
  throw e;
}
