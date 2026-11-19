import { useEffect, useMemo, useState } from "react";
import { FiSave, FiSearch, FiTrash2 } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { useAksesGrup, useHapusAksesGrup, useMenuMatriks, useSimpanAksesGrup } from "@/entities/akses-grup";
import { useDaftarPengguna } from "@/entities/pengguna";
import { MatriksHak } from "./MatriksHak";

const KOSONG = { nama: "", keterangan: "", anggota: [], hak: {} };

/** Bentuk baku untuk membandingkan isian dengan yang tersimpan. */
function baku(x) {
  const hak = Object.fromEntries(
    Object.entries(x.hak ?? {})
      .filter(([, h]) => h && (h.lihat || h.buat || h.ubah || h.hapus))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return JSON.stringify({ nama: x.nama.trim(), keterangan: x.keterangan.trim(), anggota: [...x.anggota].sort(), hak });
}

const dariServer = (g) => ({ nama: g.nama, keterangan: g.keterangan ?? "", anggota: g.anggota.map((a) => a.id), hak: g.hak ?? {} });

function PilihAnggota({ grupId, anggota, onUbah }) {
  const q = useDaftarPengguna();
  const [cari, setCari] = useState("");
  const operator = (q.data ?? []).filter((p) => p.peran === "staf" && (p.aktif || anggota.includes(p.id)));
  const tampil = operator.filter((p) => `${p.nama} ${p.email}`.toLowerCase().includes(cari.trim().toLowerCase()));
  const alihkan = (id) => onUbah(anggota.includes(id) ? anggota.filter((x) => x !== id) : [...anggota, id]);

  if (q.isPending) return <Skeleton className="h-24 w-full" />;
  if (!operator.length) {
    return <p className="text-sm text-muted-foreground">Belum ada akun Operator. Buat dulu di Pengaturan, menu Pengguna.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="relative sm:w-72">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama atau email…" className="h-9 pl-9" aria-label="Cari anggota" />
      </div>
      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {tampil.map((p) => {
          const diGrupLain = p.akses_grup_id && p.akses_grup_id !== grupId && p.akses_grup_nama;
          return (
            <li key={p.id}>
              <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/60">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={anggota.includes(p.id)}
                  onChange={() => alihkan(p.id)}
                />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{p.nama}</span>
                  <span className="block break-all text-xs text-muted-foreground">{p.email}</span>
                  {diGrupLain && (
                    <span className="mt-0.5 block text-xs text-[hsl(var(--warning))]">
                      Sekarang di grup {p.akses_grup_nama}. Kalau dicentang, ia pindah ke grup ini.
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
        {tampil.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Tidak ada yang cocok dengan &ldquo;{cari}&rdquo;.</li>}
      </ul>
      <p className="text-xs text-muted-foreground">{anggota.length} orang dipilih. Administrator tidak tercantum karena selalu bisa membuka semua menu.</p>
    </div>
  );
}

export function FormAksesGrup({ id, tutup, setelahSimpan, tandaiBerubah }) {
  const q = useAksesGrup(id);
  const matriks = useMenuMatriks();
  const simpan = useSimpanAksesGrup();
  const hapus = useHapusAksesGrup();
  const [awal, setAwal] = useState(id ? null : KOSONG);
  const [isian, setIsian] = useState(id ? null : KOSONG);

  // Data tersimpan dipakai sekali, saat pertama dimuat, supaya isian yang sedang diketik tidak tertimpa.
  // (Diatur saat render, pola React untuk state turunan, bukan di effect.)
  if (q.data && !isian) {
    setAwal(dariServer(q.data));
    setIsian(dariServer(q.data));
  }

  const berubah = useMemo(() => Boolean(isian && awal && baku(isian) !== baku(awal)), [isian, awal]);
  useEffect(() => tandaiBerubah(berubah), [berubah, tandaiBerubah]);

  if (id && q.isError) return <ErrorState pesan={q.error?.message} />;
  if (!isian || matriks.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const ubah = (bagian) => setIsian((x) => ({ ...x, ...bagian }));
  const tekanSimpan = () =>
    simpan.mutate(
      { id, nama: isian.nama, keterangan: isian.keterangan, anggota: isian.anggota, hak: isian.hak },
      {
        onSuccess: (g) => {
          setAwal(dariServer(g));
          setIsian(dariServer(g));
          setelahSimpan(g.id, g.nama);
        },
      },
    );

  return (
    <FormDokumen
      tab={[
        {
          kunci: "umum",
          judul: "Umum",
          isi: (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`nama-${id ?? "baru"}`}>Nama grup</Label>
                  <Input
                    id={`nama-${id ?? "baru"}`}
                    value={isian.nama}
                    maxLength={60}
                    onChange={(e) => ubah({ nama: e.target.value })}
                    placeholder="Misalnya: Staf Keuangan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`ket-${id ?? "baru"}`}>Keterangan (boleh kosong)</Label>
                  <Input
                    id={`ket-${id ?? "baru"}`}
                    value={isian.keterangan}
                    maxLength={200}
                    onChange={(e) => ubah({ keterangan: e.target.value })}
                    placeholder="Untuk apa grup ini"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Anggota</p>
                <PilihAnggota grupId={id} anggota={isian.anggota} onUbah={(anggota) => ubah({ anggota })} />
              </div>
            </div>
          ),
        },
        {
          kunci: "hak",
          judul: "Hak Akses",
          isi: <MatriksHak modul={matriks.data ?? []} hak={isian.hak} onUbah={(hak) => ubah({ hak })} />,
        },
      ]}
      aksi={[
        {
          kunci: "simpan",
          label: "Simpan",
          labelMemuat: "Menyimpan…",
          ikon: FiSave,
          nada: "utama",
          onClick: tekanSimpan,
          nonaktif: !isian.nama.trim() || (id && !berubah),
          memuat: simpan.isPending,
        },
        ...(id
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
                  judul: `Hapus akses grup ${isian.nama}?`,
                  isi: "Akses grup yang masih punya anggota tidak bisa dihapus. Penghapusan tercatat di Log Aktivitas.",
                  tombol: "Ya, hapus",
                },
              },
            ]
          : []),
      ]}
    />
  );
}
