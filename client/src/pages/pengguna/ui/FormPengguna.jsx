import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiSave } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { InputKataSandi } from "@/shared/ui/InputKataSandi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/lib/cn";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { useSesi } from "@/entities/sesi";
import { buatKataSandiAcak, useDaftarPengguna, useTambahPengguna, useUbahPengguna } from "@/entities/pengguna";
import { useDaftarAksesGrup } from "@/entities/akses-grup";

const TANPA_GRUP = "tanpa-grup";
const BARU = { email: "", nama: "", peran: "staf", akses_grup_id: null, aktif: true };

const LEVEL = [
  { nilai: "admin", nama: "Administrator", ket: "Bisa membuka semua menu, termasuk Pengaturan." },
  { nilai: "staf", nama: "Operator", ket: "Hanya bisa membuka menu yang dicentang di akses grupnya." },
];

const dariServer = (p) => ({ email: p.email, nama: p.nama, peran: p.peran, akses_grup_id: p.akses_grup_id, aktif: p.aktif });

function Kolom({ label, htmlFor, petunjuk, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {petunjuk && <p className="text-xs text-muted-foreground">{petunjuk}</p>}
    </div>
  );
}

export function FormPengguna({ id, setelahSimpan, tandaiBerubah }) {
  const { data: saya } = useSesi();
  const daftar = useDaftarPengguna();
  const grup = useDaftarAksesGrup();
  const tambah = useTambahPengguna();
  const ubahAkun = useUbahPengguna();
  const tersimpan = id ? daftar.data?.find((p) => p.id === id) : null;

  const [awal, setAwal] = useState(id ? null : BARU);
  const [isian, setIsian] = useState(id ? null : BARU);
  const [sandi, setSandi] = useState("");
  if (tersimpan && !isian) {
    setAwal(dariServer(tersimpan));
    setIsian(dariServer(tersimpan));
  }

  const berubah = useMemo(() => Boolean(isian && awal && (JSON.stringify(isian) !== JSON.stringify(awal) || sandi)), [isian, awal, sandi]);
  useEffect(() => tandaiBerubah(berubah), [berubah, tandaiBerubah]);

  if (daftar.isError) return <ErrorState pesan={daftar.error?.message} />;
  if (!isian) return <Skeleton className="h-64 w-full rounded-xl" />;

  const diriSendiri = id && id === saya?.id;
  const ubah = (bagian) => setIsian((x) => ({ ...x, ...bagian }));
  const sandiKurang = sandi.length > 0 && sandi.length < 8;
  const bisaSimpan = isian.nama.trim() && (id ? berubah : isian.email.trim() && sandi.length >= 8) && !sandiKurang;

  const tekanSimpan = () => {
    const aksesGrup = isian.peran === "admin" ? null : isian.akses_grup_id;
    const selesai = (p) => {
      setAwal(dariServer(p));
      setIsian(dariServer(p));
      setSandi("");
      setelahSimpan(p.id, p.nama);
    };
    if (!id) {
      tambah.mutate({ email: isian.email, nama: isian.nama, peran: isian.peran, kata_sandi: sandi, akses_grup_id: aksesGrup }, { onSuccess: selesai });
      return;
    }
    const body = { id };
    if (isian.nama !== awal.nama) body.nama = isian.nama;
    if (isian.peran !== awal.peran) body.peran = isian.peran;
    if (isian.aktif !== awal.aktif) body.aktif = isian.aktif;
    if (aksesGrup !== awal.akses_grup_id) body.akses_grup_id = aksesGrup;
    if (sandi) body.kata_sandi = sandi;
    ubahAkun.mutate(body, { onSuccess: selesai });
  };

  const kunciId = id ?? "baru";

  return (
    <FormDokumen
      tab={[
        {
          kunci: "umum",
          judul: "Umum",
          isi: (
            <div className="grid gap-4 md:grid-cols-2">
              <Kolom label="Nama" htmlFor={`nama-${kunciId}`}>
                <Input id={`nama-${kunciId}`} value={isian.nama} maxLength={100} onChange={(e) => ubah({ nama: e.target.value })} />
              </Kolom>
              <Kolom label="Email" htmlFor={`email-${kunciId}`} petunjuk={id ? "Email tidak bisa diubah setelah akun dibuat." : "Dipakai untuk masuk."}>
                <Input
                  id={`email-${kunciId}`}
                  type="email"
                  value={isian.email}
                  disabled={Boolean(id)}
                  onChange={(e) => ubah({ email: e.target.value })}
                  autoComplete="off"
                />
              </Kolom>
              <fieldset className="space-y-2 md:col-span-2">
                <legend className="text-sm font-medium text-foreground">Level</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {LEVEL.map((l) => (
                    <label
                      key={l.nilai}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border p-3",
                        isian.peran === l.nilai ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]" : "border-border hover:bg-muted/60",
                        diriSendiri && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="radio"
                        name={`level-${kunciId}`}
                        className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={isian.peran === l.nilai}
                        disabled={diriSendiri}
                        onChange={() => ubah({ peran: l.nilai })}
                      />
                      <span>
                        <span className="block font-semibold text-foreground">{l.nama}</span>
                        <span className="block text-xs text-muted-foreground">{l.ket}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {diriSendiri && <p className="text-xs text-muted-foreground">Anda tidak bisa mengubah level akun Anda sendiri.</p>}
              </fieldset>
              <Kolom
                label="Akses grup"
                petunjuk={
                  isian.peran === "admin"
                    ? "Administrator selalu bisa membuka semua menu."
                    : !isian.akses_grup_id
                      ? "Tanpa akses grup, Operator belum bisa membuka menu apa pun."
                      : undefined
                }
              >
                <Select
                  value={isian.peran === "admin" ? TANPA_GRUP : isian.akses_grup_id ?? TANPA_GRUP}
                  onValueChange={(v) => ubah({ akses_grup_id: v === TANPA_GRUP ? null : v })}
                  disabled={isian.peran === "admin"}
                >
                  <SelectTrigger aria-label="Akses grup">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TANPA_GRUP}>{isian.peran === "admin" ? "Semua menu" : "Belum ada"}</SelectItem>
                    {(grup.data ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Kolom>
              {id && (
                <Kolom label="Status" petunjuk={diriSendiri ? "Anda tidak bisa menonaktifkan akun Anda sendiri." : "Akun nonaktif tidak bisa masuk."}>
                  <label className={cn("flex h-10 items-center gap-2.5", diriSendiri && "opacity-60")}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={isian.aktif}
                      disabled={diriSendiri}
                      onChange={(e) => ubah({ aktif: e.target.checked })}
                    />
                    <span className="text-sm text-foreground">Akun aktif</span>
                  </label>
                </Kolom>
              )}
            </div>
          ),
        },
        {
          kunci: "sandi",
          judul: "Kata sandi",
          isi: (
            <div className="max-w-md space-y-1.5">
              <div className="flex items-end justify-between gap-2">
                <Label htmlFor={`sandi-${kunciId}`}>{id ? "Kata sandi baru (kosongkan kalau tidak diganti)" : "Kata sandi"}</Label>
                <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 hover:bg-muted hover:text-foreground" onClick={() => setSandi(buatKataSandiAcak())}>
                  <FiRefreshCw aria-hidden /> Buat acak
                </Button>
              </div>
              <InputKataSandi id={`sandi-${kunciId}`} value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="new-password" />
              <p className={cn("text-xs", sandiKurang ? "text-destructive" : "text-muted-foreground")}>
                Minimal 8 karakter. Berikan kata sandinya langsung ke pemilik akun.
              </p>
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
          memuat: tambah.isPending || ubahAkun.isPending,
        },
      ]}
    />
  );
}
