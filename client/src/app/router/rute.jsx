// Isi setiap tab menu. Setiap tab merender daftar rute ini dengan alamatnya
// sendiri (<Routes location>), jadi tab yang tidak aktif tetap hidup dan isiannya
// tidak hilang. Setiap halaman dibungkus PerluHak: tanpa hak Lihat, yang tampil
// pesan "belum punya akses", bukan halaman kosong.
import { Route } from "react-router-dom";
import { RingkasanPage } from "@/pages/ringkasan/RingkasanPage";
import { UnggahPage } from "@/pages/unggah/UnggahPage";
import { CekUnggahanPage } from "@/pages/cek-unggahan/CekUnggahanPage";
import { PreferensiPage } from "@/pages/preferensi/PreferensiPage";
import { AksesGrupPage } from "@/pages/akses-grup/AksesGrupPage";
import { PenggunaPage } from "@/pages/pengguna/PenggunaPage";
import { PenomoranPage } from "@/pages/penomoran/PenomoranPage";
import { LogAktivitasPage } from "@/pages/log-aktivitas/LogAktivitasPage";
import { TidakDitemukanPage } from "@/pages/tidak-ditemukan/TidakDitemukanPage";
import { PerluHak } from "./ProtectedRoute";

export const RUTE_TAB = (
  <>
    <Route path="/" element={<PerluHak menu="ringkasan_laba_rugi"><RingkasanPage /></PerluHak>} />
    <Route path="/pengaturan/preferensi" element={<PerluHak menu="preferensi"><PreferensiPage /></PerluHak>} />
    <Route path="/pengaturan/akses-grup" element={<PerluHak menu="akses_grup"><AksesGrupPage /></PerluHak>} />
    <Route path="/pengaturan/pengguna" element={<PerluHak menu="pengguna"><PenggunaPage /></PerluHak>} />
    <Route path="/pengaturan/penomoran" element={<PerluHak menu="penomoran"><PenomoranPage /></PerluHak>} />
    <Route path="/perusahaan/log-aktivitas" element={<PerluHak menu="log_aktivitas"><LogAktivitasPage /></PerluHak>} />
    <Route path="/laporan/unggah" element={<PerluHak menu="unggah_laporan"><UnggahPage /></PerluHak>} />
    <Route path="/laporan/unggah/:id" element={<PerluHak menu="unggah_laporan"><CekUnggahanPage /></PerluHak>} />
    <Route path="*" element={<TidakDitemukanPage />} />
  </>
);
