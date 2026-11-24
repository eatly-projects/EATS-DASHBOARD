// Laporan keuangan ala Accurate, semuanya dihitung dari jurnal_baris milik jurnal
// berstatus 'disetujui' (yang menunggu persetujuan atau ditolak tidak dihitung).
// Uang dihitung dalam sen (BigInt) dan dikirim sebagai teks desimal.
import { pool } from "../../shared/db/pool.js";
import { galat } from "../../shared/http.js";
import { dariSen, keSen } from "../../shared/uang.js";
import { bulanTahun } from "../../shared/format.js";
import { TIPE_LABA_RUGI, namaTipeAkun, saldoNormal, tipeAkun } from "../akun/tipe-akun.js";
import { NAMA_TIPE_JURNAL } from "../jurnal/jurnal.service.js";

const NOL = 0n;
const TOTAL = "total";
const TANPA_DEP = "tanpa_departemen";

const DISETUJUI = "join jurnal j on j.id = b.jurnal_id and j.status = 'disetujui'";

async function muatAkunDetail() {
  const { rows } = await pool.query(
    `select a.id, a.kode, a.nama, a.tipe from akun a
      where not exists (select 1 from akun c where c.induk_id = a.id)
      order by a.kode`,
  );
  return rows;
}

export async function infoPerusahaan() {
  const { rows } = await pool.query(
    "select nama, to_char(mulai_periode, 'YYYY-MM-DD') as mulai_periode, akun_laba_ditahan_id from perusahaan",
  );
  return rows[0];
}

export function periksaRentang(dari, sampai) {
  if (dari > sampai) throw galat.permintaan("Tanggal awal tidak boleh sesudah tanggal akhir.");
}

const tambahNilai = (peta, kunci, sen) => peta.set(kunci, (peta.get(kunci) ?? NOL) + sen);
const keTeks = (peta) => Object.fromEntries([...peta].map(([k, v]) => [k, dariSen(v)]));

// ── Laba/Rugi (Standar) ───────────────────────────────────────────────────
const BAGIAN_LR = [
  { kunci: "pendapatan", judul: "Pendapatan", tipe: ["pendapatan"], judulTotal: "Jumlah Pendapatan" },
  { kunci: "beban_pokok", judul: "Beban Pokok Penjualan", tipe: ["beban_pokok_penjualan"], judulTotal: "Jumlah Beban Pokok Penjualan" },
  { kunci: "beban", judul: "Beban Operasional", tipe: ["beban"], judulTotal: "Jumlah Beban Operasional" },
  { kunci: "pendapatan_lainnya", judul: "Pendapatan Lainnya", tipe: ["pendapatan_lainnya"], judulTotal: "Jumlah Pendapatan Lainnya" },
  { kunci: "beban_lainnya", judul: "Beban Lainnya", tipe: ["beban_lainnya"], judulTotal: "Jumlah Beban Lainnya" },
];

