// Buku Besar > Akun Perkiraan: daftar akun bertingkat beserta saldonya, pola daftar lalu formulir.
import { useState } from "react";
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarData } from "@/widgets/daftar-form/ui/DaftarData";
import { ChipFilter } from "@/widgets/daftar-form/ui/ChipFilter";
import { useDaftarAkun, useTipeAkun } from "@/entities/akun";
import { useHak } from "@/entities/navigasi";
import { formatRupiah, keSen } from "@/shared/lib/uang";
import { cn } from "@/shared/lib/cn";
import { LencanaStatus } from "@/shared/ui/LencanaStatus";
import { FormAkun } from "./ui/FormAkun";

// Akun tanpa saldo ditulis "—", bukan "Rp 0".
const saldoTeks = (v) => (keSen(v) === keSen("0") ? "—" : formatRupiah(v));

const SEMUA = "semua";
const PILIHAN_STATUS = [
  { nilai: SEMUA, label: "Semua" },
  { nilai: "aktif", label: "Aktif" },
  { nilai: "nonaktif", label: "Nonaktif" },
];

const NamaAkun = ({ a, menjorok }) => (
  <span className={cn("block", a.punya_anak ? "font-semibold text-foreground" : "text-foreground")} style={{ paddingLeft: menjorok ? `${a.tingkat * 1.25}rem` : 0 }}>
    {a.nama}
    {a.nonaktif && <span className="ml-2 text-xs font-normal text-muted-foreground">(nonaktif)</span>}
  </span>
);

function DaftarAkun({ buka }) {
  const q = useDaftarAkun();
  const tipe = useTipeAkun();
  const [cari, setCari] = useState("");
  const [tipePilih, setTipePilih] = useState(SEMUA);
  const [status, setStatus] = useState(SEMUA);
  const kata = cari.trim().toLowerCase();
  const disaring = Boolean(kata) || tipePilih !== SEMUA || status !== SEMUA;
  const baris = (q.data ?? [])
    .filter((a) => tipePilih === SEMUA || a.tipe === tipePilih)
    .filter((a) => status === SEMUA || (status === "aktif" ? !a.nonaktif : a.nonaktif))
    .filter((a) => !kata || `${a.kode} ${a.nama}`.toLowerCase().includes(kata));

  const kolom = [
    { kunci: "kode", judul: "Kode", render: (a) => <span className={cn("tabular-nums", a.punya_anak && "font-semibold")}>{a.kode}</span> },
    { kunci: "nama", judul: "Nama", render: (a) => <NamaAkun a={a} menjorok={!disaring} /> },
    { kunci: "tipe_nama", judul: "Tipe akun" },
    { kunci: "saldo", judul: "Saldo", rata: "kanan", render: (a) => <span className={cn(a.punya_anak && "font-semibold")}>{saldoTeks(a.saldo)}</span> },
  ];

  return (
    <DaftarData
      kolom={kolom}
      baris={baris}
      memuat={q.isPending}
      galat={q.isError ? q.error : null}
      onMuatUlang={() => q.refetch()}
      onPilih={(a) => buka(a.id, `${a.kode} ${a.nama}`)}
      cari={cari}
      onCari={setCari}
      satuan="akun"
      petunjukCari="Cari kode atau nama akun…"
      filter={
        <>
          <ChipFilter
            label="Tipe akun"
            nilai={tipePilih}
            pilihan={[{ nilai: SEMUA, label: "Semua" }, ...(tipe.data ?? []).map((t) => ({ nilai: t.kode, label: t.nama }))]}
            onUbah={setTipePilih}
          />
          <ChipFilter label="Status" nilai={status} pilihan={PILIHAN_STATUS} onUbah={setStatus} />
        </>
      }
      kosong={{ judul: disaring ? "Tidak ada akun yang cocok" : "Belum ada akun" }}
      kartuHp={(a) => (
        <div className="flex items-start justify-between gap-3" style={{ paddingLeft: disaring ? 0 : `${a.tingkat * 0.75}rem` }}>
          <div className="min-w-0">
            <p className={cn("text-foreground", a.punya_anak && "font-semibold")}>
              <span className="mr-2 tabular-nums text-muted-foreground">{a.kode}</span>
              {a.nama}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {a.tipe_nama}
              {a.nonaktif && <LencanaStatus aktif={false} />}
            </div>
          </div>
          <p className={cn("shrink-0 text-right text-sm tabular-nums", a.punya_anak && "font-semibold")}>{saldoTeks(a.saldo)}</p>
        </div>
      )}
    />
  );
}

export function AkunPerkiraanPage() {
  const hak = useHak("akun_perkiraan");
  return (
    <KerangkaDaftarForm
      namaData="akun"
      bisaBuat={hak.buat}
      renderDaftar={({ buka }) => <DaftarAkun buka={buka} />}
      renderForm={(p) => <FormAkun {...p} />}
    />
  );
}
