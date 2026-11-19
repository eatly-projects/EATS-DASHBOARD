// Detail satu catatan log: ringkasan, lalu tabel isi sebelum dan sesudah.
import { useState } from "react";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { cn } from "@/shared/lib/cn";
import { tanggal, tanggalJam } from "@/shared/lib/format";
import { NAMA_TINDAKAN, useDetailLog } from "@/entities/log-aktivitas";

const tampil = (v) => (v === undefined || v === null || v === "" ? "—" : String(v));

export function DetailLog({ id }) {
  const q = useDetailLog(id);
  const [hanyaBerubah, setHanyaBerubah] = useState(true);

  if (q.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (q.isError) return <ErrorState pesan={q.error?.message} />;

  const l = q.data;
  const sebelum = l.sebelum ?? {};
  const sesudah = l.sesudah ?? {};
  const kunci = [...new Set([...Object.keys(sesudah), ...Object.keys(sebelum)])];
  const baris = kunci.map((k) => ({ k, lama: sebelum[k], baru: sesudah[k], berubah: tampil(sebelum[k]) !== tampil(sesudah[k]) }));
  const tampilBaris = hanyaBerubah ? baris.filter((b) => b.berubah) : baris;

  const ringkasan = [
    ["Waktu", tanggalJam(l.waktu)],
    ["Tindakan", NAMA_TINDAKAN[l.tindakan] ?? l.tindakan],
    ["Menu", l.menu_nama],
    ["Referensi", tampil(l.referensi)],
    ["Tanggal transaksi", l.tanggal_transaksi ? tanggal(l.tanggal_transaksi) : "—"],
    ["Pengguna", `${l.pengguna_nama} (${l.pengguna_email})`],
    ["Alamat IP", tampil(l.alamat_ip)],
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {ringkasan.map(([label, isi]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words font-medium text-foreground">{isi}</dd>
          </div>
        ))}
      </dl>

      <label className="flex items-center gap-2.5">
        <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={hanyaBerubah} onChange={(e) => setHanyaBerubah(e.target.checked)} />
        <span className="text-sm text-foreground">Hanya tampilkan perubahan</span>
      </label>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-left text-muted-foreground">
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Kolom
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Sebelum
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Sesudah
              </th>
            </tr>
          </thead>
          <tbody>
            {tampilBaris.map((b) => (
              <tr key={b.k} className={cn("border-t border-border/60 align-top", b.berubah && "bg-[hsl(var(--accent))]")}>
                <td className="px-3 py-2.5 font-medium text-foreground">{b.k}</td>
                <td className="break-words px-3 py-2.5 text-muted-foreground">{tampil(b.lama)}</td>
                <td className="break-words px-3 py-2.5 text-foreground">{tampil(b.baru)}</td>
              </tr>
            ))}
            {tampilBaris.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                  Tidak ada isi yang berubah.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