export async function labaRugi({ dari, sampai, perDepartemen = false }) {
  periksaRentang(dari, sampai);
  const akun = await muatAkunDetail();
  const { rows } = await pool.query(
    `select b.akun_id, b.departemen_id, d.nama as departemen_nama, sum(b.debit - b.kredit)::text as dk
       from jurnal_baris b ${DISETUJUI} left join departemen d on d.id = b.departemen_id
      where j.tanggal between $1 and $2
      group by b.akun_id, b.departemen_id, d.nama`,
    [dari, sampai],
  );
  const petaAkun = new Map(akun.map((a) => [a.id, a]));
  // nilai[akun_id] = Map(kolom → sen di sisi normal akun)
  const nilai = new Map();
  const departemen = new Map();
  for (const r of rows) {
    const a = petaAkun.get(r.akun_id);
    if (!a || !TIPE_LABA_RUGI.includes(a.tipe)) continue;
    const sen = saldoNormal(a.tipe, keSen(r.dk));
    if (!nilai.has(a.id)) nilai.set(a.id, new Map());
    const m = nilai.get(a.id);
    tambahNilai(m, TOTAL, sen);
    if (perDepartemen) {
      const kolom = r.departemen_id ?? TANPA_DEP;
      if (r.departemen_id) departemen.set(r.departemen_id, r.departemen_nama);
      else departemen.set(TANPA_DEP, "Tanpa Departemen");
      tambahNilai(m, kolom, sen);
    }
  }
  const kolom = perDepartemen
    ? [
        ...[...departemen].filter(([k]) => k !== TANPA_DEP).sort((x, y) => x[1].localeCompare(y[1], "id")).map(([kunci, nama]) => ({ kunci, nama })),
        ...(departemen.has(TANPA_DEP) ? [{ kunci: TANPA_DEP, nama: "Tanpa Departemen" }] : []),
        { kunci: TOTAL, nama: "Total" },
      ]
    : [{ kunci: TOTAL, nama: "Total" }];

  const totalBagian = {};
  const bagian = BAGIAN_LR.map((b) => {
    const total = new Map(kolom.map((k) => [k.kunci, NOL]));
    const baris = akun
      .filter((a) => b.tipe.includes(a.tipe) && nilai.has(a.id))
      .map((a) => {
        const m = nilai.get(a.id);
        for (const k of kolom) tambahNilai(total, k.kunci, m.get(k.kunci) ?? NOL);
        return { akun_id: a.id, kode: a.kode, nama: a.nama, nilai: Object.fromEntries(kolom.map((k) => [k.kunci, dariSen(m.get(k.kunci) ?? NOL)])) };
      });
    totalBagian[b.kunci] = total;
    return { jenis: "bagian", kunci: b.kunci, judul: b.judul, judul_total: b.judulTotal, baris, total: keTeks(total) };
  });

  const hitung = (rumus) => new Map(kolom.map((k) => [k.kunci, rumus((x) => totalBagian[x].get(k.kunci) ?? NOL)]));
  const labaKotor = hitung((t) => t("pendapatan") - t("beban_pokok"));
  const labaOperasional = hitung((t) => t("pendapatan") - t("beban_pokok") - t("beban"));
  const labaBersih = hitung((t) => t("pendapatan") - t("beban_pokok") - t("beban") + t("pendapatan_lainnya") - t("beban_lainnya"));
  const ringkasan = { laba_kotor: keTeks(labaKotor), laba_operasional: keTeks(labaOperasional), laba_bersih: keTeks(labaBersih) };

  const susunan = [
    bagian[0],
    bagian[1],
    { jenis: "ringkasan", kunci: "laba_kotor", judul: "LABA KOTOR", nilai: ringkasan.laba_kotor },
    bagian[2],
    { jenis: "ringkasan", kunci: "laba_operasional", judul: "PENDAPATAN OPERASIONAL", nilai: ringkasan.laba_operasional },
    bagian[3],
    bagian[4],
    { jenis: "ringkasan", kunci: "laba_bersih", judul: "LABA BERSIH", nilai: ringkasan.laba_bersih },
  ];
  return { judul: perDepartemen ? "Laba/Rugi per Lini Bisnis" : "Laba/Rugi (Standar)", dari, sampai, kolom, bagian: susunan, ringkasan };
}

/** Laba rugi (sen, BigInt) semua jurnal disetujui di antara dua tanggal (inklusif). */
async function labaBersihAntara(dari, sampai) {
  const { rows } = await pool.query(
    `select a.tipe, sum(b.debit - b.kredit)::text as dk
       from jurnal_baris b ${DISETUJUI} join akun a on a.id = b.akun_id
      where j.tanggal between $1 and $2 and a.tipe = any($3::text[])
      group by a.tipe`,
    [dari, sampai, TIPE_LABA_RUGI],
  );
  // Pendapatan (kredit) menambah laba, beban (debit) mengurangi: laba = −(debit − kredit).
  return rows.reduce((s, r) => s - keSen(r.dk), NOL);
}

