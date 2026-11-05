// Menyusun RENCANA dari hasil AI: daftar angka per (unit, bulan, pos) + cek
// silang dengan baris total milik berkas itu sendiri. Fungsi murni, tanpa
// database, supaya bisa diuji.
//
// Kedua mode (Excel & dokumen) diubah dulu jadi daftar "butir" yang seragam:
//   { peran:'nilai'|'total', unit_kode|'GABUNGAN', periode:'YYYY-MM'|'YYYY',
//     pos_kode, ukuran, nilai, label, letak, ragu, alasan }
import { NAMA_UKURAN, gabungPos, hitungUkuran } from "../laporan/hitung.js";
import { barisBerangka, labelBaris } from "./excel.js";

const POLA_BULAN = /^\d{4}-(0[1-9]|1[0-2])$/;
const POLA_TAHUN = /^\d{4}$/;
const bulat = (v) => Math.round(v * 100) / 100;

/** Excel: gabungkan peta AI dengan angka dari sel. */
export function butirDariPetaExcel(buku, peta) {
  const peringatan = [];
  const diabaikan = [];
  const lembar = buku.lembar.find((l) => l.nama === peta.lembar) ?? buku.lembar.find((l) => l.baris.length) ?? buku.lembar[0];
  if (peta.lembar && lembar?.nama !== peta.lembar) peringatan.push(`AI menyebut lembar "${peta.lembar}" yang tidak ada; dipakai lembar "${lembar?.nama}".`);
  if (!lembar) return { butir: [], diabaikan, peringatan: [...peringatan, "Buku kerja tidak berisi lembar apa pun."] };

  const kolomPeta = new Map();
  for (const k of peta.kolom ?? []) {
    const kode = String(k.kolom || "").toUpperCase().trim();
    if (!/^[A-Z]{1,3}$/.test(kode)) continue;
    if (k.peran === "unit" || k.peran === "gabungan") {
      if (!POLA_BULAN.test(k.periode)) { peringatan.push(`Kolom ${kode}: bulan "${k.periode}" tidak dikenali, kolom ini tidak dipakai.`); continue; }
    } else if (k.peran?.startsWith("total_tahun")) {
      if (!POLA_TAHUN.test(k.periode)) continue;
    }
    if ((k.peran === "unit" || k.peran === "total_tahun_unit") && !k.unit_kode) {
      peringatan.push(`Kolom ${kode}: unit tidak disebut, kolom ini tidak dipakai.`); continue;
    }
    kolomPeta.set(kode, k);
  }
  const barisPeta = new Map((peta.baris ?? []).map((b) => [Number(b.baris), b]));

  const butir = [];
  for (const b of barisBerangka(lembar)) {
    const label = labelBaris(b);
    const letakBaris = `${lembar.nama}!baris ${b.nomor}`;
    const bp = barisPeta.get(b.nomor);
    if (!bp) {
      diabaikan.push({ label, letak: letakBaris, alasan: "Tidak dipetakan oleh AI." });
      peringatan.push(`Baris ${b.nomor} ("${label}") berisi angka tetapi tidak dipetakan AI, jadi tidak ikut disimpan. Periksa apakah memang boleh diabaikan.`);
      continue;
    }
    if (bp.peran === "abaikan") {
      diabaikan.push({ label, letak: letakBaris, alasan: bp.alasan || "Diabaikan AI." });
      continue;
    }
    if (bp.peran === "nilai" && !bp.pos_kode) {
      diabaikan.push({ label, letak: letakBaris, alasan: "AI tidak menyebut pos-nya." });
      peringatan.push(`Baris ${b.nomor} ("${label}") tidak punya pos, jadi tidak ikut disimpan.`);
      continue;
    }
    if (bp.peran === "total" && !bp.ukuran) continue;

    for (const s of b.sel) {
      if (typeof s.nilai !== "number") continue;
      const kp = kolomPeta.get(s.kolom);
      if (!kp || kp.peran === "abaikan") continue;
      const dasar = { label, letak: `${lembar.nama}!${s.ref}`, ragu: Boolean(bp.ragu), alasan: bp.alasan || "", nilai: s.nilai };
      if (bp.peran === "nilai" && kp.peran === "unit") {
        butir.push({ ...dasar, peran: "nilai", unit_kode: kp.unit_kode, periode: kp.periode, pos_kode: bp.pos_kode });
      } else if (bp.peran === "total") {
        const unit = kp.peran === "unit" || kp.peran === "total_tahun_unit" ? kp.unit_kode : "GABUNGAN";
        butir.push({ ...dasar, peran: "total", unit_kode: unit, periode: kp.periode, ukuran: bp.ukuran });
      }
      // Baris "nilai" di kolom gabungan/total tahun: tidak dipakai (gabungan dihitung sendiri).
    }
  }
  return { butir, diabaikan, peringatan, lembar: lembar.nama };
}

