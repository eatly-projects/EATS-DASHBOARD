// Pengaturan > Preferensi: data perusahaan dan pembatasan periode, satu tombol Simpan.
import { useState } from "react";
import { FiSave } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { BULAN_PANJANG, tanggal } from "@/shared/lib/format";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { usePreferensi, useSimpanPreferensi } from "@/entities/preferensi";
import { PilihAkun } from "@/features/pilih-akun/ui/PilihAkun";

function Kolom({ label, htmlFor, petunjuk, galat, children, className }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {galat ? <p className="text-xs text-destructive">{galat}</p> : petunjuk && <p className="text-xs text-muted-foreground">{petunjuk}</p>}
    </div>
  );
}

const kunciDari = (p) => JSON.stringify(p);

export function PreferensiPage() {
  const q = usePreferensi();
  const simpan = useSimpanPreferensi();
  const [isian, setIsian] = useState(null);
  const [awal, setAwal] = useState(null);
  if (q.data && !isian) {
    setIsian(q.data);
    setAwal(q.data);
  }

  if (q.isError) return <ErrorState pesan={q.error?.message} />;
  if (!isian) return <Skeleton className="h-72 w-full rounded-xl" />;

  const ubah = (bagian) => setIsian((x) => ({ ...x, ...bagian }));
  const [tahunMulai, bulanMulai] = isian.mulai_periode.split("-");
  const npwpSalah = isian.npwp !== "" && !/^[0-9]{15,16}$/.test(isian.npwp);
  const berubah = kunciDari(isian) !== kunciDari(awal);
  const bisaSimpan = berubah && isian.nama.trim() && !npwpSalah && (isian.kunci_sampai === null || isian.kunci_sampai);

  const tekanSimpan = () =>
    simpan.mutate(isian, {
      onSuccess: (data) => {
        setIsian(data);
        setAwal(data);
      },
    });

  return (
    <FormDokumen
      tab={[
        {
          kunci: "perusahaan",
          judul: "Perusahaan",
          isi: (
            <div className="grid gap-4 md:grid-cols-2">
              <Kolom label="Nama perusahaan" htmlFor="pref-nama" className="md:col-span-2">
                <Input id="pref-nama" value={isian.nama} maxLength={150} onChange={(e) => ubah({ nama: e.target.value })} />
              </Kolom>
              <Kolom label="Alamat" htmlFor="pref-alamat" className="md:col-span-2">
                <textarea
                  id="pref-alamat"
                  value={isian.alamat}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => ubah({ alamat: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                />
              </Kolom>
              <Kolom label="Telepon" htmlFor="pref-telepon">
                <Input id="pref-telepon" value={isian.telepon} maxLength={40} onChange={(e) => ubah({ telepon: e.target.value })} />
              </Kolom>
              <Kolom label="Email" htmlFor="pref-email">
                <Input id="pref-email" type="email" value={isian.email} maxLength={150} onChange={(e) => ubah({ email: e.target.value })} />
              </Kolom>
              <Kolom
                label="NPWP"
                htmlFor="pref-npwp"
                petunjuk="15 atau 16 angka, tanpa titik dan strip."
                galat={npwpSalah ? "NPWP harus 15 atau 16 angka, tanpa titik dan strip." : null}
              >
                <Input id="pref-npwp" inputMode="numeric" value={isian.npwp} maxLength={16} onChange={(e) => ubah({ npwp: e.target.value.trim() })} />
              </Kolom>
            </div>
          ),
        },
        {
          kunci: "pembatasan",
          judul: "Pembatasan",
          isi: (
            <div className="space-y-6">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">Periode akuntansi dimulai</legend>
                <div className="flex flex-wrap gap-2">
                  <Select value={bulanMulai} onValueChange={(b) => ubah({ mulai_periode: `${tahunMulai}-${b}-01` })}>
                    <SelectTrigger className="w-44" aria-label="Bulan mulai">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BULAN_PANJANG.map((nama, i) => (
                        <SelectItem key={nama} value={String(i + 1).padStart(2, "0")}>
                          {nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={2020}
                    max={2100}
                    value={Number(tahunMulai)}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      if (t >= 2020 && t <= 2100) ubah({ mulai_periode: `${t}-${bulanMulai}-01` });
                    }}
                    className="w-28"
                    aria-label="Tahun mulai"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Transaksi bertanggal sebelum {tanggal(isian.mulai_periode)} tidak bisa dicatat.</p>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">Kunci transaksi</legend>
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                    checked={isian.kunci_sampai !== null}
                    onChange={(e) => ubah({ kunci_sampai: e.target.checked ? awal.kunci_sampai ?? "" : null })}
                  />
                  <span className="text-sm text-foreground">Kunci transaksi sampai tanggal</span>
                </label>
                {isian.kunci_sampai !== null && (
                  <Input
                    type="date"
                    value={isian.kunci_sampai}
                    onChange={(e) => ubah({ kunci_sampai: e.target.value })}
                    className="w-48"
                    aria-label="Kunci sampai tanggal"
                  />
                )}
                <p className="text-sm text-muted-foreground">
                  {isian.kunci_sampai
                    ? `Transaksi bertanggal sampai ${tanggal(isian.kunci_sampai)} tidak bisa dibuat, diubah, atau dihapus.`
                    : isian.kunci_sampai === ""
                      ? "Pilih tanggalnya."
                      : "Tidak dikunci. Pakai kunci setelah laporan satu bulan selesai diperiksa."}
                </p>
              </fieldset>
            </div>
          ),
        },
        {
          kunci: "akun",
          judul: "Akun Perkiraan",
          isi: (
            <div className="grid gap-4 md:grid-cols-2">
              <Kolom
                label="Ekuitas Saldo Awal"
                htmlFor="pref-ekuitas"
                petunjuk="Lawan otomatis setiap saldo awal akun. Tidak bisa diganti setelah ada saldo awal."
              >
                <PilihAkun
                  id="pref-ekuitas"
                  tipe={["modal"]}
                  value={isian.akun_ekuitas_saldo_awal_id}
                  label={isian.akun_ekuitas_saldo_awal_nama}
                  onChange={(a) => ubah({ akun_ekuitas_saldo_awal_id: a.id, akun_ekuitas_saldo_awal_nama: `${a.kode} ${a.nama}` })}
                />
              </Kolom>
              <Kolom label="Laba Ditahan" htmlFor="pref-laba" petunjuk="Laba tahun-tahun sebelumnya ditampilkan di akun ini pada Neraca.">
                <PilihAkun
                  id="pref-laba"
                  tipe={["modal"]}
                  value={isian.akun_laba_ditahan_id}
                  label={isian.akun_laba_ditahan_nama}
                  onChange={(a) => ubah({ akun_laba_ditahan_id: a.id, akun_laba_ditahan_nama: `${a.kode} ${a.nama}` })}
                />
              </Kolom>
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
          nonaktif: !bisaSimpan,
          memuat: simpan.isPending,
        },
      ]}
    />
  );
}
