// Formulir Penerimaan (uang masuk) dan Pembayaran (uang keluar) ala Accurate: rekening,
// tanggal, nomor, keterangan, lalu rincian akun lawan dengan nilainya. Baris rekening
// ditulis otomatis oleh server di sisi sebaliknya.
import { useEffect, useMemo, useState } from "react";
import { FiExternalLink, FiInfo, FiPrinter, FiSave, FiTrash2 } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { PilihAkun } from "@/features/pilih-akun/ui/PilihAkun";
import { NAMA_TIPE, useHapusJurnal, useJurnal, useSimpanJurnal } from "@/entities/jurnal";
import { useHak } from "@/entities/navigasi";
import { hariIni } from "@/shared/lib/rentang";
import { lebihDariNol } from "@/shared/lib/uang";
import { tanggal as tglTeks } from "@/shared/lib/format";
import { URL_OPERASIONAL } from "@/shared/lib/operasional";
import { PitaStatus } from "./FormJurnal";
import { TabelRincian, barisKosong, barisTerisi, periksaRincian } from "./TabelRincian";

// Semua tipe akun kecuali Kas & Bank (pakai Transfer Bank) dan yang terisi dari aplikasi
// Operasional (Piutang Usaha, Utang Usaha, Persediaan).
const TIPE_RINCIAN_KAS = [
  "aset_lancar_lainnya",
  "aset_tetap",
  "akumulasi_penyusutan",
  "aset_lainnya",
  "liabilitas_jangka_pendek",
  "liabilitas_jangka_panjang",
  "modal",
  "pendapatan",
  "beban_pokok_penjualan",
  "beban",
  "pendapatan_lainnya",
  "beban_lainnya",
];

const TEKS = {
  penerimaan: { rekening: "Setor ke", total: "Total penerimaan", contoh: "Misalnya: setoran modal dari pemilik" },
  pembayaran: { rekening: "Bayar dari", total: "Total pembayaran", contoh: "Misalnya: bayar listrik November" },
};

const kepalaKosong = () => ({ tanggal: hariIni(), keterangan: "", akun_lawan_id: null, akun_lawan_label: "" });

function dariServer(j) {
  return {
    kepala: { tanggal: j.tanggal, keterangan: j.keterangan ?? "", akun_lawan_id: j.akun_lawan_id, akun_lawan_label: j.akun_lawan_nama ?? "" },
    baris: j.baris.map((b) => ({
      ...barisKosong(),
      akun_id: b.akun_id,
      akun_label: `${b.akun_kode} ${b.akun_nama}`,
      nilai: lebihDariNol(b.nilai) ? b.nilai : "",
      departemen_id: b.departemen_id,
      departemen_label: b.departemen_nama ?? "",
      catatan: b.catatan ?? "",
    })),
  };
}

const baku = (isian) =>
  JSON.stringify({
    tanggal: isian.kepala.tanggal,
    keterangan: isian.kepala.keterangan.trim(),
    akun_lawan_id: isian.kepala.akun_lawan_id,
    baris: barisTerisi(isian.baris).map((b) => [b.akun_id, b.nilai, b.departemen_id, b.catatan.trim()]),
  });

const keBody = (isian) => ({
  tanggal: isian.kepala.tanggal,
  keterangan: isian.kepala.keterangan,
  akun_lawan_id: isian.kepala.akun_lawan_id,
  baris: barisTerisi(isian.baris).map((b) => ({ akun_id: b.akun_id, nilai: b.nilai, departemen_id: b.departemen_id, catatan: b.catatan })),
});

/** Pengingat aturan tunai (rancangan Tahap 2 §4.2) dengan tombol ke aplikasi Operasional. */
export function CatatanOperasional() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-muted-foreground">
        <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
        Uang tunai atau transfer untuk penjualan dan pembelian barang dicatat di aplikasi Operasional.
      </p>
      <Button asChild variant="outline" size="sm" className="shrink-0 gap-2 hover:bg-muted hover:text-foreground">
        <a href={URL_OPERASIONAL} target="_blank" rel="noopener noreferrer">
          <FiExternalLink className="h-4 w-4" aria-hidden /> Buka aplikasi Operasional
        </a>
      </Button>
    </div>
  );
}

