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
import { DepartemenPage } from "@/pages/departemen/DepartemenPage";
import { AkunPerkiraanPage } from "@/pages/akun-perkiraan/AkunPerkiraanPage";
import { JurnalUmumPage } from "@/pages/jurnal-umum/JurnalUmumPage";
import { PencatatanBebanPage } from "@/pages/pencatatan-beban/PencatatanBebanPage";
import { PersetujuanPage } from "@/pages/persetujuan/PersetujuanPage";
import { PenyetujuTransaksiPage } from "@/pages/penyetuju-transaksi/PenyetujuTransaksiPage";
import { LaporanKeuanganPage } from "@/pages/laporan-keuangan/LaporanKeuanganPage";
import { HistoriAkunPage } from "@/pages/histori-akun/HistoriAkunPage";
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
    <Route path="/perusahaan/departemen" element={<PerluHak menu="departemen"><DepartemenPage /></PerluHak>} />
    <Route path="/perusahaan/persetujuan" element={<PerluHak menu="persetujuan"><PersetujuanPage /></PerluHak>} />
    <Route path="/pengaturan/penyetuju-transaksi" element={<PerluHak menu="penyetuju_transaksi"><PenyetujuTransaksiPage /></PerluHak>} />
    <Route path="/buku-besar/akun" element={<PerluHak menu="akun_perkiraan"><AkunPerkiraanPage /></PerluHak>} />
    <Route path="/buku-besar/jurnal-umum" element={<PerluHak menu="jurnal_umum"><JurnalUmumPage /></PerluHak>} />
    <Route path="/buku-besar/pencatatan-beban" element={<PerluHak menu="pencatatan_beban"><PencatatanBebanPage /></PerluHak>} />
    <Route path="/buku-besar/histori-akun" element={<PerluHak menu="histori_akun"><HistoriAkunPage /></PerluHak>} />
    <Route path="/laporan/keuangan" element={<PerluHak menu="laporan_keuangan"><LaporanKeuanganPage /></PerluHak>} />
    <Route path="/laporan/unggah" element={<PerluHak menu="unggah_laporan"><UnggahPage /></PerluHak>} />
    <Route path="/laporan/unggah/:id" element={<PerluHak menu="unggah_laporan"><CekUnggahanPage /></PerluHak>} />
    <Route path="*" element={<TidakDitemukanPage />} />
  </>
);
