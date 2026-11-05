// Satu-satunya pintu ke backend. Jawaban server berbentuk
// { ok: true, data } atau { ok: false, error: { code, message } }.
// Helper di bawah langsung mengembalikan `data`, dan galat diubah jadi Error
// biasa dengan .message (pesan server, bahasa Indonesia), .code, .status.
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 150000, // membaca berkas dengan AI bisa sampai ±2 menit (Claude lalu cadangan Gemini)
});

// Dipasang oleh lapisan app (supaya shared tidak mengimpor entities):
// dipanggil saat server menjawab 401 di luar permintaan login/cek sesi.
let saatBelumMasuk = () => {};
export function aturSaatBelumMasuk(fn) {
  saatBelumMasuk = fn;
}

const TANPA_PENGALIHAN = ["/auth/saya", "/auth/masuk", "/auth/keluar"];

function rapikanGalat(err) {
  const status = err.response?.status ?? 0;
  const dariServer = err.response?.data?.error;
  let pesan = dariServer?.message;
  if (!pesan) {
    if (err.code === "ECONNABORTED") pesan = "Server terlalu lama menjawab. Coba lagi sebentar lagi.";
    else if (!err.response) pesan = "Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.";
    else if (status === 413) pesan = "Berkas terlalu besar untuk dikirim. Maksimal 4 MB.";
    else if (status >= 500) pesan = "Terjadi gangguan di server. Coba lagi sebentar lagi.";
    else pesan = "Permintaan gagal diproses.";
  }
  const e = new Error(pesan);
  e.code = dariServer?.code ?? err.code ?? "GALAT";
  e.status = status;
  e.details = dariServer?.details;
  return e;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url ?? "";
    if (status === 401 && !TANPA_PENGALIHAN.some((u) => url.startsWith(u))) saatBelumMasuk();
    return Promise.reject(rapikanGalat(err));
  },
);

export const apiGet = async (url, params) => (await api.get(url, { params })).data.data;
export const apiPost = async (url, body, config) => (await api.post(url, body, config)).data.data;
export const apiPatch = async (url, body) => (await api.patch(url, body)).data.data;
