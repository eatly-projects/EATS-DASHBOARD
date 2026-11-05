// Unduh tabel sebagai CSV. Pemisah titik-koma (;) supaya Excel berbahasa
// Indonesia langsung membaginya ke kolom; angka ditulis tanpa pemisah ribuan
// supaya tetap bisa dijumlah di Excel. BOM di depan agar huruf tidak rusak.

function sel(v) {
  if (v === null || v === undefined) return "";
  const t = typeof v === "number" ? String(v).replace(".", ",") : String(v);
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** baris: array of array (baris pertama = judul kolom). */
export function unduhCsv(namaBerkas, baris) {
  const isi = "﻿" + baris.map((b) => b.map(sel).join(";")).join("\r\n");
  const blob = new Blob([isi], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaBerkas.endsWith(".csv") ? namaBerkas : `${namaBerkas}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
