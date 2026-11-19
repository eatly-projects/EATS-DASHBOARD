// Menu yang boleh dibuka pengguna yang sedang masuk, beserta haknya per menu.
// Sumbernya server (GET /navigasi), jadi daftar menu dan hak akses hanya ada
// di satu tempat: server/src/shared/akses/menu.js.
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/shared/api/client";

export const KUNCI_NAVIGASI = ["navigasi"];
const TANPA_HAK = { lihat: false, buat: false, ubah: false, hapus: false };

export function useNavigasi() {
  return useQuery({ queryKey: KUNCI_NAVIGASI, queryFn: () => apiGet("/navigasi"), staleTime: 5 * 60_000 });
}

/** Semua menu dalam satu daftar, masing-masing dengan kode modulnya. */
export function semuaMenu(navigasi) {
  return (navigasi?.modul ?? []).flatMap((m) => m.menu.map((menu) => ({ ...menu, modul: m.kode })));
}

/** Menu pemilik sebuah alamat: dicocokkan per segmen, awalan terpanjang menang. "/" hanya cocok persis. */
export function menuDariPath(navigasi, pathname) {
  let terbaik = null;
  for (const m of semuaMenu(navigasi)) {
    if (m.path === "/") {
      if (pathname === "/") return m;
      continue;
    }
    if ((pathname === m.path || pathname.startsWith(`${m.path}/`)) && (!terbaik || m.path.length > terbaik.path.length)) terbaik = m;
  }
  return terbaik;
}

/** Hak pengguna di satu menu. Semuanya false selama navigasi masih dimuat. */
export function useHak(menuKode) {
  const { data } = useNavigasi();
  return semuaMenu(data).find((m) => m.kode === menuKode)?.hak ?? TANPA_HAK;
}
