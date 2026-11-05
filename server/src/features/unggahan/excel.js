// Membaca berkas Excel (.xlsx) jadi model sederhana, lalu menyusun ringkasannya
// untuk AI.
//
// Prinsip: ANGKA SELALU DIAMBIL PROGRAM DARI SEL, bukan disalin AI. AI hanya
// menerima ringkasan (label, judul kolom, contoh angka & rumus) untuk
// memutuskan arti tiap baris dan kolom. Nilai yang dipakai adalah hasil rumus
// yang tersimpan di berkas (seperti yang terlihat di Excel).
import ExcelJS from "exceljs";

export const BATAS_BARIS_BERISI = 2000;
const CONTOH_ANGKA_PER_BARIS = 8;

const hurufKolom = (n) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// Mengubah isi sel exceljs jadi { nilai, rumus }. nilai: number | string | null.
function isiSel(sel) {
  const v = sel.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? { nilai: v, rumus: null } : null;
  if (typeof v === "string") return v.trim() === "" ? null : { nilai: v, rumus: null };
  if (typeof v === "boolean") return { nilai: v ? "TRUE" : "FALSE", rumus: null };
  if (v instanceof Date) return { nilai: v.toISOString().slice(0, 10), rumus: null };
  if (typeof v === "object") {
    if ("formula" in v || "sharedFormula" in v) {
      const rumus = `=${sel.formula ?? v.formula ?? v.sharedFormula ?? ""}`;
      // exceljs membuang hasil bernilai 0 dari `value.result` (padahal <v>0</v>
      // tersimpan di berkas); `cell.result` tetap membawanya.
      const hasil = v.result ?? sel.result;
      if (typeof hasil === "number" && Number.isFinite(hasil)) return { nilai: hasil, rumus };
      if (typeof hasil === "string" && hasil.trim() !== "") return { nilai: hasil, rumus };
      if (hasil && typeof hasil === "object" && "error" in hasil) return { nilai: String(hasil.error), rumus };
      // Rumus tanpa hasil tersimpan (berkas belum pernah dibuka/disimpan Excel)
      // atau hasilnya kosong: tidak ada angka yang bisa dipakai.
      return hasil === undefined ? { nilai: null, rumus, tanpaHasil: true } : null;
    }
    if (Array.isArray(v.richText)) {
      const t = v.richText.map((r) => r.text ?? "").join("");
      return t.trim() === "" ? null : { nilai: t, rumus: null };
    }
    if ("text" in v) return String(v.text).trim() === "" ? null : { nilai: String(v.text), rumus: null };
    if ("error" in v) return { nilai: String(v.error), rumus: null };
  }
  return null;
}

/**
 * @returns {Promise<{ lembar: Array<{
 *   nama: string, tersembunyi: boolean, gabungan: string[],
 *   kolomTersembunyi: string[], baris: Array<{ nomor:number, tersembunyi:boolean,
 *   sel: Array<{ kolom:string, ref:string, nilai:number|string|null, rumus:string|null, tanpaHasil?:boolean }> }>
 * }>, tanpaHasil: number }>}
 */
export async function bacaBukuKerja(buffer) {
  const buku = new ExcelJS.Workbook();
  try {
    await buku.xlsx.load(buffer);
  } catch (e) {
    throw new Error(`Berkas Excel tidak bisa dibuka (${e.message}). Pastikan formatnya .xlsx dan berkasnya tidak rusak atau dikunci kata sandi.`);
  }
  let tanpaHasil = 0;
  const lembar = [];
  buku.eachSheet((ws) => {
    const kolomTersembunyi = [];
    for (let c = 1; c <= ws.columnCount; c++) if (ws.getColumn(c).hidden) kolomTersembunyi.push(hurufKolom(c));
    const baris = [];
    ws.eachRow({ includeEmpty: false }, (row, nomor) => {
      const sel = [];
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        // Sel anak dari sel gabungan tidak punya isi sendiri.
        if (cell.isMerged && cell.master && cell.master.address !== cell.address) return;
        const isi = isiSel(cell);
        if (!isi) return;
        if (isi.tanpaHasil) tanpaHasil++;
        const kolom = hurufKolom(c);
        sel.push({ kolom, ref: `${kolom}${nomor}`, ...isi });
      });
      if (sel.length) baris.push({ nomor, tersembunyi: Boolean(row.hidden), sel });
    });
    lembar.push({
      nama: ws.name,
      tersembunyi: ws.state !== "visible",
      gabungan: Array.isArray(ws.model?.merges) ? ws.model.merges : [],
      kolomTersembunyi,
      baris,
    });
  });
  return { lembar, tanpaHasil };
}