/** PDF/foto: jawaban AI sudah berisi angka. */
export function butirDariDokumen(hasil) {
  const butir = [];
  const diabaikan = [];
  const peringatan = [];
  for (const a of hasil.angka ?? []) {
    const label = a.label_asli || "(tanpa label)";
    if (a.peran === "abaikan") { diabaikan.push({ label, letak: a.letak, alasan: a.alasan || "Diabaikan AI." }); continue; }
    if (typeof a.nilai !== "number" || !Number.isFinite(a.nilai)) continue;
    if (a.peran === "nilai") {
      if (!a.pos_kode || a.unit_kode === "GABUNGAN") continue; // gabungan dihitung sendiri
      if (!POLA_BULAN.test(a.periode)) { peringatan.push(`"${label}" (${a.letak}): bulan "${a.periode}" tidak dikenali, tidak ikut disimpan.`); continue; }
      butir.push({ peran: "nilai", unit_kode: a.unit_kode, periode: a.periode, pos_kode: a.pos_kode, nilai: a.nilai, label, letak: a.letak, ragu: Boolean(a.ragu), alasan: a.alasan || "" });
    } else if (a.peran === "total" && a.ukuran && (POLA_BULAN.test(a.periode) || POLA_TAHUN.test(a.periode))) {
      butir.push({ peran: "total", unit_kode: a.unit_kode, periode: a.periode, ukuran: a.ukuran, nilai: a.nilai, label, letak: a.letak, ragu: Boolean(a.ragu), alasan: a.alasan || "" });
    }
  }
  return { butir, diabaikan, peringatan };
}

/**
 * Menghitung ukuran per (unit, bulan) dari daftar nilai, plus Gabungan dan total tahun.
 * @returns Map key "UNIT|periode" -> ukuran  (periode 'YYYY-MM' atau 'YYYY')
 */
export function hitungSemuaUkuran(nilai, ref) {
  const posPer = new Map(); // "UNIT|YYYY-MM" -> {pos}
  for (const n of nilai) {
    const k = `${n.unit_kode}|${n.periode}`;
    const pos = posPer.get(k) ?? {};
    pos[n.pos_kode] = bulat((pos[n.pos_kode] ?? 0) + n.nilai);
    posPer.set(k, pos);
  }
  const hasil = new Map();
  const bulanSemua = [...new Set(nilai.map((n) => n.periode))];
  for (const [k, pos] of posPer) hasil.set(k, hitungUkuran(pos, ref.pos));
  for (const p of bulanSemua) {
    const daftar = ref.unit.map((u) => posPer.get(`${u.kode}|${p}`)).filter(Boolean);
    hasil.set(`GABUNGAN|${p}`, hitungUkuran(gabungPos(daftar), ref.pos));
  }
  // Total tahun: jumlah ukuran bulanan (semua ukuran di cek silang bersifat jumlah).
  for (const [k, ukuran] of [...hasil]) {
    const [unit, p] = k.split("|");
    const kunciTahun = `${unit}|${p.slice(0, 4)}`;
    const t = hasil.get(kunciTahun) ?? {};
    for (const [u, v] of Object.entries(ukuran)) {
      if (typeof v === "number" && !u.startsWith("margin") && u !== "persen_hpp") t[u] = bulat((t[u] ?? 0) + v);
    }
    hasil.set(kunciTahun, t);
  }
  return hasil;
}

