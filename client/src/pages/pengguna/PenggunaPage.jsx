import { useState } from "react";
import { FiKey, FiMoreVertical, FiUserCheck, FiUserPlus, FiUserX, FiUsers } from "react-icons/fi";
import { CardBox, EmptyState, ErrorState, Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/cn";
import { tanggalJam } from "@/shared/lib/format";
import { NAMA_PERAN, useSesi } from "@/entities/sesi";
import { useDaftarPengguna, useUbahPengguna } from "@/entities/pengguna";
import { DialogAturSandi, DialogTambahPengguna } from "./ui/DialogPengguna";

function LencanaAktif({ aktif }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        aktif
          ? "border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function MenuAksi({ p, diriSendiri, onAturSandi }) {
  const ubah = useUbahPengguna();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted hover:text-foreground" aria-label={`Aksi untuk ${p.nama}`}>
          <FiMoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onSelect={() => onAturSandi(p)}>
          <FiKey className="mr-2 h-4 w-4" /> Atur ulang kata sandi
        </DropdownMenuItem>
        {!diriSendiri && (
          <>
            <DropdownMenuItem onSelect={() => ubah.mutate({ id: p.id, peran: p.peran === "admin" ? "staf" : "admin" })}>
              <FiUsers className="mr-2 h-4 w-4" /> Jadikan {p.peran === "admin" ? "Staf" : "Admin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => ubah.mutate({ id: p.id, aktif: !p.aktif })}
              className={p.aktif ? "text-destructive focus:text-destructive" : ""}
            >
              {p.aktif ? <FiUserX className="mr-2 h-4 w-4" /> : <FiUserCheck className="mr-2 h-4 w-4" />}
              {p.aktif ? "Nonaktifkan akun" : "Aktifkan kembali"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PenggunaPage() {
  const { data: saya } = useSesi();
  const q = useDaftarPengguna();
  const [bukaTambah, setBukaTambah] = useState(false);
  const [aturSandi, setAturSandi] = useState(null);
  const daftar = q.data ?? [];

  return (
    <div className="space-y-6">
      <CardBox
        title="Daftar akun"
        subtitle="Staf boleh melihat dashboard, mengunggah, mengecek, dan menyetujui laporan. Admin juga boleh mengelola akun."
        action={
          <Button onClick={() => setBukaTambah(true)}>
            <FiUserPlus aria-hidden /> Tambah pengguna
          </Button>
        }
      >
        {q.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState pesan={q.error?.message} aksi={<Button onClick={() => q.refetch()}>Coba lagi</Button>} />
        ) : daftar.length === 0 ? (
          <EmptyState ikon={FiUsers} judul="Belum ada akun lain" />
        ) : (
          <>
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Nama</th>
                    <th className="px-3 py-2 text-left font-medium">Peran</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Terakhir masuk</th>
                    <th className="px-3 py-2 text-right font-medium">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((p) => (
                    <tr key={p.id} className="border-b border-border/40">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-foreground">
                          {p.nama}
                          {p.id === saya?.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </td>
                      <td className="px-3 py-2.5">{NAMA_PERAN[p.peran] ?? p.peran}</td>
                      <td className="px-3 py-2.5">
                        <LencanaAktif aktif={p.aktif} />
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.login_terakhir_at ? tanggalJam(p.login_terakhir_at) : "Belum pernah"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <MenuAksi p={p} diriSendiri={p.id === saya?.id} onAturSandi={setAturSandi} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 md:hidden">
              {daftar.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {p.nama}
                      {p.id === saya?.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">{p.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-foreground">{NAMA_PERAN[p.peran] ?? p.peran}</span>
                      <LencanaAktif aktif={p.aktif} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Terakhir masuk: {p.login_terakhir_at ? tanggalJam(p.login_terakhir_at) : "belum pernah"}
                    </p>
                  </div>
                  <MenuAksi p={p} diriSendiri={p.id === saya?.id} onAturSandi={setAturSandi} />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBox>

      <DialogTambahPengguna buka={bukaTambah} onTutup={() => setBukaTambah(false)} />
      <DialogAturSandi pengguna={aturSandi} onTutup={() => setAturSandi(null)} />
    </div>
  );
}
