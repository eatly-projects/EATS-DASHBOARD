import { useEffect, useMemo, useState } from "react";
import { FiSave, FiTrash2 } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { useDaftarDepartemen, useDepartemen, useHapusDepartemen, useSimpanDepartemen } from "@/entities/departemen";
import { useHak } from "@/entities/navigasi";

const KOSONG = { nama: "", keterangan: "", induk_id: null, nonaktif: false };
const TANPA_INDUK = "__tanpa_induk";

const dariServer = (d) => ({ nama: d.nama, keterangan: d.keterangan ?? "", induk_id: d.induk_id, nonaktif: d.nonaktif });
const baku = (x) => JSON.stringify({ ...x, nama: x.nama.trim(), keterangan: x.keterangan.trim() });

export function FormDepartemen({ id, tutup, setelahSimpan, tandaiBerubah }) {
  const q = useDepartemen(id);
  const semua = useDaftarDepartemen();
  const hak = useHak("departemen");
  const simpan = useSimpanDepartemen();
  const hapus = useHapusDepartemen();
  const [awal, setAwal] = useState(id ? null : KOSONG);
  const [isian, setIsian] = useState(id ? null : KOSONG);

  if (q.data && !isian) {
    setAwal(dariServer(q.data));
    setIsian(dariServer(q.data));
  }

  const berubah = useMemo(() => Boolean(isian && awal && baku(isian) !== baku(awal)), [isian, awal]);
  useEffect(() => tandaiBerubah(berubah), [berubah, tandaiBerubah]);

  if (id && q.isError) return <ErrorState pesan={q.error?.message} />;
  if (!isian) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const bolehUbah = id ? hak.ubah : hak.buat;
  const ubah = (bagian) => setIsian((x) => ({ ...x, ...bagian }));
  const pilihanInduk = (semua.data ?? []).filter((d) => d.id !== id && (!d.nonaktif || d.id === isian.induk_id));
  const kunci = id ?? "baru";

  const tekanSimpan = () =>
    simpan.mutate(
      { id, ...isian },
      {
        onSuccess: (d) => {
          setAwal(dariServer(d));
          setIsian(dariServer(d));
          setelahSimpan(d.id, d.nama);
        },
      },
    );

  return (
    <FormDokumen
      tab={[
        {
          kunci: "umum",
          judul: "Departemen",
          isi: (
            <fieldset disabled={!bolehUbah} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`nama-${kunci}`}>Nama</Label>
                  <Input
                    id={`nama-${kunci}`}
                    value={isian.nama}
                    maxLength={60}
                    onChange={(e) => ubah({ nama: e.target.value })}
                    placeholder="Misalnya: Retail"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`ket-${kunci}`}>Keterangan (boleh kosong)</Label>
                  <Input
                    id={`ket-${kunci}`}
                    value={isian.keterangan}
                    maxLength={200}
                    onChange={(e) => ubah({ keterangan: e.target.value })}
                    placeholder="Misalnya: penjualan Shopee dan TikTok Shop"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`induk-${kunci}`}>Sub departemen dari</Label>
                  <Select value={isian.induk_id ?? TANPA_INDUK} onValueChange={(v) => ubah({ induk_id: v === TANPA_INDUK ? null : v })} disabled={!bolehUbah}>
                    <SelectTrigger id={`induk-${kunci}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TANPA_INDUK}>Bukan sub departemen</SelectItem>
                      {pilihanInduk.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">Status</p>
                  <label className="flex h-10 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={isian.nonaktif}
                      onChange={(e) => ubah({ nonaktif: e.target.checked })}
                    />
                    Nonaktif (tidak bisa dipilih di transaksi baru)
                  </label>
                </div>
              </div>
            </fieldset>
          ),
        },
      ]}
      aksi={[
        ...(bolehUbah
          ? [
              {
                kunci: "simpan",
                label: "Simpan",
                labelMemuat: "Menyimpan…",
                ikon: FiSave,
                nada: "utama",
                onClick: tekanSimpan,
                nonaktif: !isian.nama.trim() || (id && !berubah),
                memuat: simpan.isPending,
              },
            ]
          : []),
        ...(id && hak.hapus
          ? [
              {
                kunci: "hapus",
                label: "Hapus",
                labelMemuat: "Menghapus…",
                ikon: FiTrash2,
                nada: "bahaya",
                memuat: hapus.isPending,
                onClick: () => hapus.mutate(id, { onSuccess: tutup }),
                konfirmasi: {
                  judul: `Hapus departemen ${isian.nama}?`,
                  isi: "Departemen yang sudah dipakai di transaksi tidak bisa dihapus; nonaktifkan saja. Penghapusan tercatat di Log Aktivitas.",
                  tombol: "Ya, hapus",
                },
              },
            ]
          : []),
      ]}
    />
  );
}