// ── Neraca (Standar) ──────────────────────────────────────────────────────
const KELOMPOK_NERACA = [
  {
    kunci: "aset",
    judul: "ASET",
    judulTotal: "JUMLAH ASET",
    sub: [
      { judul: "Aset Lancar", judulTotal: "Jumlah Aset Lancar", tipe: ["kas_bank", "piutang_usaha", "persediaan", "aset_lancar_lainnya"] },
      { judul: "Aset Tidak Lancar", judulTotal: "Jumlah Aset Tidak Lancar", tipe: ["aset_tetap", "akumulasi_penyusutan"] },
      { judul: "Aset Lainnya", judulTotal: "Jumlah Aset Lainnya", tipe: ["aset_lainnya"] },
    ],
  },
  {
    kunci: "liabilitas",
    judul: "LIABILITAS",
    judulTotal: "JUMLAH LIABILITAS",
    sub: [
      { judul: "Liabilitas Jangka Pendek", judulTotal: "Jumlah Liabilitas Jangka Pendek", tipe: ["utang_usaha", "liabilitas_jangka_pendek"] },
      { judul: "Liabilitas Jangka Panjang", judulTotal: "Jumlah Liabilitas Jangka Panjang", tipe: ["liabilitas_jangka_panjang"] },
    ],
  },
  { kunci: "ekuitas", judul: "EKUITAS", judulTotal: "JUMLAH EKUITAS", sub: [{ judul: "Modal", judulTotal: "Jumlah Modal", tipe: ["modal"] }] },
];

export async function neraca({ per }) {
  const [akun, info] = await Promise.all([muatAkunDetail(), infoPerusahaan()]);
  const { rows } = await pool.query(
    `select b.akun_id, sum(b.debit - b.kredit)::text as dk from jurnal_baris b ${DISETUJUI} where j.tanggal <= $1 group by b.akun_id`,
    [per],
  );
  const dk = new Map(rows.map((r) => [r.akun_id, keSen(r.dk)]));
  const awalTahun = `${per.slice(0, 4)}-01-01`;
  const labaTahunIni = await labaBersihAntara(awalTahun, per);
  const labaLalu = await labaBersihAntara("0001-01-01", sehariSebelum(awalTahun));

  let labaDitahanTampil = false;
  const bagian = [];
  const totalKelompok = {};
  for (const k of KELOMPOK_NERACA) {
    let totalK = NOL;
    const sub = k.sub.map((s) => {
      // Aset ditampilkan debit − kredit (akumulasi penyusutan jadi pengurang); liabilitas & ekuitas kredit − debit.
      const tanda = k.kunci === "aset" ? 1n : -1n;
      let totalS = NOL;
      const baris = [];
      for (const a of akun.filter((x) => s.tipe.includes(x.tipe))) {
        let sen = tanda * (dk.get(a.id) ?? NOL);
        if (a.id === info.akun_laba_ditahan_id) {
          sen += labaLalu;
          labaDitahanTampil = true;
        }
        if (sen === NOL && !dk.has(a.id)) continue;
        totalS += sen;
        baris.push({ akun_id: a.id, kode: a.kode, nama: a.nama, tipe_nama: namaTipeAkun(a.tipe), nilai: dariSen(sen) });
      }
      if (k.kunci === "ekuitas") {
        if (!labaDitahanTampil && labaLalu !== NOL) {
          baris.push({ akun_id: null, kode: "", nama: "Laba Ditahan (dihitung)", nilai: dariSen(labaLalu) });
          totalS += labaLalu;
        }
        baris.push({ akun_id: null, kode: "", nama: "Laba Tahun Ini", nilai: dariSen(labaTahunIni), dihitung: true });
        totalS += labaTahunIni;
      }
      totalK += totalS;
      return { judul: s.judul, judul_total: s.judulTotal, baris, total: dariSen(totalS) };
    });
    totalKelompok[k.kunci] = totalK;
    bagian.push({ kunci: k.kunci, judul: k.judul, judul_total: k.judulTotal, sub, total: dariSen(totalK), baris: sub.flatMap((s) => s.baris) });
  }
  const pasiva = totalKelompok.liabilitas + totalKelompok.ekuitas;
  const labaDitahanAkun = info.akun_laba_ditahan_id ? -(dk.get(info.akun_laba_ditahan_id) ?? NOL) : NOL;
  return {
    judul: "Neraca (Standar)",
    per,
    bagian,
    jumlah_liabilitas_ekuitas: dariSen(pasiva),
    seimbang: totalKelompok.aset === pasiva,
    laba_tahun_ini: dariSen(labaTahunIni),
    laba_ditahan: dariSen(labaDitahanAkun + labaLalu),
  };
}

