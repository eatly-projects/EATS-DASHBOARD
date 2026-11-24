// Formulir Transfer Bank ala Accurate: pindah uang dari satu rekening (atau kas) ke yang lain.
// Jurnalnya debit rekening tujuan, kredit rekening asal; tanpa biaya (biaya bank dicatat lewat Pembayaran).
import { useEffect, useMemo, useState } from "react";
import { FiPrinter, FiSave, FiTrash2 } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Input } from "@/shared/ui/input";
import { InputUang } from "@/shared/ui/InputUang";
import { Label } from "@/shared/ui/label";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { PilihAkun } from "@/features/pilih-akun/ui/PilihAkun";
import { NAMA_TIPE, useHapusJurnal, useJurnal, useSimpanJurnal } from "@/entities/jurnal";
import { useHak } from "@/entities/navigasi";
import { hariIni } from "@/shared/lib/rentang";
import { lebihDariNol } from "@/shared/lib/uang";
import { tanggal as tglTeks } from "@/shared/lib/format";
import { PitaStatus } from "./FormJurnal";

const TIPE = "transfer_bank";
const kosong = () => ({ tanggal: hariIni(), keterangan: "", dari_id: null, dari_label: "", ke_id: null, ke_label: "", nilai: "" });

const dariServer = (j) => ({
  tanggal: j.tanggal,
  keterangan: j.keterangan ?? "",
  dari_id: j.akun_lawan_id,
  dari_label: j.akun_lawan_nama ?? "",
  ke_id: j.akun_tujuan_id,
  ke_label: j.akun_tujuan_nama ?? "",
  nilai: lebihDariNol(j.nilai) ? j.nilai : "",
});

const baku = (x) => JSON.stringify([x.tanggal, x.keterangan.trim(), x.dari_id, x.ke_id, x.nilai]);

function periksa(x) {
  if (!x.dari_id) return "Pilih rekening asal.";
  if (!x.ke_id) return "Pilih rekening tujuan.";
  if (x.dari_id === x.ke_id) return "Rekening asal dan tujuan tidak boleh sama.";
  if (!x.tanggal) return "Isi tanggal.";
  if (!lebihDariNol(x.nilai)) return "Isi nilai transfer.";
  return null;
}

export function FormTransferBank({ id, tutup, setelahSimpan, tandaiBerubah }) {
  const q = useJurnal(TIPE, id);
  const hak = useHak(TIPE);
  const simpan = useSimpanJurnal(TIPE);
  const hapus = useHapusJurnal(TIPE);
  const [awal, setAwal] = useState(id ? null : kosong());
  const [isian, setIsian] = useState(awal);

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

  const data = q.data;
  const bolehUbah = id ? hak.ubah : hak.buat;
  const kunci = `transfer-${id ?? "baru"}`;
  const ubah = (bagian) => setIsian((x) => ({ ...x, ...bagian }));
  const kurang = periksa(isian);
  const nomorTeks = data?.nomor ?? (data?.status === "diajukan" || data?.status === "ditolak" ? "Diberikan setelah disetujui" : "Otomatis saat disimpan");

  const tekanSimpan = () =>
    simpan.mutate(
      { id, tanggal: isian.tanggal, keterangan: isian.keterangan, akun_lawan_id: isian.dari_id, akun_tujuan_id: isian.ke_id, nilai: isian.nilai },
      {
        onSuccess: (j) => {
          setAwal(dariServer(j));
          setIsian(dariServer(j));
          setelahSimpan(j.id, j.nomor ?? `${NAMA_TIPE[TIPE]} ${tglTeks(j.tanggal)}`);
        },
      },
    );

  return (
    <FormDokumen
      tab={[
        {
          kunci: "transfer",
          judul: NAMA_TIPE[TIPE],
          isi: (
            <fieldset disabled={!bolehUbah} className="space-y-4">
              {data && <PitaStatus data={data} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${kunci}-dari`}>Dari rekening</Label>
                  <PilihAkun
                    id={`${kunci}-dari`}
                    tipe={["kas_bank"]}
                    value={isian.dari_id}
                    label={isian.dari_label}
                    disabled={!bolehUbah}
                    placeholder="Rekening atau kas asal"
                    onChange={(a) => ubah({ dari_id: a.id, dari_label: `${a.kode} ${a.nama}` })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${kunci}-ke`}>Ke rekening</Label>
                  <PilihAkun
                    id={`${kunci}-ke`}
                    tipe={["kas_bank"]}
                    value={isian.ke_id}
                    label={isian.ke_label}
                    disabled={!bolehUbah}
                    placeholder="Rekening atau kas tujuan"
                    onChange={(a) => ubah({ ke_id: a.id, ke_label: `${a.kode} ${a.nama}` })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${kunci}-tanggal`}>Tanggal</Label>
                  <Input id={`${kunci}-tanggal`} type="date" value={isian.tanggal} onChange={(e) => ubah({ tanggal: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">Nomor</p>
                  <p className="flex h-10 items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm text-muted-foreground">{nomorTeks}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${kunci}-nilai`}>Nilai</Label>
                  <InputUang id={`${kunci}-nilai`} value={isian.nilai} placeholder="0" disabled={!bolehUbah} onChange={(v) => ubah({ nilai: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${kunci}-ket`}>Keterangan</Label>
                  <Input
                    id={`${kunci}-ket`}
                    value={isian.keterangan}
                    maxLength={500}
                    onChange={(e) => ubah({ keterangan: e.target.value })}
                    placeholder="Misalnya: isi kas kecil dari BCA"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Biaya administrasi transfer dicatat terpisah lewat Pembayaran.</p>
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
                nonaktif: Boolean(kurang) || (id && !berubah),
                memuat: simpan.isPending,
              },
            ]
          : []),
        ...(id ? [{ kunci: "cetak", label: "Cetak", ikon: FiPrinter, onClick: () => window.print() }] : []),
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
                  judul: `Hapus Transfer Bank ${data?.nomor ?? ""}?`,
                  isi: "Transaksi di periode yang sudah dikunci tidak bisa dihapus. Penghapusan tercatat di Log Aktivitas.",
                  tombol: "Ya, hapus",
                },
              },
            ]
          : []),
      ]}
      catatan={bolehUbah && kurang && (!id || berubah) ? kurang : null}
    />
  );
}
