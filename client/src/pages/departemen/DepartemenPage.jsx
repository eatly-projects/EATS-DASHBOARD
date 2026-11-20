// Perusahaan > Departemen: lini bisnis untuk memisahkan laba rugi per lini, pola daftar lalu formulir.
import { useState } from "react";
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarData } from "@/widgets/daftar-form/ui/DaftarData";
import { ChipFilter } from "@/widgets/daftar-form/ui/ChipFilter";
import { useDaftarDepartemen } from "@/entities/departemen";
import { useHak } from "@/entities/navigasi";
import { LencanaStatus } from "@/shared/ui/LencanaStatus";
import { FormDepartemen } from "./ui/FormDepartemen";

const PILIHAN_STATUS = [
  { nilai: "semua", label: "Semua" },
  { nilai: "aktif", label: "Aktif" },
  { nilai: "nonaktif", label: "Nonaktif" },
];

const KOLOM = [
  { kunci: "nama", judul: "Nama", render: (d) => <span className="font-medium text-foreground">{d.nama}</span> },
  { kunci: "keterangan", judul: "Keterangan", render: (d) => d.keterangan || "—" },
  { kunci: "induk_nama", judul: "Sub departemen dari", render: (d) => d.induk_nama || "—" },
  { kunci: "nonaktif", judul: "Status", render: (d) => <LencanaStatus aktif={!d.nonaktif} /> },
];

function DaftarDepartemen({ buka }) {
  const q = useDaftarDepartemen();
  const [cari, setCari] = useState("");
  const [status, setStatus] = useState("semua");
  const baris = (q.data ?? [])
    .filter((d) => status === "semua" || (status === "aktif" ? !d.nonaktif : d.nonaktif))
    .filter((d) => `${d.nama} ${d.keterangan}`.toLowerCase().includes(cari.trim().toLowerCase()));
  return (
    <DaftarData
      kolom={KOLOM}
      baris={baris}
      memuat={q.isPending}
      galat={q.isError ? q.error : null}
      onMuatUlang={() => q.refetch()}
      onPilih={(d) => buka(d.id, d.nama)}
      cari={cari}
      onCari={setCari}
      satuan="departemen"
      petunjukCari="Cari nama atau keterangan…"
      filter={<ChipFilter label="Status" nilai={status} pilihan={PILIHAN_STATUS} onUbah={setStatus} />}
      kosong={{ judul: cari || status !== "semua" ? "Tidak ada departemen yang cocok" : "Belum ada departemen" }}
      kartuHp={(d) => (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{d.nama}</p>
            <LencanaStatus aktif={!d.nonaktif} />
          </div>
          {d.keterangan && <p className="text-sm text-muted-foreground">{d.keterangan}</p>}
          {d.induk_nama && <p className="mt-1 text-xs text-muted-foreground">Sub departemen dari {d.induk_nama}</p>}
        </>
      )}
    />
  );
}

export function DepartemenPage() {
  const hak = useHak("departemen");
  return (
    <KerangkaDaftarForm
      namaData="departemen"
      bisaBuat={hak.buat}
      renderDaftar={({ buka }) => <DaftarDepartemen buka={buka} />}
      renderForm={(p) => <FormDepartemen {...p} />}
    />
  );
}
