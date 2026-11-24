import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiSave, FiTrash2 } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { InputUang } from "@/shared/ui/InputUang";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { useAkun, useDaftarAkun, useHapusAkun, useSimpanAkun, useTipeAkun } from "@/entities/akun";
import { usePreferensi } from "@/entities/preferensi";
import { useHak } from "@/entities/navigasi";
import { formatRupiah } from "@/shared/lib/uang";
import { tanggal } from "@/shared/lib/format";

const KOSONG = { tipe: "", kode: "", nama: "", induk_id: null, saldo_awal: "", catatan: "", nonaktif: false, bank_nama: "", nomor_rekening_akhir: "" };
const TANPA_INDUK = "__tanpa_induk";

const dariServer = (a) => ({
  tipe: a.tipe,
  kode: a.kode,
  nama: a.nama,
  induk_id: a.induk_id,
  saldo_awal: a.saldo_awal ?? "",
  catatan: a.catatan ?? "",
  nonaktif: a.nonaktif,
  bank_nama: a.bank_nama ?? "",
  nomor_rekening_akhir: a.nomor_rekening_akhir ?? "",
});
const baku = (x) =>
  JSON.stringify({ ...x, kode: x.kode.trim(), nama: x.nama.trim(), catatan: x.catatan.trim(), bank_nama: x.bank_nama.trim(), saldo_awal: x.saldo_awal || "0" });

