// Perusahaan > Persetujuan: transaksi yang menunggu disetujui atau ditolak. Hanya
// penyetuju tipe transaksi itu (diatur di Pengaturan › Penyetuju Transaksi) yang bisa memutuskan.
import { useState } from "react";
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarData } from "@/widgets/daftar-form/ui/DaftarData";
import { ChipFilter } from "@/widgets/daftar-form/ui/ChipFilter";
import { useDaftarPersetujuan } from "@/entities/persetujuan";
import { formatRupiah } from "@/shared/lib/uang";
import { tanggal } from "@/shared/lib/format";
import { LencanaStatusJurnal } from "@/shared/ui/LencanaStatusJurnal";
import { DetailPersetujuan } from "./ui/DetailPersetujuan";

const PILIHAN_STATUS = [
  { nilai: "diajukan", label: "Menunggu persetujuan" },
  { nilai: "ditolak", label: "Ditolak" },
];

function DaftarPersetujuan({ buka }) {
  const [status, setStatus] = useState("diajukan");
  const [cari, setCari] = useState("");
  const q = useDaftarPersetujuan(status);
  const kata = cari.trim().toLowerCase();
  const baris = (q.data ?? []).filter((j) => !kata || `${j.keterangan} ${j.tipe_nama} ${j.diajukan_oleh_nama}`.toLowerCase().includes(kata));
  const kolom = [
    { kunci: "tipe_nama", judul: "Tipe transaksi" },
    { kunci: "tanggal", judul: "Tanggal", render: (j) => <span className="whitespace-nowrap">{tanggal(j.tanggal)}</span> },
    { kunci: "keterangan", judul: "Keterangan", render: (j) => j.keterangan || "—" },
    { kunci: "total", judul: "Total", rata: "kanan", render: (j) => <span className="whitespace-nowrap">{formatRupiah(j.total)}</span> },
    { kunci: "diajukan_oleh_nama", judul: "Diajukan oleh", render: (j) => j.diajukan_oleh_nama || "—" },
    {
      kunci: "penyetuju_nama",
      judul: "Penyetuju",
      render: (j) => (
        <span>
          {j.penyetuju_nama || "—"}
          {j.bisa_putuskan && <span className="ml-1.5 text-xs font-semibold text-[hsl(var(--primary))]">(Anda)</span>}
        </span>
      ),
    },
  ];
  return (
    <DaftarData
      kolom={kolom}
      baris={baris}
      memuat={q.isPending}
      galat={q.isError ? q.error : null}
      onMuatUlang={() => q.refetch()}
      onPilih={(j) => buka(j.id, `${j.tipe_nama} ${tanggal(j.tanggal)}`)}
      cari={cari}
      onCari={setCari}
      satuan="transaksi"
      petunjukCari="Cari keterangan atau nama…"
      filter={<ChipFilter label="Status" nilai={status} pilihan={PILIHAN_STATUS} onUbah={setStatus} />}
      kosong={{
        judul: status === "diajukan" ? "Tidak ada transaksi yang menunggu persetujuan" : "Tidak ada transaksi yang ditolak",
        keterangan: status === "diajukan" ? "Transaksi yang kena aturan di Pengaturan, Penyetuju Transaksi, akan muncul di sini." : undefined,
      }}
      kartuHp={(j) => (
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{j.tipe_nama}</p>
            <span className="whitespace-nowrap font-semibold tabular-nums">{formatRupiah(j.total)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {tanggal(j.tanggal)}
            {j.keterangan ? ` · ${j.keterangan}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Diajukan {j.diajukan_oleh_nama || "—"}, penyetuju {j.penyetuju_nama || "—"}
            {j.bisa_putuskan ? " (Anda)" : ""}
          </p>
          <LencanaStatusJurnal status={j.status} />
        </div>
      )}
    />
  );
}

export function PersetujuanPage() {
  return (
    <KerangkaDaftarForm
      namaData="persetujuan"
      renderDaftar={({ buka }) => <DaftarPersetujuan buka={buka} />}
      renderForm={(p) => <DetailPersetujuan {...p} />}
    />
  );
}
