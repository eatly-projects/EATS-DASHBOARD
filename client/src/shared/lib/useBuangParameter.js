// Alamat sekali pakai (?buka=…, ?akun=…): setelah dibaca, parameternya dibuang dari alamat
// tab yang sedang aktif. Dengan begitu klik tautan yang sama lagi tetap bekerja, dan muat ulang
// browser tidak membuka dokumen yang sudah ditutup.
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Membuang `nama` (daftar parameter) dari alamat kalau `ada` dan tab ini yang sedang tampil. */
export function useBuangParameter(ada, nama) {
  const lokasi = useLocation();
  const navigate = useNavigate();
  const kunci = nama.join(",");
  useEffect(() => {
    // Tab yang tidak aktif dirender dengan alamatnya sendiri; jangan ubah alamat browser dari sana.
    if (!ada || window.location.pathname !== lokasi.pathname) return;
    const sisa = new URLSearchParams(lokasi.search);
    for (const n of kunci.split(",")) sisa.delete(n);
    const teks = sisa.toString();
    navigate({ pathname: lokasi.pathname, search: teks ? `?${teks}` : "" }, { replace: true });
  }, [ada, kunci, lokasi.pathname, lokasi.search, navigate]);
}
