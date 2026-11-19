// Pengaturan > Penomoran: susunan nomor otomatis per tipe transaksi.
import { useState } from "react";
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarData } from "@/widgets/daftar-form/ui/DaftarData";
import { NAMA_RESET, useDaftarPenomoran } from "@/entities/penomoran";
import { FormPenomoran } from "./ui/FormPenomoran";

const Bawaan = () => (
  <span className="rounded-full border border-[hsl(var(--primary))]/30 bg-[hsl(var(--accent))] px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--accent-foreground))]">
    Bawaan
  </span>
);

const terpakai = (p) => (p.terpakai > 0 ? `${p.terpakai.toLocaleString("id-ID")} nomor` : "Belum");

const KOLOM = [
  { kunci: "nama", judul: "Nama", render: (p) => <span className="font-medium text-foreground">{p.nama}</span> },
  { kunci: "tipe_nama", judul: "Tipe transaksi" },
  { kunci: "contoh", judul: "Contoh nomor berikutnya", render: (p) => <span className="tabular-nums">{p.contoh}</span> },
  { kunci: "reset", judul: "Nomor urut diulang", render: (p) => NAMA_RESET[p.reset] },
  { kunci: "terpakai", judul: "Sudah dipakai", rata: "kanan", render: terpakai },
  { kunci: "bawaan", judul: "Bawaan", render: (p) => (p.bawaan ? <Bawaan /> : "—") },
];

function DaftarPenomoran({ buka }) {
  const q = useDaftarPenomoran();
  const [cari, setCari] = useState("");
  const baris = (q.data ?? []).filter((p) => `${p.nama} ${p.tipe_nama}`.toLowerCase().includes(cari.trim().toLowerCase()));
  return (
    <DaftarData
      kolom={KOLOM}
      baris={baris}
      memuat={q.isPending}
      galat={q.isError ? q.error : null}
      onMuatUlang={() => q.refetch()}
      onPilih={(p) => buka(p.id, p.nama)}
      cari={cari}
      onCari={setCari}
      kosong={{ judul: cari ? "Tidak ada penomoran yang cocok" : "Belum ada penomoran" }}
      kartuHp={(p) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">{p.nama}</p>
            {p.bawaan && <Bawaan />}
          </div>
          <p className="text-sm text-muted-foreground">{p.tipe_nama}</p>
          <p className="mt-1 text-sm tabular-nums text-foreground">Berikutnya: {p.contoh}</p>
          <p className="text-xs text-muted-foreground">
            Diulang {NAMA_RESET[p.reset].toLowerCase()} · sudah dipakai: {terpakai(p).toLowerCase()}
          </p>
        </>
      )}
    />
  );
}

export function PenomoranPage() {
  return (
    <KerangkaDaftarForm
      namaData="penomoran"
      bisaBuat
      renderDaftar={({ buka }) => <DaftarPenomoran buka={buka} />}
      renderForm={(p) => <FormPenomoran {...p} />}
    />
  );
}
