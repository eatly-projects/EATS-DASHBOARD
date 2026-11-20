// Tanggal 'YYYY-MM-DD' dari browser: diperiksa tanpa zona waktu supaya tidak bergeser.
import { z } from "zod";

const POLA_TANGGAL = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const tanggalSah = (v) =>
  POLA_TANGGAL.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

export const skemaTanggal = (label = "Tanggal") =>
  z.string({ error: `${label} wajib diisi.` }).trim().refine(tanggalSah, `${label} tidak sah.`);