function sehariSebelum(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Neraca Percobaan ──────────────────────────────────────────────────────
/**
 * Akun pendapatan dan beban mulai dari nol setiap 1 Januari (tahun buku Januari–Desember);
 * laba rugi tahun-tahun sebelumnya pindah ke akun Laba Ditahan, seperti tutup buku.
 * Mengembalikan saldo awal (debit − kredit, sen) per akun sebelum `dari`.
 */
async function saldoAwalTahunan(dari, akunIds = null) {
  const awalTahun = `${dari.slice(0, 4)}-01-01`;
  const { rows } = await pool.query(
    `select b.akun_id, sum(b.debit - b.kredit)::text as dk
       from jurnal_baris b ${DISETUJUI} join akun a on a.id = b.akun_id
      where j.tanggal < $1 and (a.tipe <> all($2::text[]) or j.tanggal >= $3)
        and ($4::uuid[] is null or b.akun_id = any($4::uuid[]))
      group by b.akun_id`,
    [dari, TIPE_LABA_RUGI, awalTahun, akunIds],
  );
  const awal = new Map(rows.map((r) => [r.akun_id, keSen(r.dk)]));
  const info = await infoPerusahaan();
  const ld = info.akun_laba_ditahan_id;
  if (ld && (!akunIds || akunIds.includes(ld))) {
    const labaLalu = await labaBersihAntara("0001-01-01", sehariSebelum(awalTahun));
    // Laba (kredit) mengurangi debit − kredit akun Laba Ditahan.
    if (labaLalu !== NOL) awal.set(ld, (awal.get(ld) ?? NOL) - labaLalu);
  }
  return awal;
}

export async function neracaPercobaan({ dari, sampai }) {
  periksaRentang(dari, sampai);
  const akun = await muatAkunDetail();
  const { rows } = await pool.query(
    `select b.akun_id,
            coalesce(sum(b.debit) filter (where j.tanggal between $1 and $2), 0)::text as debit,
            coalesce(sum(b.kredit) filter (where j.tanggal between $1 and $2), 0)::text as kredit
       from jurnal_baris b ${DISETUJUI} where j.tanggal between $1 and $2 group by b.akun_id`,
    [dari, sampai],
  );
  const awalPeta = await saldoAwalTahunan(dari);
  const peta = new Map(rows.map((r) => [r.akun_id, r]));
  const total = { debit: NOL, kredit: NOL };
  const baris = [];
  for (const a of akun) {
    const r = peta.get(a.id) ?? (awalPeta.get(a.id) ? { debit: "0", kredit: "0" } : null);
    if (!r) continue;
    const awal = awalPeta.get(a.id) ?? NOL;
    const debit = keSen(r.debit);
    const kredit = keSen(r.kredit);
    total.debit += debit;
    total.kredit += kredit;
    baris.push({
      akun_id: a.id,
      kode: a.kode,
      nama: a.nama,
      tipe_nama: namaTipeAkun(a.tipe),
      normal: tipeAkun(a.tipe).normal,
      saldo_awal: dariSen(saldoNormal(a.tipe, awal)),
      debit: dariSen(debit),
      kredit: dariSen(kredit),
      saldo_akhir: dariSen(saldoNormal(a.tipe, awal + debit - kredit)),
    });
  }
  return { judul: "Neraca Percobaan", dari, sampai, baris, total: { debit: dariSen(total.debit), kredit: dariSen(total.kredit) } };
}

// ── Rincian Buku Besar / Histori Akun ─────────────────────────────────────
export async function bukuBesar({ dari, sampai, akunId }) {
  periksaRentang(dari, sampai);
  let akun = await muatAkunDetail();
  if (akunId) {
    // Akun induk → semua akun detail keturunannya.
    const { rows } = await pool.query(
      `with recursive t as (select id from akun where id = $1 union all select a.id from akun a join t on a.induk_id = t.id) select id from t`,
      [akunId],
    );
    if (!rows.length) throw galat.tidakAda("Akun tidak ditemukan.");
    const ids = new Set(rows.map((r) => r.id));
    akun = akun.filter((a) => ids.has(a.id));
  }
  const ids = akun.map((a) => a.id);
  const petaAwal = await saldoAwalTahunan(dari, ids);
  const { rows: mutasi } = await pool.query(
    `select b.akun_id, j.id as jurnal_id, to_char(j.tanggal, 'YYYY-MM-DD') as tanggal, j.nomor, j.tipe, j.keterangan, b.catatan,
            b.debit::text as debit, b.kredit::text as kredit, d.nama as departemen_nama
       from jurnal_baris b ${DISETUJUI} left join departemen d on d.id = b.departemen_id
      where j.tanggal between $1 and $2 and b.akun_id = any($3::uuid[])
      order by j.tanggal, j.nomor, b.urutan`,
    [dari, sampai, ids],
  );
  const perAkun = new Map();
  for (const m of mutasi) {
    if (!perAkun.has(m.akun_id)) perAkun.set(m.akun_id, []);
    perAkun.get(m.akun_id).push(m);
  }
  const hasil = [];
  for (const a of akun) {
    const daftar = perAkun.get(a.id) ?? [];
    const dkAwal = petaAwal.get(a.id) ?? NOL;
    if (!akunId && !daftar.length && dkAwal === NOL) continue;
    let berjalan = dkAwal;
    let totalDebit = NOL;
    let totalKredit = NOL;
    const baris = daftar.map((m) => {
      const debit = keSen(m.debit);
      const kredit = keSen(m.kredit);
      berjalan += debit - kredit;
      totalDebit += debit;
      totalKredit += kredit;
      return {
        jurnal_id: m.jurnal_id,
        tipe: m.tipe,
        tanggal: m.tanggal,
        nomor: m.nomor,
        tipe_nama: NAMA_TIPE_JURNAL[m.tipe],
        keterangan: [m.keterangan, m.catatan].filter(Boolean).join(" — "),
        departemen_nama: m.departemen_nama,
        debit: dariSen(debit),
        kredit: dariSen(kredit),
        saldo: dariSen(saldoNormal(a.tipe, berjalan)),
      };
    });
    hasil.push({
      akun_id: a.id,
      kode: a.kode,
      nama: a.nama,
      tipe_nama: namaTipeAkun(a.tipe),
      normal: tipeAkun(a.tipe).normal,
      saldo_awal: dariSen(saldoNormal(a.tipe, dkAwal)),
      baris,
      total_debit: dariSen(totalDebit),
      total_kredit: dariSen(totalKredit),
      saldo_akhir: dariSen(saldoNormal(a.tipe, berjalan)),
    });
  }
  return { judul: "Rincian Buku Besar", dari, sampai, akun: hasil };
}

// ── Histori Bank ──────────────────────────────────────────────────────────
/** Rincian Buku Besar khusus akun Kas & Bank; tanpa akun = rekening utama di Preferensi. */
export async function historiBank({ dari, sampai, akunId }) {
  let id = akunId;
  if (!id) {
    const { rows } = await pool.query("select akun_rekening_utama_id as id from perusahaan");
    id = rows[0]?.id;
    if (!id) throw galat.permintaan("Pilih rekening.");
  }
  const { rows } = await pool.query("select tipe from akun where id = $1", [id]);
  if (!rows[0]) throw galat.tidakAda("Akun tidak ditemukan.");
  if (rows[0].tipe !== "kas_bank") throw galat.permintaan("Histori Bank hanya untuk akun Kas & Bank.");
  return { ...(await bukuBesar({ dari, sampai, akunId: id })), judul: "Histori Bank" };
}

// ── Arus Kas (metode langsung) ────────────────────────────────────────────
// Arus kas = baris akun BUKAN Kas & Bank di jurnal yang menyentuh Kas & Bank:
// efek = kredit − debit (positif = uang masuk). Jurnal seimbang, jadi jumlah efek
// satu jurnal = perubahan saldo kas jurnal itu. Transfer antar-rekening tidak punya
// baris bukan kas, jadi tidak muncul. Jurnal Saldo Awal sudah menjadi Saldo Kas Awal.
const KELOMPOK_ARUS = [
  {
    kunci: "operasi",
    judul: "Arus Kas dari Aktivitas Operasi",
    tipe: [
      "pendapatan",
      "pendapatan_lainnya",
      "beban_pokok_penjualan",
      "beban",
      "beban_lainnya",
      "piutang_usaha",
      "persediaan",
      "aset_lancar_lainnya",
      "utang_usaha",
      "liabilitas_jangka_pendek",
    ],
  },
  { kunci: "investasi", judul: "Arus Kas dari Aktivitas Investasi", tipe: ["aset_tetap", "akumulasi_penyusutan", "aset_lainnya"] },
  { kunci: "pendanaan", judul: "Arus Kas dari Aktivitas Pendanaan", tipe: ["liabilitas_jangka_panjang", "modal"] },
];
const BULAN_MAKS = 12;

const akhirBulan = (tahun, bulan) => new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);

