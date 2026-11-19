// Pengaturan > Pengguna: akun yang boleh masuk, pola daftar lalu formulir.
import { useState } from "react";
import { KerangkaDaftarForm } from "@/widgets/daftar-form/ui/KerangkaDaftarForm";
import { DaftarData } from "@/widgets/daftar-form/ui/DaftarData";
import { cn } from "@/shared/lib/cn";
import { tanggalJam } from "@/shared/lib/format";
import { NAMA_PERAN, useSesi } from "@/entities/sesi";
import { useDaftarPengguna } from "@/entities/pengguna";
import { FormPengguna } from "./ui/FormPengguna";

function LencanaAktif({ aktif }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        aktif ? "border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function AksesGrup({ p }) {
  if (p.peran === "admin") return <span className="text-muted-foreground">Semua menu</span>;
  if (!p.akses_grup_nama) return <span className="font-medium text-[hsl(var(--warning))]">Belum ada</span>;
  return p.akses_grup_nama;
}

function DaftarPengguna({ buka }) {
  const { data: saya } = useSesi();
  const q = useDaftarPengguna();
  const [cari, setCari] = useState("");
  const baris = (q.data ?? []).filter((p) => `${p.nama} ${p.email}`.toLowerCase().includes(cari.trim().toLowerCase()));
  const kolom = [
    {
      kunci: "nama",
      judul: "Nama",
      render: (p) => (
        <>
          <p className="font-medium text-foreground">
            {p.nama}
            {p.id === saya?.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
          </p>
          <p className="text-xs text-muted-foreground">{p.email}</p>
        </>
      ),
    },
    { kunci: "peran", judul: "Level", render: (p) => NAMA_PERAN[p.peran] ?? p.peran },
    { kunci: "akses_grup_nama", judul: "Akses grup", render: (p) => <AksesGrup p={p} /> },
    { kunci: "aktif", judul: "Status", render: (p) => <LencanaAktif aktif={p.aktif} /> },
    { kunci: "login_terakhir_at", judul: "Terakhir masuk", render: (p) => (p.login_terakhir_at ? tanggalJam(p.login_terakhir_at) : "Belum pernah") },
  ];
  return (
    <DaftarData
      kolom={kolom}
      baris={baris}
      memuat={q.isPending}
      galat={q.isError ? q.error : null}
      onMuatUlang={() => q.refetch()}
      onPilih={(p) => buka(p.id, p.nama)}
      cari={cari}
      onCari={setCari}
      kosong={{ judul: cari ? "Tidak ada akun yang cocok" : "Belum ada akun" }}
      kartuHp={(p) => (
        <>
          <p className="font-medium text-foreground">
            {p.nama}
            {p.id === saya?.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
          </p>
          <p className="break-all text-xs text-muted-foreground">{p.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-foreground">{NAMA_PERAN[p.peran] ?? p.peran}</span>
            <span className="text-muted-foreground">·</span>
            <AksesGrup p={p} />
            <LencanaAktif aktif={p.aktif} />
          </div>
        </>
      )}
    />
  );
}

export function PenggunaPage() {
  return (
    <KerangkaDaftarForm
      namaData="pengguna"
      bisaBuat
      renderDaftar={({ buka }) => <DaftarPengguna buka={buka} />}
      renderForm={(p) => <FormPengguna {...p} />}
    />
  );
}
