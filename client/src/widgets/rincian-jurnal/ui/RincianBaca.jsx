// Rincian jurnal hanya-baca (Persetujuan, laporan): Akun, Debit, Kredit, Departemen, Catatan.
import { formatRupiah, jumlahkan, lebihDariNol } from "@/shared/lib/uang";

const uangAtauKosong = (v) => (lebihDariNol(v) ? formatRupiah(v) : "");

export function RincianBaca({ baris }) {
  const debit = jumlahkan(baris.map((b) => b.debit));
  const kredit = jumlahkan(baris.map((b) => b.kredit));
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-left text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-semibold">Akun</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Debit</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Kredit</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Departemen</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b, i) => (
              <tr key={i} className="border-t border-border/70">
                <td className="px-4 py-2.5">
                  <span className="mr-2 tabular-nums text-muted-foreground">{b.akun_kode}</span>
                  {b.akun_nama}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{uangAtauKosong(b.debit)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{uangAtauKosong(b.kredit)}</td>
                <td className="px-4 py-2.5">{b.departemen_nama || "—"}</td>
                <td className="px-4 py-2.5">{b.catatan || "—"}</td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="px-4 py-2.5">Total</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatRupiah(debit)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatRupiah(kredit)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {baris.map((b, i) => (
          <li key={i} className="rounded-lg border border-border p-3 text-sm">
            <p className="font-medium">
              <span className="mr-2 tabular-nums text-muted-foreground">{b.akun_kode}</span>
              {b.akun_nama}
            </p>
            <p className="mt-1 tabular-nums">{lebihDariNol(b.debit) ? `Debit ${formatRupiah(b.debit)}` : `Kredit ${formatRupiah(b.kredit)}`}</p>
            <p className="text-muted-foreground">
              {b.departemen_nama || "Tanpa departemen"}
              {b.catatan ? ` · ${b.catatan}` : ""}
            </p>
          </li>
        ))}
        <li className="flex justify-between rounded-lg bg-muted/60 p-3 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatRupiah(debit)}</span>
        </li>
      </ul>
    </>
  );
}