/** Satu kolom per bulan kalender yang tersentuh [dari, sampai], dipotong ke rentang. */
function kolomBulan(dari, sampai) {
  const kolom = [];
  let [tahun, bulan] = dari.slice(0, 7).split("-").map(Number);
  for (;;) {
    const kunci = `${String(tahun).padStart(4, "0")}-${String(bulan).padStart(2, "0")}`;
    if (kunci > sampai.slice(0, 7)) break;
    const awal = `${kunci}-01`;
    const akhir = akhirBulan(tahun, bulan);
    kolom.push({ kunci, nama: bulanTahun(awal), dari: awal < dari ? dari : awal, sampai: akhir > sampai ? sampai : akhir });
    bulan += 1;
    if (bulan > 12) {
      bulan = 1;
      tahun += 1;
    }
  }
  return kolom;
}

const SYARAT_JURNAL_KAS = `
  j.status = 'disetujui' and j.tipe <> 'saldo_awal'
  and exists (select 1 from jurnal_baris bk join akun ak on ak.id = bk.akun_id where bk.jurnal_id = j.id and ak.tipe = 'kas_bank')`;

/**
 * Saldo semua akun Kas & Bank (sen): sebelum `dari`, dan perubahan per tanggal sampai `sampai`.
 * Jurnal Saldo Awal selalu masuk saldo pembuka (bukan perubahan harian), karena Arus Kas tidak
 * menghitungnya sebagai arus; kalau tidak, saldo tidak nyambung di rentang yang memuat tanggalnya.
 */
