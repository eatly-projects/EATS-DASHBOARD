// Alat kecil untuk HTTP: galat yang punya status & kode, dan bentuk jawaban
// seragam { ok, data } / { ok:false, error:{ code, message } }.
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const galat = {
  permintaan: (message, details) => new AppError(400, "PERMINTAAN_TIDAK_SAH", message, details),
  belumMasuk: (message = "Silakan masuk dulu.") => new AppError(401, "BELUM_MASUK", message),
  dilarang: (message = "Anda tidak punya akses untuk tindakan ini.") => new AppError(403, "DILARANG", message),
  tidakAda: (message = "Data tidak ditemukan.") => new AppError(404, "TIDAK_ADA", message),
  bentrok: (message) => new AppError(409, "BENTROK", message),
};

export const kirim = (res, data, status = 200) => res.status(status).json({ ok: true, data });

// Membaca body dengan skema zod; galatnya dijadikan pesan bahasa Indonesia yang bisa dibaca.
export function bacaBody(skema, nilai) {
  const hasil = skema.safeParse(nilai ?? {});
  if (hasil.success) return hasil.data;
  const pesan = hasil.error.issues.map((i) => i.message).join(" ");
  throw galat.permintaan(pesan || "Isian tidak sah.");
}
