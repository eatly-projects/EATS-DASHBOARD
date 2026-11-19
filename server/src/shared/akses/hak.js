// Hak akses per menu. Mengikuti Accurate:
//   - Administrator selalu boleh semua menu dan semua aksinya.
//   - Operator hanya boleh yang dicentang di akses grupnya; tanpa grup, tidak ada.
//   - Modul khusus Administrator (Pengaturan) tidak pernah terbuka untuk Operator.
import { kueri } from "../db/pool.js";
import { AppError } from "../http.js";
import { MODUL, SEMUA_AKSI, aksiMenu, cariMenu, semuaMenu } from "./menu.js";

export const AKSI = SEMUA_AKSI;
export const NAMA_AKSI = { lihat: "Lihat", buat: "Buat", ubah: "Ubah", hapus: "Hapus" };

const hakMenu = (menu, centang) =>
  Object.fromEntries(AKSI.map((a) => [a, aksiMenu(menu).includes(a) && Boolean(centang[a])]));

/** Hak pengguna untuk setiap menu. Setiap menu yang muncul selalu punya keempat kunci aksi. */
export async function muatHak(pengguna) {
  if (pengguna?.peran === "admin") {
    return Object.fromEntries(semuaMenu().map((m) => [m.kode, hakMenu(m, { lihat: true, buat: true, ubah: true, hapus: true })]));
  }
  if (!pengguna?.akses_grup_id) return {};
  const { rows } = await kueri("select menu_kode, lihat, buat, ubah, hapus from akses_grup_hak where grup_id = $1", [pengguna.akses_grup_id]);
  const hak = {};
  for (const r of rows) {
    const menu = cariMenu(r.menu_kode);
    if (!menu || menu.modul.khususAdministrator) continue;
    hak[menu.kode] = hakMenu(menu, r);
  }
  return hak;
}

export const boleh = (hak, menuKode, aksi) => Boolean(hak?.[menuKode]?.[aksi]);

/** Middleware: lanjut hanya kalau pengguna yang masuk punya hak `aksi` di menu `menuKode`. */
export function wajibHak(menuKode, aksi) {
  const menu = cariMenu(menuKode);
  if (!menu) throw new Error(`Menu ${menuKode} tidak ada di daftar menu.`);
  return async (req, _res, next) => {
    try {
      req.hak ??= await muatHak(req.pengguna);
      if (boleh(req.hak, menuKode, aksi)) return next();
      next(
        new AppError(
          403,
          "TANPA_HAK",
          `Anda belum diberi hak ${NAMA_AKSI[aksi]} di menu ${menu.nama}. Minta Administrator menambahkannya di Pengaturan, menu Akses Grup.`,
        ),
      );
    } catch (e) {
      next(e);
    }
  };
}

/** Isi bilah ikon dan panel menu: hanya menu yang boleh dilihat; modul tanpa menu dibuang. */
export function susunNavigasi(hak) {
  const modul = MODUL.map((m) => ({
    kode: m.kode,
    nama: m.nama,
    menu: m.menu
      .filter((menu) => boleh(hak, menu.kode, "lihat"))
      .map((menu) => ({ kode: menu.kode, nama: menu.nama, jenis: menu.jenis, path: menu.path, hak: hak[menu.kode] })),
  })).filter((m) => m.menu.length > 0);
  return { modul };
}