async function saldoKasHarian(dari, sampai) {
  const { rows: awal } = await pool.query(
    `select coalesce(sum(b.debit - b.kredit), 0)::text as dk
       from jurnal_baris b ${DISETUJUI} join akun a on a.id = b.akun_id
      where a.tipe = 'kas_bank' and (j.tanggal < $1 or j.tipe = 'saldo_awal')`,
    [dari],
  );
  const { rows } = await pool.query(
    `select to_char(j.tanggal, 'YYYY-MM-DD') as tanggal, sum(b.debit - b.kredit)::text as dk
       from jurnal_baris b ${DISETUJUI} join akun a on a.id = b.akun_id
      where a.tipe = 'kas_bank' and j.tipe <> 'saldo_awal' and j.tanggal between $1 and $2
      group by j.tanggal order by j.tanggal`,
    [dari, sampai],
  );
  return { awal: keSen(awal[0].dk), harian: rows.map((r) => ({ tanggal: r.tanggal, sen: keSen(r.dk) })) };
}

export async function arusKas({ dari, sampai, departemenId = null }) {
  periksaRentang(dari, sampai);
  const bulan = kolomBulan(dari, sampai);
  if (bulan.length > BULAN_MAKS) throw galat.permintaan(`Rentang Arus Kas paling panjang ${BULAN_MAKS} bulan.`);
  let departemenNama = null;
  if (departemenId) {
    const { rows } = await pool.query("select nama from departemen where id = $1", [departemenId]);
    if (!rows[0]) throw galat.permintaan("Lini bisnis tidak ditemukan.");
    departemenNama = rows[0].nama;
  }
  const kolom = [...bulan, { kunci: TOTAL, nama: "Total", dari, sampai }];
  const akun = await muatAkunDetail();
  const { rows } = await pool.query(
    `select b.akun_id, to_char(j.tanggal, 'YYYY-MM') as bulan, sum(b.kredit - b.debit)::text as efek
       from jurnal_baris b join jurnal j on j.id = b.jurnal_id join akun a on a.id = b.akun_id
      where j.tanggal between $1 and $2 and ${SYARAT_JURNAL_KAS}
        and a.tipe <> 'kas_bank' and ($3::uuid is null or b.departemen_id = $3)
      group by b.akun_id, to_char(j.tanggal, 'YYYY-MM')`,
    [dari, sampai, departemenId],
  );
  const nilai = new Map();
  for (const r of rows) {
    if (!nilai.has(r.akun_id)) nilai.set(r.akun_id, new Map());
    const m = nilai.get(r.akun_id);
    const sen = keSen(r.efek);
    tambahNilai(m, r.bulan, sen);
    tambahNilai(m, TOTAL, sen);
  }
  const kenaikan = new Map(kolom.map((k) => [k.kunci, NOL]));
  const bagian = KELOMPOK_ARUS.map((g) => {
    const total = new Map(kolom.map((k) => [k.kunci, NOL]));
    const baris = akun
      .filter((a) => g.tipe.includes(a.tipe) && nilai.has(a.id) && [...nilai.get(a.id).values()].some((v) => v !== NOL))
      .map((a) => {
        const m = nilai.get(a.id);
        for (const k of kolom) {
          tambahNilai(total, k.kunci, m.get(k.kunci) ?? NOL);
          tambahNilai(kenaikan, k.kunci, m.get(k.kunci) ?? NOL);
        }
        return { akun_id: a.id, kode: a.kode, nama: a.nama, nilai: Object.fromEntries(kolom.map((k) => [k.kunci, dariSen(m.get(k.kunci) ?? NOL)])) };
      });
    return { kunci: g.kunci, judul: g.judul, judul_total: `Jumlah ${g.judul}`, baris, total: keTeks(total) };
  });

  let saldoAwal = null;
  let saldoAkhir = null;
  let cocok = null;
  if (!departemenId) {
    const { awal, harian } = await saldoKasHarian(dari, sampai);
    const saldoSampai = (tanggal) => harian.filter((h) => h.tanggal <= tanggal).reduce((s, h) => s + h.sen, awal);
    const saldoSebelum = (tanggal) => harian.filter((h) => h.tanggal < tanggal).reduce((s, h) => s + h.sen, awal);
    saldoAwal = new Map(kolom.map((k) => [k.kunci, saldoSebelum(k.dari)]));
    saldoAkhir = new Map(kolom.map((k) => [k.kunci, saldoSampai(k.sampai)]));
    cocok = kolom.every((k) => saldoAwal.get(k.kunci) + kenaikan.get(k.kunci) === saldoAkhir.get(k.kunci));
  }
  return {
    judul: departemenNama ? `Arus Kas Lini Bisnis ${departemenNama}` : "Arus Kas",
    dari,
    sampai,
    departemen_nama: departemenNama,
    kolom,
    bagian,
    kenaikan: keTeks(kenaikan),
    saldo_awal: saldoAwal && keTeks(saldoAwal),
    saldo_akhir: saldoAkhir && keTeks(saldoAkhir),
    cocok,
  };
}