const angka = (s) => typeof s.nilai === "number";
const kutip = (t) => JSON.stringify(String(t).replace(/\s+/g, " ").trim());

/** Ringkasan teks seluruh buku kerja untuk AI. */
export function ringkasanUntukAi(buku) {
  const bagian = [];
  let total = 0;
  for (const l of buku.lembar) {
    total += l.baris.length;
    if (total > BATAS_BARIS_BERISI) {
      throw new Error(`Berkas terlalu besar untuk dibaca sekaligus (lebih dari ${BATAS_BARIS_BERISI} baris berisi). Pisahkan per lembar atau per periode.`);
    }
    const out = [];
    out.push(`=== LEMBAR ${kutip(l.nama)}${l.tersembunyi ? " (lembar tersembunyi)" : ""} — ${l.baris.length} baris berisi ===`);
    if (l.gabungan.length) out.push(`Sel digabung (judulnya berlaku untuk seluruh rentang): ${l.gabungan.join(", ")}`);
    if (l.kolomTersembunyi.length) out.push(`Kolom tersembunyi: ${l.kolomTersembunyi.join(", ")}`);
    for (const b of l.baris) {
      const teks = b.sel.filter((s) => !angka(s) && s.nilai !== null);
      const nomor = b.sel.filter(angka);
      const kosongRumus = b.sel.filter((s) => s.nilai === null);
      let baris = `Baris ${b.nomor}${b.tersembunyi ? " [tersembunyi]" : ""}:`;
      if (teks.length) baris += " " + teks.map((s) => `${s.kolom}=${kutip(s.nilai)}`).join(" ");
      if (nomor.length) {
        const contoh = nomor.slice(0, CONTOH_ANGKA_PER_BARIS)
          .map((s) => `${s.kolom}=${s.nilai}${s.rumus ? ` (${s.rumus})` : ""}`).join(", ");
        const sisa = nomor.slice(CONTOH_ANGKA_PER_BARIS);
        const kolomSisa = sisa.length ? ` … +${sisa.length} angka lain di kolom ${sisa.map((s) => s.kolom).join(",")}` : "";
        baris += ` | ${nomor.length} angka: ${contoh}${kolomSisa}`;
      }
      // Kalau bentuk rumus berbeda antar kolom (mis. EBITDA mulai April ikut
      // menambah baris bunga), contoh 8 angka pertama tidak cukup: kirim semua polanya.
      const pola = new Map();
      for (const s of nomor.filter((x) => x.rumus)) {
        const p = s.rumus.replace(/\$?[A-Z]{1,3}\$?(\d+)/g, "#$1");
        if (!pola.has(p)) pola.set(p, []);
        pola.get(p).push(s.kolom);
      }
      if (pola.size > 1) {
        baris += ` | ${pola.size} pola rumus: ` + [...pola].map(([p, kol]) => `[${p}] di ${kol.join(",")}`).join("; ");
      }
      if (kosongRumus.length) baris += ` | ${kosongRumus.length} rumus tanpa hasil`;
      out.push(baris);
    }
    bagian.push(out.join("\n"));
  }
  return bagian.join("\n\n");
}

/** Daftar baris yang berisi angka, per lembar — untuk memastikan AI tidak melewatkan satu pun. */
export function barisBerangka(lembar) {
  return lembar.baris.filter((b) => b.sel.some(angka));
}

export const labelBaris = (b) =>
  b.sel.filter((s) => typeof s.nilai === "string").slice(0, 3).map((s) => String(s.nilai).replace(/\s+/g, " ").trim()).join(" · ") || `Baris ${b.nomor}`;