export function FormKasBank({ tipe, id, tutup, setelahSimpan, tandaiBerubah }) {
  const q = useJurnal(tipe, id);
  const hak = useHak(tipe);
  const simpan = useSimpanJurnal(tipe);
  const hapus = useHapusJurnal(tipe);
  const [awal, setAwal] = useState(id ? null : { kepala: kepalaKosong(), baris: [barisKosong()] });
  const [isian, setIsian] = useState(awal);

  if (q.data && !isian) {
    const d = dariServer(q.data);
    setAwal(d);
    setIsian(d);
  }

  const berubah = useMemo(() => Boolean(isian && awal && baku(isian) !== baku(awal)), [isian, awal]);
  useEffect(() => tandaiBerubah(berubah), [berubah, tandaiBerubah]);

  if (id && q.isError) return <ErrorState pesan={q.error?.message} />;
  if (!isian) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const teks = TEKS[tipe];
  const data = q.data;
  const bolehUbah = id ? hak.ubah : hak.buat;
  const kunci = `${tipe}-${id ?? "baru"}`;
  const ubahKepala = (bagian) => setIsian((x) => ({ ...x, kepala: { ...x.kepala, ...bagian } }));
  const kurang = (!isian.kepala.akun_lawan_id ? "Pilih rekening." : null) || (!isian.kepala.tanggal ? "Isi tanggal." : null) || periksaRincian("beban", isian.baris);
  const nomorTeks = data?.nomor ?? (data?.status === "diajukan" || data?.status === "ditolak" ? "Diberikan setelah disetujui" : "Otomatis saat disimpan");

  const tekanSimpan = () =>
    simpan.mutate(
      { id, ...keBody(isian) },
      {
        onSuccess: (j) => {
          const d = dariServer(j);
          setAwal(d);
          setIsian(d);
          setelahSimpan(j.id, j.nomor ?? `${NAMA_TIPE[tipe]} ${tglTeks(j.tanggal)}`);
        },
      },
    );

  return (
    <FormDokumen
      tab={[
        {
          kunci: "kepala",
          judul: NAMA_TIPE[tipe],
          isi: (
            <fieldset disabled={!bolehUbah} className="space-y-4">
              {data && <PitaStatus data={data} />}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`${kunci}-rekening`}>{teks.rekening}</Label>
                  <PilihAkun
                    id={`${kunci}-rekening`}
                    tipe={["kas_bank"]}
                    value={isian.kepala.akun_lawan_id}
                    label={isian.kepala.akun_lawan_label}
                    disabled={!bolehUbah}
                    placeholder="Pilih rekening atau kas"
                    onChange={(a) => ubahKepala({ akun_lawan_id: a.id, akun_lawan_label: `${a.kode} ${a.nama}` })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${kunci}-tanggal`}>Tanggal</Label>
                  <Input id={`${kunci}-tanggal`} type="date" value={isian.kepala.tanggal} onChange={(e) => ubahKepala({ tanggal: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">Nomor</p>
                  <p className="flex h-10 items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm text-muted-foreground">{nomorTeks}</p>
                </div>
                <div className="space-y-1.5 sm:col-span-2 xl:col-span-4">
                  <Label htmlFor={`${kunci}-ket`}>Keterangan</Label>
                  <Input
                    id={`${kunci}-ket`}
                    value={isian.kepala.keterangan}
                    maxLength={500}
                    onChange={(e) => ubahKepala({ keterangan: e.target.value })}
                    placeholder={teks.contoh}
                  />
                </div>
              </div>
            </fieldset>
          ),
        },
        {
          kunci: "rincian",
          judul: "Rincian",
          isi: (
            <div className="space-y-4">
              <CatatanOperasional />
              <TabelRincian
                mode="beban"
                baris={isian.baris}
                onUbah={(baris) => setIsian((x) => ({ ...x, baris }))}
                disabled={!bolehUbah}
                tipeAkun={TIPE_RINCIAN_KAS}
                idForm={kunci}
                labelTotal={teks.total}
              />
            </div>
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
                  judul: `Hapus ${NAMA_TIPE[tipe]} ${data?.nomor ?? ""}?`,
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