// ── Ringkasan Kas & Bank (widget halaman utama) ───────────────────────────
export async function ringkasanKasBank({ per }) {
  const { rows } = await pool.query(
    `select a.id, a.kode, a.nama, a.bank_nama, a.nomor_rekening_akhir, a.nonaktif,
            coalesce(p.akun_rekening_utama_id = a.id, false) as utama,
            (select sum(b.debit - b.kredit)::text from jurnal_baris b ${DISETUJUI}
              where b.akun_id = a.id and j.tanggal <= $1) as dk
       from akun a cross join perusahaan p
      where a.tipe = 'kas_bank' and not exists (select 1 from akun c where c.induk_id = a.id)
      order by a.kode`,
    [per],
  );
  // Rekening nonaktif hanya tampil kalau masih ada saldonya.
  const rekening = rows
    .filter((r) => !r.nonaktif || (r.dk !== null && keSen(r.dk) !== NOL))
    .map((r) => ({
      akun_id: r.id,
      kode: r.kode,
      nama: r.nama,
      bank_nama: r.bank_nama,
      nomor_rekening_akhir: r.nomor_rekening_akhir,
      utama: r.utama,
      saldo: r.dk === null ? null : dariSen(keSen(r.dk)),
    }));
  const terukur = rekening.filter((r) => r.saldo !== null);
  const total = terukur.length ? dariSen(terukur.reduce((s, r) => s + keSen(r.saldo), NOL)) : null;
  // Sebelum periode akuntansi dimulai belum ada pembukuan: arus bulan ini kosong, bukan Rp 0.
  const { mulai_periode: mulai } = await infoPerusahaan();
  const awalBulan = `${per.slice(0, 7)}-01` < mulai ? mulai : `${per.slice(0, 7)}-01`;
  if (per < mulai) {
    return { per, rekening, total, bulan: { dari: `${per.slice(0, 7)}-01`, sampai: per, masuk: null, keluar: null, bersih: null } };
  }
  const { rows: arus } = await pool.query(
    `select coalesce(sum(greatest(n, 0)), 0)::text as masuk, coalesce(sum(greatest(-n, 0)), 0)::text as keluar
       from (select b.jurnal_id, sum(b.debit - b.kredit) as n
               from jurnal_baris b join jurnal j on j.id = b.jurnal_id join akun a on a.id = b.akun_id
              where a.tipe = 'kas_bank' and j.status = 'disetujui' and j.tipe <> 'saldo_awal' and j.tanggal between $1 and $2
              group by b.jurnal_id) x`,
    [awalBulan, per],
  );
  const masuk = keSen(arus[0].masuk);
  const keluar = keSen(arus[0].keluar);
  return {
    per,
    rekening,
    total,
    bulan: { dari: awalBulan, sampai: per, masuk: dariSen(masuk), keluar: dariSen(keluar), bersih: dariSen(masuk - keluar) },
  };
}