/** "2027-01-01" → "2026-12-31" (sehari sebelumnya, tanpa zona waktu). */
function sehariSebelum(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Calon induk: akun bertipe sama, bukan dirinya atau keturunannya, dan belum punya transaksi/saldo awal. */
function pilihCalonInduk(daftar, id, isian) {
  if (!isian.tipe) return [];
  const turunan = new Set([id]);
  let bertambah = true;
  while (bertambah) {
    bertambah = false;
    for (const a of daftar) {
      if (a.induk_id && turunan.has(a.induk_id) && !turunan.has(a.id)) {
        turunan.add(a.id);
        bertambah = true;
      }
    }
  }
  return daftar.filter(
    (a) => a.tipe === isian.tipe && !turunan.has(a.id) && (a.id === isian.induk_id || (!a.terpakai && a.saldo_awal === null && !a.nonaktif)),
  );
}

function Isian({ label, htmlFor, petunjuk, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {petunjuk && <p className="text-xs text-muted-foreground">{petunjuk}</p>}
    </div>
  );
}

export function FormAkun({ id, tutup, setelahSimpan, tandaiBerubah }) {
  const q = useAkun(id);
  const semua = useDaftarAkun();
  const tipe = useTipeAkun();
  const pref = usePreferensi();
  const hak = useHak("akun_perkiraan");
  const hakHistori = useHak("histori_akun");
  const navigate = useNavigate();
  const simpan = useSimpanAkun();
  const hapus = useHapusAkun();
  const [awal, setAwal] = useState(id ? null : KOSONG);
  const [isian, setIsian] = useState(id ? null : KOSONG);

  if (q.data && !isian) {
    setAwal(dariServer(q.data));
    setIsian(dariServer(q.data));
  }

  const berubah = useMemo(() => Boolean(isian && awal && baku(isian) !== baku(awal)), [isian, awal]);
  useEffect(() => tandaiBerubah(berubah), [berubah, tandaiBerubah]);

  if (id && q.isError) return <ErrorState pesan={q.error?.message} />;
  if (!isian || tipe.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const data = q.data;
  const calonInduk = pilihCalonInduk(semua.data ?? [], id, isian);
  const bolehUbah = id ? hak.ubah : hak.buat;
  const tipeTerkunci = Boolean(data && (data.terpakai || data.saldo_awal !== null || data.punya_anak));
  const ubah = (bagian) => setIsian((x) => ({ ...x, ...bagian }));
  const kunci = id ?? "baru";
  const tglSaldoAwal = sehariSebelum(pref.data?.mulai_periode);

  const tekanSimpan = () =>
    simpan.mutate(
      { id, ...isian, saldo_awal: isian.saldo_awal || "0" },
      {
        onSuccess: (a) => {
          setAwal(dariServer(a));
          setIsian(dariServer(a));
          setelahSimpan(a.id, `${a.kode} ${a.nama}`);
        },
      },
    );

  return (
    <FormDokumen
      tab={[
        {
          kunci: "umum",
          judul: "Informasi Umum",
          isi: (
            <fieldset disabled={!bolehUbah} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Isian
                  label="Tipe akun"
                  htmlFor={`tipe-${kunci}`}
                  petunjuk={tipeTerkunci ? "Tidak bisa diganti karena akun sudah dipakai, punya saldo awal, atau punya sub akun." : null}
                >
                  <Select value={isian.tipe} onValueChange={(v) => ubah({ tipe: v, induk_id: null, ...(v === "kas_bank" ? {} : { bank_nama: "", nomor_rekening_akhir: "" }) })} disabled={!bolehUbah || tipeTerkunci}>
                    <SelectTrigger id={`tipe-${kunci}`}>
                      <SelectValue placeholder="Pilih tipe akun" />
                    </SelectTrigger>
                    <SelectContent>
                      {(tipe.data ?? []).map((t) => (
                        <SelectItem key={t.kode} value={t.kode}>
                          {t.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Isian>
                <Isian label="Sub akun dari" htmlFor={`induk-${kunci}`} petunjuk="Kosongkan kalau ini akun utama.">
                  <Select
                    value={isian.induk_id ?? TANPA_INDUK}
                    onValueChange={(v) => ubah({ induk_id: v === TANPA_INDUK ? null : v })}
                    disabled={!bolehUbah || !isian.tipe}
                  >
                    <SelectTrigger id={`induk-${kunci}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TANPA_INDUK}>Bukan sub akun</SelectItem>
                      {calonInduk.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.kode} {a.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Isian>
              </div>
              <div className="grid gap-4 md:grid-cols-[12rem_1fr]">
                <Isian label="Kode perkiraan" htmlFor={`kode-${kunci}`}>
                  <Input id={`kode-${kunci}`} value={isian.kode} maxLength={20} onChange={(e) => ubah({ kode: e.target.value })} placeholder="Misalnya: 110103" />
                </Isian>
                <Isian label="Nama" htmlFor={`nama-${kunci}`}>
                  <Input id={`nama-${kunci}`} value={isian.nama} maxLength={100} onChange={(e) => ubah({ nama: e.target.value })} placeholder="Misalnya: Bank BCA 123-456" />
                </Isian>
              </div>
              {isian.tipe === "kas_bank" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Isian label="Nama bank (boleh kosong)" htmlFor={`bank-${kunci}`} petunjuk="Kosongkan untuk kas tunai.">
                    <Input id={`bank-${kunci}`} value={isian.bank_nama} maxLength={50} onChange={(e) => ubah({ bank_nama: e.target.value })} placeholder="Misalnya: BCA" />
                  </Isian>
                  <Isian
                    label="Nomor rekening, 4 angka terakhir (boleh kosong)"
                    htmlFor={`norek-${kunci}`}
                    petunjuk="Dipakai untuk mencocokkan rekening tujuan dari aplikasi Operasional."
                  >
                    <Input
                      id={`norek-${kunci}`}
                      value={isian.nomor_rekening_akhir}
                      inputMode="numeric"
                      maxLength={4}
                      onChange={(e) => ubah({ nomor_rekening_akhir: e.target.value.replace(/[^0-9]/g, "") })}
                      placeholder="Misalnya: 1234"
                    />
                  </Isian>
                </div>
              )}
              {data?.rekening_utama && (
                <p className="rounded-lg bg-[hsl(var(--accent))]/50 px-3 py-2 text-sm text-foreground">
                  Ini rekening utama. Gantinya diatur di Pengaturan, menu Preferensi.
                </p>
              )}
              {data && (
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  Saldo saat ini: <span className="font-semibold tabular-nums text-foreground">{formatRupiah(data.saldo)}</span>
                </p>
              )}
            </fieldset>
          ),
        },
        {
          kunci: "saldo",
          judul: "Saldo Awal",
          isi: (
            <fieldset disabled={!bolehUbah} className="grid gap-4 md:grid-cols-2">
              <Isian
                label={`Saldo awal per ${tglSaldoAwal ? tanggal(tglSaldoAwal) : "akhir periode sebelumnya"}`}
                htmlFor={`saldo-${kunci}`}
                petunjuk={
                  data?.punya_anak
                    ? "Akun induk tidak punya saldo awal; isi di sub akunnya."
                    : "Ambil dari Neraca Accurate. Lawannya otomatis akun Ekuitas Saldo Awal. Kosongkan atau isi 0 untuk menghapus."
                }
              >
                <InputUang
                  id={`saldo-${kunci}`}
                  value={isian.saldo_awal}
                  onChange={(v) => ubah({ saldo_awal: v })}
                  negatif
                  placeholder="0"
                  disabled={!bolehUbah || data?.punya_anak}
                />
              </Isian>
            </fieldset>
          ),
        },
        {
          kunci: "lain",
          judul: "Lain-lain",
          isi: (
            <fieldset disabled={!bolehUbah} className="space-y-4">
              <Isian label="Catatan (boleh kosong)" htmlFor={`catatan-${kunci}`}>
                <textarea
                  id={`catatan-${kunci}`}
                  value={isian.catatan}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => ubah({ catatan: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Isian>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={isian.nonaktif} onChange={(e) => ubah({ nonaktif: e.target.checked })} />
                Nonaktif (tidak bisa dipilih di transaksi baru)
              </label>
            </fieldset>
          ),
        },
      ]}
      aksi={[
        ...(bolehUbah
          ? [
              {
                kunci: "simpan",
                label: "Simpan",
                labelMemuat: "Menyimpan…",
                ikon: FiSave,
                nada: "utama",
                onClick: tekanSimpan,
                nonaktif: !isian.tipe || !isian.kode.trim() || !isian.nama.trim() || (id && !berubah),
                memuat: simpan.isPending,
              },
            ]
          : []),
        ...(id && hakHistori.lihat
          ? [{ kunci: "histori", label: "Lihat histori", ikon: FiClock, onClick: () => navigate(`/buku-besar/histori-akun?akun=${id}`) }]
          : []),
        ...(id && hak.hapus
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
                  judul: `Hapus akun ${isian.kode} ${isian.nama}?`,
                  isi: "Akun yang sudah dipakai, punya saldo awal, atau punya sub akun tidak bisa dihapus; nonaktifkan saja. Penghapusan tercatat di Log Aktivitas.",
                  tombol: "Ya, hapus",
                },
              },
            ]
          : []),
      ]}
    />
  );
}
