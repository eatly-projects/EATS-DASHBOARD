// Matriks hak ala Accurate: daftar modul di kiri, tabel menu di kanan dengan
// kotak centang Lihat / Buat / Ubah / Hapus. Mencentang Buat/Ubah/Hapus ikut
// mencentang Lihat; mencabut Lihat mencabut semuanya.
import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/lib/cn";
import { ikonModul } from "@/widgets/app-shell/model/ikon";

const AKSI = [
  { kode: "lihat", nama: "Lihat" },
  { kode: "buat", nama: "Buat" },
  { kode: "ubah", nama: "Ubah" },
  { kode: "hapus", nama: "Hapus" },
];
const KOSONG = { lihat: false, buat: false, ubah: false, hapus: false };

/** Hak baru setelah satu kotak diubah, dengan aturan Lihat ikut menyesuaikan. */
function centang(hakMenu, aksi, nilai) {
  const h = { ...KOSONG, ...hakMenu, [aksi]: nilai };
  if (aksi === "lihat" && !nilai) return { ...KOSONG };
  if (aksi !== "lihat" && nilai) h.lihat = true;
  return h;
}

export function MatriksHak({ modul, hak, onUbah }) {
  const [pilihan, setPilihan] = useState(modul[0]?.kode);
  const [cari, setCari] = useState("");
  const m = modul.find((x) => x.kode === pilihan) ?? modul[0];
  if (!m) return <p className="text-sm text-muted-foreground">Belum ada menu yang bisa diatur.</p>;

  const menu = m.menu.filter((x) => x.nama.toLowerCase().includes(cari.trim().toLowerCase()));
  const ubahSatu = (kode, aksi, nilai) => onUbah({ ...hak, [kode]: centang(hak[kode], aksi, nilai) });
  const semuaTercentang = (aksi) => {
    const berlaku = menu.filter((x) => x.aksi.includes(aksi));
    return berlaku.length > 0 && berlaku.every((x) => hak[x.kode]?.[aksi]);
  };
  const ubahKolom = (aksi, nilai) => {
    const baru = { ...hak };
    for (const x of menu) if (x.aksi.includes(aksi)) baru[x.kode] = centang(baru[x.kode], aksi, nilai);
    onUbah(baru);
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="md:hidden">
        <Select value={m.kode} onValueChange={setPilihan}>
          <SelectTrigger aria-label="Pilih modul">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modul.map((x) => (
              <SelectItem key={x.kode} value={x.kode}>
                {x.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ul className="hidden w-52 shrink-0 space-y-1 md:block" aria-label="Modul">
        {modul.map((x) => {
          const Ikon = ikonModul(x.kode);
          const jumlah = x.menu.filter((mn) => hak[mn.kode]?.lihat).length;
          return (
            <li key={x.kode}>
              <button
                type="button"
                onClick={() => setPilihan(x.kode)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm",
                  x.kode === m.kode ? "bg-[hsl(var(--primary))] font-semibold text-white" : "text-foreground hover:bg-muted",
                )}
              >
                <Ikon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">{x.nama}</span>
                {jumlah > 0 && <span className="text-xs opacity-80">{jumlah} menu</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="relative sm:w-64">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari menu…" className="h-9 pl-9" aria-label="Cari menu" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                <th scope="col" className="px-3 py-2.5 text-left font-semibold">
                  Menu
                </th>
                {AKSI.map((a) => (
                  <th key={a.kode} scope="col" className="w-16 px-2 py-2.5 text-center font-semibold">
                    {a.nama}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border bg-muted/60">
                <td className="px-3 py-2 text-xs text-muted-foreground">Pilih semua</td>
                {AKSI.map((a) => (
                  <td key={a.kode} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={semuaTercentang(a.kode)}
                      onChange={(e) => ubahKolom(a.kode, e.target.checked)}
                      aria-label={`Pilih semua hak ${a.nama} di modul ${m.nama}`}
                    />
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {menu.map((x) => (
                <tr key={x.kode} className="border-t border-border/60">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground">{x.nama}</p>
                    {Object.keys(x.keteranganAksi ?? {}).length > 0 && (
                      <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                        {AKSI.filter((a) => x.keteranganAksi[a.kode]).map((a) => (
                          <li key={a.kode}>
                            {a.nama}: {x.keteranganAksi[a.kode]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  {AKSI.map((a) => (
                    <td key={a.kode} className="px-2 py-2.5 text-center">
                      {x.aksi.includes(a.kode) ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                          checked={Boolean(hak[x.kode]?.[a.kode])}
                          onChange={(e) => ubahSatu(x.kode, a.kode, e.target.checked)}
                          aria-label={`Hak ${a.nama} di menu ${x.nama}`}
                        />
                      ) : (
                        <span className="text-muted-foreground" aria-label="Tidak berlaku">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {menu.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    Tidak ada menu yang cocok dengan &ldquo;{cari}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