// ── Keseluruhan Jurnal ────────────────────────────────────────────────────
export async function semuaJurnal({ dari, sampai }) {
  periksaRentang(dari, sampai);
  const { rows } = await pool.query(
    `select j.id, j.tipe, j.nomor, to_char(j.tanggal, 'YYYY-MM-DD') as tanggal, j.keterangan, j.total::text as total,
            b.urutan, a.kode, a.nama, b.debit::text as debit, b.kredit::text as kredit, d.nama as departemen_nama, b.catatan
       from jurnal j join jurnal_baris b on b.jurnal_id = j.id join akun a on a.id = b.akun_id left join departemen d on d.id = b.departemen_id
      where j.status = 'disetujui' and j.tanggal between $1 and $2
      order by j.tanggal, j.nomor, b.urutan`,
    [dari, sampai],
  );
  const jurnal = [];
  const peta = new Map();
  for (const r of rows) {
    if (!peta.has(r.id)) {
      const j = { id: r.id, tipe_nama: NAMA_TIPE_JURNAL[r.tipe], nomor: r.nomor, tanggal: r.tanggal, keterangan: r.keterangan, total: r.total, baris: [] };
      peta.set(r.id, j);
      jurnal.push(j);
    }
    peta.get(r.id).baris.push({ kode: r.kode, nama: r.nama, debit: r.debit, kredit: r.kredit, departemen_nama: r.departemen_nama, catatan: r.catatan });
  }
  return { judul: "Keseluruhan Jurnal", dari, sampai, jurnal };
}
