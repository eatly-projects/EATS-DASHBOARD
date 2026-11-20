// Laporan keuangan dihitung dari jurnal yang disetujui: Laba Rugi (juga per departemen),
// Neraca (selalu seimbang, Laba Tahun Ini & Laba Ditahan), Neraca Percobaan, Buku Besar,
// dan Jurnal. Data uji memakai tahun 2031–2032 supaya tidak tercampur data lain.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { dalamTransaksi, kueri } from "../src/shared/db/pool.js";
import { buatPenggunaUji, jalankanAplikasi, masuk, panggil, selesai } from "./bantu.js";

let app, cookie, admin, kunciAsli, aturanAsli;
const akun = {};
const dep = {};
before(async () => {
  ({ rows: [{ kunci_sampai: kunciAsli }] } = await kueri("select kunci_sampai from perusahaan"));
  await kueri("update perusahaan set kunci_sampai = null");
  ({ rows: aturanAsli } = await kueri("select tipe_transaksi, aktif from penyetuju_transaksi"));
  await kueri("update penyetuju_transaksi set aktif = false");
  admin = await buatPenggunaUji({ peran: "admin" });
  app = await jalankanAplikasi();
  cookie = await masuk(app.url, admin);
  const buat = async (kode, nama, tipe, saldo_awal = "0") => {
    const r = await api("POST", "/akun", { kode, nama, tipe, induk_id: null, catatan: "", nonaktif: false, saldo_awal });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    akun[kode] = r.body.data.id;
  };
  await buat("UJIK", "UJI Kas Laporan", "kas_bank", "10000000");
  await buat("UJIP", "UJI Penjualan Laporan", "pendapatan");
  await buat("UJIB", "UJI Beban Laporan", "beban");
  await buat("UJIH", "UJI Hutang Beban Laporan", "liabilitas_jangka_pendek");
  const { rows: d } = await kueri("select nama, id from departemen where nama in ('Maklon','Retail')");
  for (const r of d) dep[r.nama] = r.id;
  const ju = async (tanggal, debit, kredit, nilai, departemen) => {
    const r = await api("POST", "/jurnal-umum", {
      tanggal,
      keterangan: "UJI laporan",
      baris: [
        { akun_id: akun[debit], debit: nilai, kredit: "0", departemen_id: departemen ?? null },
        { akun_id: akun[kredit], debit: "0", kredit: nilai, departemen_id: departemen ?? null },
      ],
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  };
  await ju("2031-03-01", "UJIK", "UJIP", "5000000", dep.Retail);
  await ju("2031-03-05", "UJIB", "UJIK", "2000000", dep.Maklon);
  await ju("2032-01-10", "UJIB", "UJIK", "1000000", null);
  const pb = await api("POST", "/pencatatan-beban", {
    tanggal: "2031-03-07",
    keterangan: "UJI beban akrual",
    akun_lawan_id: akun.UJIH,
    baris: [{ akun_id: akun.UJIB, nilai: "500000", departemen_id: dep.Maklon }],
  });
  assert.equal(pb.status, 201, JSON.stringify(pb.body));
  // Jurnal yang masih menunggu persetujuan tidak boleh ikut dihitung.
  await dalamTransaksi(async (k) => {
    const { rows } = await k.query(
      "insert into jurnal (tipe, tanggal, keterangan, total, status, dibuat_oleh) values ('jurnal_umum', '2031-03-10', 'UJI menunggu', 777, 'diajukan', $1) returning id",
      [admin.id],
    );
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, debit) values ($1, 1, $2, 777)", [rows[0].id, akun.UJIB]);
    await k.query("insert into jurnal_baris (jurnal_id, urutan, akun_id, kredit) values ($1, 2, $2, 777)", [rows[0].id, akun.UJIK]);
  });
});
after(async () => {
  await kueri("update perusahaan set kunci_sampai = $1", [kunciAsli]);
  for (const a of aturanAsli) await kueri("update penyetuju_transaksi set aktif = $2 where tipe_transaksi = $1", [a.tipe_transaksi, a.aktif]);
  await app.tutup();
  await selesai();
});

const api = (method, jalur, body) => panggil(app.url, cookie, method, jalur, body);
const barisAkun = (laporan, kode) => laporan.bagian.flatMap((b) => b.baris ?? []).find((r) => r.kode === kode);

test("Laba Rugi Maret 2031: pendapatan, beban, dan laba bersih; yang menunggu tidak dihitung", async () => {
  const r = await api("GET", "/laporan-keuangan/laba-rugi?dari=2031-03-01&sampai=2031-03-31");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const lr = r.body.data;
  assert.equal(barisAkun(lr, "UJIP").nilai.total, "5000000.00");
  assert.equal(barisAkun(lr, "UJIB").nilai.total, "2500000.00");
  assert.equal(lr.ringkasan.laba_bersih.total, "2500000.00");
  assert.equal(lr.ringkasan.laba_kotor.total, "5000000.00");
});

test("Laba Rugi per departemen: satu kolom per lini bisnis", async () => {
  const r = await api("GET", "/laporan-keuangan/laba-rugi?dari=2031-03-01&sampai=2031-03-31&per_departemen=1");
  const lr = r.body.data;
  const kunciRetail = lr.kolom.find((k) => k.nama === "Retail").kunci;
  const kunciMaklon = lr.kolom.find((k) => k.nama === "Maklon").kunci;
  assert.equal(barisAkun(lr, "UJIP").nilai[kunciRetail], "5000000.00");
  assert.equal(barisAkun(lr, "UJIB").nilai[kunciMaklon], "2500000.00");
  assert.equal(lr.ringkasan.laba_bersih[kunciRetail], "5000000.00");
  assert.equal(lr.ringkasan.laba_bersih[kunciMaklon], "-2500000.00");
  assert.equal(lr.kolom.at(-1).nama, "Total");
});

test("Neraca seimbang; laba tahun berjalan pindah ke Laba Ditahan di tahun berikutnya", async () => {
  const akhir2031 = (await api("GET", "/laporan-keuangan/neraca?per=2031-12-31")).body.data;
  assert.equal(akhir2031.seimbang, true);
  assert.equal(akhir2031.laba_tahun_ini, "2500000.00");
  const awal2032 = (await api("GET", "/laporan-keuangan/neraca?per=2032-02-01")).body.data;
  assert.equal(awal2032.seimbang, true);
  assert.equal(awal2032.laba_tahun_ini, "-1000000.00");
  const selisih = BigInt(awal2032.laba_ditahan.replace(".", "")) - BigInt(akhir2031.laba_ditahan.replace(".", ""));
  assert.equal(selisih, 250000000n, "Laba Ditahan bertambah sebesar laba 2031");
  const utang = akhir2031.bagian.flatMap((b) => b.baris ?? []).find((x) => x.kode === "UJIH");
  assert.equal(utang.nilai, "500000.00");
  const kas = akhir2031.bagian.flatMap((b) => b.baris ?? []).find((x) => x.kode === "UJIK");
  assert.equal(kas.nilai, "13000000.00");
});

test("Neraca Percobaan: saldo awal, mutasi, dan saldo akhir per akun; debit = kredit", async () => {
  const r = await api("GET", "/laporan-keuangan/neraca-percobaan?dari=2031-03-01&sampai=2031-03-31");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const np = r.body.data;
  const kas = np.baris.find((x) => x.kode === "UJIK");
  assert.deepEqual([kas.saldo_awal, kas.debit, kas.kredit, kas.saldo_akhir], ["10000000.00", "5000000.00", "2000000.00", "13000000.00"]);
  assert.equal(np.total.debit, np.total.kredit);
});

test("Buku Besar akun kas: saldo berjalan benar dan yang menunggu tidak muncul", async () => {
  const r = await api("GET", `/laporan-keuangan/buku-besar?dari=2031-03-01&sampai=2031-12-31&akun_id=${akun.UJIK}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const [bb] = r.body.data.akun;
  assert.equal(bb.saldo_awal, "10000000.00");
  assert.deepEqual(bb.baris.map((x) => x.saldo), ["15000000.00", "13000000.00"]);
  assert.equal(bb.saldo_akhir, "13000000.00");
});

test("Keseluruhan Jurnal memuat jurnal disetujui beserta rinciannya", async () => {
  const r = await api("GET", "/laporan-keuangan/jurnal?dari=2031-03-01&sampai=2031-03-31");
  const milikUji = r.body.data.jurnal.filter((j) => j.keterangan.startsWith("UJI"));
  assert.equal(milikUji.length, 3);
  assert.equal(milikUji[0].baris.length, 2);
});

test("laporan bisa diunduh sebagai Excel", async () => {
  const res = await fetch(`${app.url}/api/laporan-keuangan/laba-rugi/excel?dari=2031-03-01&sampai=2031-03-31`, { headers: { cookie } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /spreadsheetml/);
  assert.match(res.headers.get("content-disposition"), /Laba Rugi/);
  const isi = Buffer.from(await res.arrayBuffer());
  assert.equal(isi.subarray(0, 2).toString(), "PK");
});

test("rentang tanggal terbalik ditolak", async () => {
  const r = await api("GET", "/laporan-keuangan/laba-rugi?dari=2031-03-31&sampai=2031-03-01");
  assert.equal(r.status, 400);
});

test("tahun baru: akun pendapatan dan beban mulai dari nol di Neraca Percobaan dan Buku Besar", async () => {
  const np = (await api("GET", "/laporan-keuangan/neraca-percobaan?dari=2032-01-01&sampai=2032-01-31")).body.data;
  const p = np.baris.find((x) => x.kode === "UJIP");
  const b = np.baris.find((x) => x.kode === "UJIB");
  assert.equal(p?.saldo_awal ?? "0.00", "0.00", "penjualan 2031 tidak boleh jadi saldo awal 2032");
  assert.equal(b.saldo_awal, "0.00");
  assert.equal(b.saldo_akhir, "1000000.00");
  // Saldo awal tetap seimbang: laba tahun lalu masuk Laba Ditahan.
  let debit = 0n;
  let kredit = 0n;
  for (const r of np.baris) {
    const sen = BigInt(r.saldo_awal.replace(".", ""));
    if (r.normal === "debit") debit += sen;
    else kredit += sen;
  }
  assert.equal(debit, kredit);
  const bb = (await api("GET", `/laporan-keuangan/buku-besar?dari=2032-01-01&sampai=2032-12-31&akun_id=${akun.UJIB}`)).body.data;
  assert.equal(bb.akun[0].saldo_awal, "0.00");
  assert.equal(bb.akun[0].saldo_akhir, "1000000.00");
});
