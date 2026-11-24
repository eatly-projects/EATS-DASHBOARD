// Daftar transaksi pembukuan (Jurnal Umum, Pencatatan Beban, Penerimaan, Pembayaran,
// Transfer Bank): filter periode dan status, cari nomor atau keterangan, muat 50 per halaman.
import { useState } from "react";
import { DaftarData } from "@/widgets/daftar-form/ui/DaftarData";
import { ChipFilter } from "@/widgets/daftar-form/ui/ChipFilter";
import { useDaftarJurnal } from "@/entities/jurnal";
import { useTertunda } from "@/shared/lib/useTertunda";
import { PILIHAN_PERIODE, labelPeriode, rentangPeriode } from "@/shared/lib/rentang";
import { formatRupiah } from "@/shared/lib/uang";
import { tanggal } from "@/shared/lib/format";
import { LencanaStatusJurnal } from "@/shared/ui/LencanaStatusJurnal";

const SEMUA = "semua";
const PILIHAN_STATUS = [
  { nilai: SEMUA, label: "Semua" },
  { nilai: "disetujui", label: "Disetujui" },
  { nilai: "diajukan", label: "Menunggu persetujuan" },
  { nilai: "ditolak", label: "Ditolak" },
];

// Kolom akun kepala per tipe: Hutang Beban atau rekening.
const KOLOM_KEPALA = {
  pencatatan_beban: [{ kunci: "akun_lawan_nama", judul: "Hutang beban" }],
  penerimaan: [{ kunci: "akun_lawan_nama", judul: "Setor ke" }],
  pembayaran: [{ kunci: "akun_lawan_nama", judul: "Bayar dari" }],
  transfer_bank: [
    { kunci: "akun_lawan_nama", judul: "Dari rekening" },
    { kunci: "akun_tujuan_nama", judul: "Ke rekening" },
  ],
};
const KOSONG = {
  jurnal_umum: "Belum ada jurnal umum",
  pencatatan_beban: "Belum ada pencatatan beban",
  penerimaan: "Belum ada penerimaan",
  pembayaran: "Belum ada pembayaran",
  transfer_bank: "Belum ada transfer bank",
};

const Nomor = ({ j }) => (j.nomor ? <span className="font-medium tabular-nums text-foreground">{j.nomor}</span> : <span className="text-muted-foreground">Belum bernomor</span>);

export function DaftarJurnal({ tipe, buka }) {
  const [periode, setPeriode] = useState(SEMUA);
  const [status, setStatus] = useState(SEMUA);
  const [cari, setCari] = useState("");
  const cariTertunda = useTertunda(cari.trim());
  const q = useDaftarJurnal(tipe, { ...rentangPeriode(periode), status: status === SEMUA ? "" : status, cari: cariTertunda });
  const baris = q.data?.pages.flatMap((p) => p.baris) ?? [];
  const kepala = KOLOM_KEPALA[tipe] ?? [];
  const adaFilter = periode !== SEMUA || status !== SEMUA || cariTertunda;
  const judul = (j) => j.nomor ?? `${tanggal(j.tanggal)} (menunggu)`;

  const kolom = [
    { kunci: "nomor", judul: "Nomor", render: (j) => <Nomor j={j} /> },
    { kunci: "tanggal", judul: "Tanggal", render: (j) => <span className="whitespace-nowrap">{tanggal(j.tanggal)}</span> },
    ...kepala.map((k) => ({ ...k, render: (j) => j[k.kunci] || "—" })),
    { kunci: "keterangan", judul: "Keterangan", render: (j) => j.keterangan || "—" },
    { kunci: "total", judul: "Total", rata: "kanan", render: (j) => <span className="whitespace-nowrap">{formatRupiah(j.total)}</span> },
    { kunci: "status", judul: "Status", render: (j) => <LencanaStatusJurnal status={j.status} /> },
    { kunci: "dibuat_oleh_nama", judul: "Dibuat oleh", render: (j) => j.dibuat_oleh_nama || "—" },
  ];

  return (
    <DaftarData
      kolom={kolom}
      baris={baris}
      memuat={q.isPending}
      galat={q.isError ? q.error : null}
      onMuatUlang={() => q.refetch()}
      onPilih={(j) => buka(j.id, judul(j))}
      cari={cari}
      onCari={setCari}
      jumlah={q.data?.pages[0]?.jumlah}
      adaLagi={q.hasNextPage}
      onMuatLagi={() => q.fetchNextPage()}
      memuatLagi={q.isFetchingNextPage}
      satuan="transaksi"
      petunjukCari="Cari nomor atau keterangan…"
      filter={
        <>
          <ChipFilter label="Tanggal" nilai={periode} pilihan={PILIHAN_PERIODE} onUbah={setPeriode} labelAktif={labelPeriode(periode)} />
          <ChipFilter label="Status" nilai={status} pilihan={PILIHAN_STATUS} onUbah={setStatus} />
        </>
      }
      kosong={
        adaFilter
          ? { judul: "Tidak ada transaksi yang cocok" }
          : { judul: KOSONG[tipe], keterangan: "Tekan tombol Tambah di kanan atas untuk mencatat yang pertama." }
      }
      kartuHp={(j) => (
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <Nomor j={j} />
            <span className="whitespace-nowrap font-semibold tabular-nums">{formatRupiah(j.total)}</span>
          </div>
          <p className="text-sm text-muted-foreground">{tanggal(j.tanggal)}{j.keterangan ? ` · ${j.keterangan}` : ""}</p>
          {kepala.length > 0 && (
            <p className="text-sm text-muted-foreground">{kepala.map((k) => `${k.judul}: ${j[k.kunci] || "—"}`).join(", ")}</p>
          )}
          <LencanaStatusJurnal status={j.status} />
        </div>
      )}
    />
  );
}
