// Susunan nomor otomatis, mengikuti Penomoran di Accurate. Fungsi murni, tanpa
// database. Tanggal dibaca langsung dari teks 'YYYY-MM-DD' (tanpa Date) supaya
// tidak bergeser sehari karena zona waktu.
//
// format = daftar bagian, misalnya
//   [{jenis:"teks",nilai:"JU."},{jenis:"tahun"},{jenis:"teks",nilai:"."},{jenis:"bulan"},{jenis:"teks",nilai:"."},{jenis:"counter"}]
//   -> JU.2027.01.00001
export const KOMPONEN = ["teks", "tahun", "tahun_singkat", "bulan", "bulan_romawi", "hari", "counter"];
export const RESET = ["tidak", "hari", "bulan", "tahun"];

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const pecahTanggal = (tanggal) => {
  const [tahun, bulan, hari] = String(tanggal).slice(0, 10).split("-");
  return { tahun, bulan, hari };
};

export function susunNomor({ format, digit_counter }, tanggal, counter) {
  const t = pecahTanggal(tanggal);
  return format
    .map((b) => {
      switch (b.jenis) {
        case "teks":
          return b.nilai;
        case "tahun":
          return t.tahun;
        case "tahun_singkat":
          return t.tahun.slice(2);
        case "bulan":
          return t.bulan;
        case "bulan_romawi":
          return ROMAWI[Number(t.bulan) - 1];
        case "hari":
          return t.hari;
        case "counter":
          return String(counter).padStart(digit_counter, "0");
        default:
          return "";
      }
    })
    .join("");
}

/** Kunci baris nomor urut: nomor urut mulai lagi dari 1 setiap kuncinya berganti. */
export function kunciPeriode(reset, tanggal) {
  const t = pecahTanggal(tanggal);
  if (reset === "tahun") return t.tahun;
  if (reset === "bulan") return `${t.tahun}-${t.bulan}`;
  if (reset === "hari") return `${t.tahun}-${t.bulan}-${t.hari}`;
  return "";
}

/** Pesan galat (bahasa Indonesia) kalau susunannya tidak sah, atau null kalau sah. */
export function periksaFormat({ format, digit_counter, reset }) {
  if (!Array.isArray(format) || format.length < 1 || format.length > 12) return "Susunan nomor harus terdiri dari 1 sampai 12 bagian.";
  if (format.some((b) => !KOMPONEN.includes(b?.jenis))) return "Ada bagian susunan nomor yang tidak dikenal.";
  if (format.filter((b) => b.jenis === "counter").length !== 1) return "Susunan nomor harus punya tepat satu Nomor urut.";
  for (const b of format) {
    if (b.jenis !== "teks") continue;
    const nilai = String(b.nilai ?? "");
    if (!nilai.trim() || nilai.length > 20) return "Bagian Teks harus diisi, paling panjang 20 karakter.";
  }
  if (!Number.isInteger(digit_counter) || digit_counter < 1 || digit_counter > 10) return "Jumlah digit nomor urut harus 1 sampai 10.";
  if (!RESET.includes(reset)) return "Pilihan kapan nomor urut diulang tidak dikenal.";

  const ada = (...jenis) => format.some((b) => jenis.includes(b.jenis));
  const adaTahun = ada("tahun", "tahun_singkat");
  const adaBulan = ada("bulan", "bulan_romawi");
  if (reset === "tahun" && !adaTahun) {
    return "Nomor yang diulang setiap tahun harus memuat Tahun, supaya nomor tahun ini tidak sama dengan nomor tahun lalu.";
  }
  if (reset === "bulan" && !(adaTahun && adaBulan)) {
    return "Nomor yang diulang setiap bulan harus memuat Tahun dan Bulan, supaya nomor bulan ini tidak sama dengan nomor bulan lalu.";
  }
  if (reset === "hari" && !(adaTahun && adaBulan && ada("hari"))) {
    return "Nomor yang diulang setiap hari harus memuat Tahun, Bulan, dan Hari, supaya nomor hari ini tidak sama dengan nomor hari lain.";
  }
  return null;
}
