import { Link } from "react-router-dom";
import { FiFileText, FiImage, FiGrid, FiInbox } from "react-icons/fi";
import { CardBox, EmptyState, ErrorState, Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { rentangBulan, tanggalJam, ukuranBerkas } from "@/shared/lib/format";
import { NAMA_JENIS, useDaftarUnggahan } from "@/entities/unggahan";
import { StatusUnggahan } from "@/entities/unggahan/ui/StatusUnggahan";

const IKON = { excel: FiGrid, pdf: FiFileText, gambar: FiImage };

function isiRingkas(u) {
  const periode = [u.periode_awal, u.periode_akhir].filter(Boolean);
  if (!periode.length && !u.jumlah_nilai) return "—";
  const bagian = [];
  if (periode.length) bagian.push(rentangBulan(periode));
  if (u.jumlah_nilai) bagian.push(`${Number(u.jumlah_nilai).toLocaleString("id-ID")} angka`);
  return bagian.join(" · ");
}

function TombolAksi({ u }) {
  const cek = u.status === "menunggu_cek";
  return (
    <Button size="sm" variant={cek ? "default" : "outline"} asChild className={cek ? "" : "hover:bg-muted hover:text-foreground"}>
      <Link to={`/unggahan/${u.id}`}>{cek ? "Cek sekarang" : "Lihat"}</Link>
    </Button>
  );
}

export function RiwayatUnggahan() {
  const q = useDaftarUnggahan();
  const daftar = q.data ?? [];

  return (
    <CardBox title="Riwayat unggahan" subtitle="Terbaru di atas. Berkas yang menunggu dicek belum masuk ke dashboard.">
      {q.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState pesan={q.error?.message} aksi={<Button onClick={() => q.refetch()}>Coba lagi</Button>} />
      ) : daftar.length === 0 ? (
        <EmptyState ikon={FiInbox} judul="Belum ada unggahan" keterangan="Berkas yang Anda unggah akan muncul di sini." />
      ) : (
        <>
          {/* Desktop & tablet: tabel */}
          {/* `relative`: teks khusus pembaca layar (sr-only, posisi absolute) tetap di dalam wadah bergulir. */}
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Berkas</th>
                  <th className="px-3 py-2 text-left font-medium">Isi</th>
                  <th className="px-3 py-2 text-left font-medium">Diunggah</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((u) => {
                  const Ikon = IKON[u.jenis_berkas] ?? FiFileText;
                  return (
                    <tr key={u.id} className="border-b border-border/40 align-top">
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <Ikon className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
                          <div className="min-w-0">
                            <p className="max-w-[22rem] break-words font-medium text-foreground">{u.nama_berkas}</p>
                            <p className="text-xs text-muted-foreground">
                              {NAMA_JENIS[u.jenis_berkas] ?? "Berkas"} · {ukuranBerkas(u.ukuran)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{isiRingkas(u)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <p>{tanggalJam(u.diunggah_at)}</p>
                        {u.diunggah_oleh_nama && <p className="text-xs">oleh {u.diunggah_oleh_nama}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusUnggahan status={u.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <TombolAksi u={u} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* HP: kartu bertumpuk */}
          <ul className="space-y-2 md:hidden">
            {daftar.map((u) => {
              const Ikon = IKON[u.jenis_berkas] ?? FiFileText;
              return (
                <li key={u.id} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <Ikon className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
                      <p className="break-words text-sm font-medium text-foreground">{u.nama_berkas}</p>
                    </div>
                    <StatusUnggahan status={u.status} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {isiRingkas(u)} · {tanggalJam(u.diunggah_at)}
                    {u.diunggah_oleh_nama ? ` · oleh ${u.diunggah_oleh_nama}` : ""}
                  </p>
                  <div className="mt-2">
                    <TombolAksi u={u} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </CardBox>
  );
}