/** Cek silang: angka total di berkas vs hasil hitung dari nilai rinci. */
export function buatPemeriksaan(totalBerkas, nilai, ref) {
  const ukuranPer = hitungSemuaUkuran(nilai, ref);
  const pemeriksaan = [];
  const sudah = new Set();
  for (const t of totalBerkas) {
    const kunci = `${t.unit_kode}|${t.periode}|${t.ukuran}`;
    if (sudah.has(kunci)) continue; // baris total kembar (mis. "j - Lainnya" & jumlah rinciannya)
    sudah.add(kunci);
    const hitung = ukuranPer.get(`${t.unit_kode}|${t.periode}`)?.[t.ukuran] ?? null;
    const hitungAngka = hitung ?? 0;
    const selisih = bulat(t.nilai - hitungAngka);
    pemeriksaan.push({
      unit_kode: t.unit_kode,
      periode: t.periode,
      ukuran: t.ukuran,
      nama_ukuran: NAMA_UKURAN[t.ukuran] ?? t.ukuran,
      angka_berkas: t.nilai,
      angka_hitung: hitung,
      selisih,
      cocok: Math.abs(selisih) < 1,
      letak: t.letak,
    });
  }
  return pemeriksaan;
}

/** Rencana lengkap dari daftar butir. */
export function susunRencana({ jenis_berkas, hasilAi, butir, diabaikan, peringatan, ref }) {
  // Gabungkan butir "nilai" yang menuju (unit, bulan, pos) yang sama — dijumlah,
  // semua asalnya dicatat.
  const peta = new Map();
  for (const b of butir.filter((x) => x.peran === "nilai")) {
    const kunci = `${b.unit_kode}|${b.periode}|${b.pos_kode}`;
    const ada = peta.get(kunci);
    if (ada) {
      ada.nilai = bulat(ada.nilai + b.nilai);
      ada.sumber.push({ label: b.label, letak: b.letak });
      ada.ragu ||= b.ragu;
      if (b.alasan && !ada.alasan_ragu.includes(b.alasan)) ada.alasan_ragu = [ada.alasan_ragu, b.alasan].filter(Boolean).join(" ");
    } else {
      peta.set(kunci, {
        unit_kode: b.unit_kode,
        periode: b.periode,
        pos_kode: b.pos_kode,
        nilai: bulat(b.nilai),
        sumber: [{ label: b.label, letak: b.letak }],
        ragu: b.ragu,
        alasan_ragu: b.ragu ? b.alasan : "",
      });
    }
  }
  const urutPos = new Map(ref.pos.map((p) => [p.kode, p.urutan]));
  const urutUnit = new Map(ref.unit.map((u) => [u.kode, u.urutan]));
  const nilai = [...peta.values()].sort((a, b) =>
    (urutUnit.get(a.unit_kode) - urutUnit.get(b.unit_kode)) || a.periode.localeCompare(b.periode) || (urutPos.get(a.pos_kode) - urutPos.get(b.pos_kode)));

  const pemeriksaan = buatPemeriksaan(butir.filter((x) => x.peran === "total"), nilai, ref);
  const tidakCocok = pemeriksaan.filter((p) => !p.cocok).length;
  const peringatanAkhir = [...peringatan];
  if (!pemeriksaan.length && nilai.length) peringatanAkhir.push("Berkas tidak punya baris total yang bisa dicocokkan, jadi angka tidak bisa dicek silang otomatis. Periksa dengan teliti.");
  if (tidakCocok) peringatanAkhir.unshift(`${tidakCocok} dari ${pemeriksaan.length} total di berkas TIDAK cocok dengan hasil hitung. Periksa pemetaannya sebelum menyetujui.`);

  return {
    versi: 1,
    jenis_berkas,
    adalah_laporan_keuangan: Boolean(hasilAi.adalah_laporan_keuangan),
    judul: hasilAi.judul || "",
    catatan_ai: hasilAi.catatan || "",
    nilai,
    pemeriksaan,
    diabaikan,
    peringatan: peringatanAkhir,
  };
}
