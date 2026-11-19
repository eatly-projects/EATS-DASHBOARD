// Pengaturan > Akses Grup: grup hak per menu untuk Operator, pola daftar lalu formulir.
import { useState } from "react";
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarData } from "@/widgets/daftar-form/ui/DaftarData";
import { useDaftarAksesGrup } from "@/entities/akses-grup";
import { FormAksesGrup } from "./ui/FormAksesGrup";

const KOLOM = [
  { kunci: "nama", judul: "Nama grup", render: (g) => <span className="font-medium text-foreground">{g.nama}</span> },
  { kunci: "keterangan", judul: "Keterangan", render: (g) => g.keterangan || "—" },
  { kunci: "jumlah_anggota", judul: "Jumlah anggota", rata: "kanan", render: (g) => `${g.jumlah_anggota} orang` },
];

function DaftarAksesGrup({ buka }) {
  const q = useDaftarAksesGrup();
  const [cari, setCari] = useState("");
  const baris = (q.data ?? []).filter((g) => `${g.nama} ${g.keterangan}`.toLowerCase().includes(cari.trim().toLowerCase()));
  return (
    <DaftarData
      kolom={KOLOM}
      baris={baris}
      memuat={q.isPending}
      galat={q.isError ? q.error : null}
      onMuatUlang={() => q.refetch()}
      onPilih={(g) => buka(g.id, g.nama)}
      cari={cari}
      onCari={setCari}
      satuan="akses grup"
      petunjukCari="Cari nama atau keterangan grup…"
      kosong={
        cari
          ? { judul: "Tidak ada akses grup yang cocok" }
          : {
              judul: "Belum ada akses grup",
              keterangan: "Buat akses grup untuk mengatur menu apa saja yang boleh dibuka Operator. Administrator selalu bisa membuka semua menu.",
            }
      }
      kartuHp={(g) => (
        <>
          <p className="font-medium text-foreground">{g.nama}</p>
          {g.keterangan && <p className="text-sm text-muted-foreground">{g.keterangan}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{g.jumlah_anggota} orang anggota</p>
        </>
      )}
    />
  );
}

export function AksesGrupPage() {
  return (
    <KerangkaDaftarForm
      namaData="akses grup"
      bisaBuat
      renderDaftar={({ buka }) => <DaftarAksesGrup buka={buka} />}
      renderForm={(p) => <FormAksesGrup {...p} />}
    />
  );
}
