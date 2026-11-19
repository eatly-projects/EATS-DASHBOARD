import { useEffect, useMemo, useState } from "react";
import { FiSave, FiTrash2 } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useTertunda } from "@/shared/lib/useTertunda";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import {
  NAMA_RESET,
  useDaftarPenomoran,
  useHapusPenomoran,
  usePratinjauPenomoran,
  useSimpanPenomoran,
  useTipeTransaksi,
} from "@/entities/penomoran";
import { SusunanNomor } from "./SusunanNomor";

const BARU = {
  nama: "",
  tipe_transaksi: "jurnal_umum",
  format: [{ jenis: "teks", nilai: "" }, { jenis: "tahun" }, { jenis: "teks", nilai: "." }, { jenis: "bulan" }, { jenis: "teks", nilai: "." }, { jenis: "counter" }],
  digit_counter: 5,
  reset: "bulan",
  bawaan: false,
};

const dariServer = (p) => ({
  nama: p.nama,
  tipe_transaksi: p.tipe_transaksi,
  format: p.format,
  digit_counter: p.digit_counter,
  reset: p.reset,
  bawaan: p.bawaan,
});

function Kolom({ label, htmlFor, children, petunjuk }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {petunjuk && <p className="text-xs text-muted-foreground">{petunjuk}</p>}
    </div>
  );
}

export function FormPenomoran({ id, tutup, setelahSimpan, tandaiBerubah }) {
  const daftar = useDaftarPenomoran();
  const tipe = useTipeTransaksi();
  const simpan = useSimpanPenomoran();
  const hapus = useHapusPenomoran();
  const tersimpan = id ? daftar.data?.find((p) => p.id === id) : null;

  const [awal, setAwal] = useState(id ? null : BARU);
  const [isian, setIsian] = useState(id ? null : BARU);
  if (tersimpan && !isian) {
    setAwal(dariServer(tersimpan));
    setIsian(dariServer(tersimpan));
  }

  const berubah = useMemo(() => Boolean(isian && awal && JSON.stringify(isian) !== JSON.stringify(awal)), [isian, awal]);
  useEffect(() => tandaiBerubah(berubah), [berubah, tandaiBerubah]);

  const susunan = useMemo(
    () => (isian ? { format: isian.format, digit_counter: Number(isian.digit_counter), reset: isian.reset } : null),
    [isian],
  );
  const susunanTertunda = useTertunda(susunan);
  const pratinjau = usePratinjauPenomoran(susunanTertunda, Boolean(susunanTertunda && Number.isInteger(susunanTertunda.digit_counter)));

  if (daftar.isError) return <ErrorState pesan={daftar.error?.message} />;
  if (!isian) return <Skeleton className="h-64 w-full rounded-xl" />;

  const terpakai = tersimpan?.terpakai ?? 0;
  const terkunci = terpakai > 0;
  const ubah = (bagian) => setIsian((x) => ({ ...x, ...bagian }));
  const galatFormat = pratinjau.data?.galat;
  const kunciId = id ?? "baru";

  const tekanSimpan = () =>
    simpan.mutate(
      { id, ...isian, nama: isian.nama.trim(), digit_counter: Number(isian.digit_counter) },
      {
        onSuccess: (p) => {
          setAwal(dariServer(p));
          setIsian(dariServer(p));
          setelahSimpan(p.id, p.nama);
        },
      },
    );

  const bisaHapus = id && !tersimpan?.bawaan && terpakai === 0;

  return (
    <FormDokumen
      tab={[
        {
          kunci: "umum",
          judul: "Umum",
          isi: (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Kolom label="Nama" htmlFor={`nama-${kunciId}`}>
                  <Input id={`nama-${kunciId}`} value={isian.nama} maxLength={60} onChange={(e) => ubah({ nama: e.target.value })} placeholder="Misalnya: Jurnal Umum 2027" />
                </Kolom>
                <Kolom label="Tipe transaksi">
                  <Select value={isian.tipe_transaksi} onValueChange={(v) => ubah({ tipe_transaksi: v })} disabled={terkunci}>
                    <SelectTrigger aria-label="Tipe transaksi">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(tipe.data ?? []).map((t) => (
                        <SelectItem key={t.kode} value={t.kode}>
                          {t.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Kolom>
                <Kolom label="Nomor urut diulang dari 1" petunjuk="Disarankan setiap bulan, dengan Tahun dan Bulan di susunan nomor.">
                  <Select value={isian.reset} onValueChange={(v) => ubah({ reset: v })} disabled={terkunci}>
                    <SelectTrigger aria-label="Nomor urut diulang dari 1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NAMA_RESET).map(([kode, nama]) => (
                        <SelectItem key={kode} value={kode}>
                          {nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Kolom>
                <Kolom label="Jumlah digit nomor urut" htmlFor={`digit-${kunciId}`} petunjuk="Misalnya 5 menjadi 00001, 00002, dan seterusnya.">
                  <Input
                    id={`digit-${kunciId}`}
                    type="number"
                    min={1}
                    max={10}
                    value={isian.digit_counter}
                    disabled={terkunci}
                    onChange={(e) => ubah({ digit_counter: e.target.value === "" ? "" : Number(e.target.value) })}
                  />
                </Kolom>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Susunan nomor</p>
                {terkunci && (
                  <p className="rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 px-3 py-2 text-sm text-foreground">
                    Sudah dipakai untuk {terpakai.toLocaleString("id-ID")} nomor. Susunannya dikunci supaya tidak ada nomor kembar; buat penomoran baru bila perlu.
                  </p>
                )}
                <SusunanNomor format={isian.format} onUbah={(format) => ubah({ format })} nonaktif={terkunci} />
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">Contoh hasil (nomor pertama, tanggal hari ini)</p>
                {galatFormat ? (
                  <p className="mt-1 text-sm font-medium text-[hsl(var(--warning))]">{galatFormat}</p>
                ) : (
                  <p className="mt-1 break-all text-2xl font-bold tabular-nums text-foreground">{pratinjau.data?.contoh ?? "…"}</p>
                )}
              </div>

              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={isian.bawaan}
                  disabled={awal?.bawaan && Boolean(id)}
                  onChange={(e) => ubah({ bawaan: e.target.checked })}
                />
                <span className="text-sm text-foreground">
                  Jadikan bawaan untuk tipe ini
                  <span className="block text-xs text-muted-foreground">
                    {awal?.bawaan && id
                      ? "Ini penomoran bawaan. Untuk menggantinya, jadikan penomoran lain sebagai bawaan."
                      : "Penomoran bawaan dipakai otomatis setiap kali transaksi tipe ini dibuat."}
                  </span>
                </span>
              </label>
            </div>
          ),
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
          nonaktif: !isian.nama.trim() || Boolean(galatFormat) || (id && !berubah),
          memuat: simpan.isPending,
        },
        ...(bisaHapus
          ? [
              {
                kunci: "hapus",
                label: "Hapus",
                labelMemuat: "Menghapus…",
                ikon: FiTrash2,
                nada: "bahaya",
                memuat: hapus.isPending,
                onClick: () => hapus.mutate(id, { onSuccess: tutup }),
                konfirmasi: { judul: `Hapus penomoran ${isian.nama}?`, isi: "Penghapusan tercatat di Log Aktivitas.", tombol: "Ya, hapus" },
              },
            ]
          : []),
      ]}
    />
  );
}
