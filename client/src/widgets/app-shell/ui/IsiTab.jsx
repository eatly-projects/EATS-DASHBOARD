import { Routes } from "react-router-dom";
import { RUTE_TAB } from "@/app/router/rute";

/**
 * Isi semua tab sekaligus. Tab yang tidak aktif disembunyikan, bukan dibuang,
 * sehingga isian formulir dan pilihan filternya tetap ada saat pindah tab.
 * Tab aktif memakai alamat browser saat ini; tab lain memakai alamat terakhirnya.
 */
export function IsiTab({ tab, kodeAktif, alamatAktif }) {
  const daftar = kodeAktif && !tab.some((t) => t.kode === kodeAktif) ? [...tab, { kode: kodeAktif, path: alamatAktif }] : tab;
  return daftar.map((t) => {
    const aktif = t.kode === kodeAktif;
    return (
      <div key={t.kode} hidden={!aktif} className="min-w-0">
        <Routes location={aktif ? alamatAktif : t.path}>{RUTE_TAB}</Routes>
      </div>
    );
  });
}
