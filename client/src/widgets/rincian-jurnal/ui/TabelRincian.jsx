// Rincian transaksi yang bisa ditambah/dihapus barisnya. Dipakai Jurnal Umum
// (Akun, Debit, Kredit, Departemen, Catatan) dan Pencatatan Beban (Akun, Nilai,
// Departemen, Catatan). Di laptop berupa tabel; di HP dan tablet tiap baris jadi kartu.
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { Input } from "@/shared/ui/input";
import { InputUang } from "@/shared/ui/InputUang";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { dariSen, formatRupiah, jumlahkan, keSen, lebihDariNol } from "@/shared/lib/uang";
import { PilihAkun } from "@/features/pilih-akun/ui/PilihAkun";
import { PilihDepartemen } from "@/features/pilih-departemen/ui/PilihDepartemen";

let urutan = 0;
export const barisKosong = () => ({
  kunci: `baris-${++urutan}`,
  akun_id: null,
  akun_label: "",
  debit: "",
  kredit: "",
  nilai: "",
  departemen_id: null,
  departemen_label: "",
  catatan: "",
});

/** Baris yang benar-benar diisi (punya akun atau angka). */
export const barisTerisi = (baris) => baris.filter((b) => b.akun_id || lebihDariNol(b.debit) || lebihDariNol(b.kredit) || lebihDariNol(b.nilai));

export function totalRincian(mode, baris) {
  if (mode === "beban") {
    const total = jumlahkan(baris.map((b) => b.nilai));
    return { debit: total, kredit: total, selisih: "0.00" };
  }
  const debit = jumlahkan(baris.map((b) => b.debit));
  const kredit = jumlahkan(baris.map((b) => b.kredit));
  return { debit, kredit, selisih: dariSen(keSen(debit) - keSen(kredit)) };
}

/** Pesan kekurangan isian, atau null kalau rincian siap disimpan. */
export function periksaRincian(mode, baris) {
  const isi = barisTerisi(baris);
  const minimal = mode === "beban" ? 1 : 2;
  if (isi.length < minimal) return mode === "beban" ? "Isi paling sedikit satu rincian beban." : "Isi paling sedikit dua baris.";
  for (const [i, b] of isi.entries()) {
    if (!b.akun_id) return `Baris ke-${i + 1} belum ada akunnya.`;
    if (mode === "beban") {
      if (!lebihDariNol(b.nilai)) return `Baris ke-${i + 1} belum ada nilainya.`;
    } else if (lebihDariNol(b.debit) === lebihDariNol(b.kredit)) {
      return `Baris ke-${i + 1}: isi debit atau kredit, salah satu saja.`;
    }
  }
  const t = totalRincian(mode, isi);
  if (keSen(t.selisih) !== keSen("0")) return "Total debit dan total kredit belum sama.";
  return null;
}

const KOLOM_LG = {
  jurnal: "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_2.5rem]",
  beban: "lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_2.5rem]",
};

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-foreground lg:sr-only">
      {children}
    </label>
  );
}

export function TabelRincian({ mode = "jurnal", baris, onUbah, disabled = false, tipeAkun, idForm, labelTotal = "Total beban" }) {
  const ubahBaris = (kunci, bagian) => onUbah(baris.map((b) => (b.kunci === kunci ? { ...b, ...bagian } : b)));
  const hapusBaris = (kunci) => onUbah(baris.length > 1 ? baris.filter((b) => b.kunci !== kunci) : [barisKosong()]);
  const total = totalRincian(mode, baris);
  const selisihAda = mode === "jurnal" && keSen(total.selisih) !== keSen("0");

  return (
    <div className="space-y-3">
      <div className={cn("hidden gap-2 border-b border-border pb-2 text-xs font-semibold text-muted-foreground lg:grid", KOLOM_LG[mode])}>
        <span>Akun</span>
        {mode === "jurnal" ? (
          <>
            <span className="text-right">Debit</span>
            <span className="text-right">Kredit</span>
          </>
        ) : (
          <span className="text-right">Nilai</span>
        )}
        <span>Departemen</span>
        <span>Catatan</span>
        <span className="sr-only">Hapus</span>
      </div>

      <ol className="space-y-3 lg:space-y-2">
        {baris.map((b, i) => {
          const id = `${idForm}-${b.kunci}`;
          return (
            <li
              key={b.kunci}
              className={cn("grid gap-3 rounded-xl border border-border p-3 lg:items-center lg:gap-2 lg:rounded-none lg:border-0 lg:p-0", KOLOM_LG[mode])}
            >
              <div className="flex items-start justify-between gap-2 lg:hidden">
                <p className="text-sm font-semibold text-foreground">Baris {i + 1}</p>
              </div>
              <div className="min-w-0">
                <Label htmlFor={`${id}-akun`}>Akun</Label>
                <PilihAkun
                  id={`${id}-akun`}
                  aria-label={`Akun baris ${i + 1}`}
                  value={b.akun_id}
                  label={b.akun_label}
                  tipe={tipeAkun}
                  disabled={disabled}
                  onChange={(a) => ubahBaris(b.kunci, { akun_id: a.id, akun_label: `${a.kode} ${a.nama}` })}
                />
              </div>
              {mode === "jurnal" ? (
                <div className="grid grid-cols-2 gap-3 lg:contents">
                  <div className="min-w-0">
                    <Label htmlFor={`${id}-debit`}>Debit</Label>
                    <InputUang
                      id={`${id}-debit`}
                      aria-label={`Debit baris ${i + 1}`}
                      value={b.debit}
                      placeholder="0"
                      disabled={disabled}
                      onChange={(v) => ubahBaris(b.kunci, lebihDariNol(v) ? { debit: v, kredit: "" } : { debit: v })}
                    />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor={`${id}-kredit`}>Kredit</Label>
                    <InputUang
                      id={`${id}-kredit`}
                      aria-label={`Kredit baris ${i + 1}`}
                      value={b.kredit}
                      placeholder="0"
                      disabled={disabled}
                      onChange={(v) => ubahBaris(b.kunci, lebihDariNol(v) ? { kredit: v, debit: "" } : { kredit: v })}
                    />
                  </div>
                </div>
              ) : (
                <div className="min-w-0">
                  <Label htmlFor={`${id}-nilai`}>Nilai</Label>
                  <InputUang
                    id={`${id}-nilai`}
                    aria-label={`Nilai baris ${i + 1}`}
                    value={b.nilai}
                    placeholder="0"
                    disabled={disabled}
                    onChange={(v) => ubahBaris(b.kunci, { nilai: v })}
                  />
                </div>
              )}
              <div className="min-w-0">
                <Label htmlFor={`${id}-dep`}>Departemen</Label>
                <PilihDepartemen
                  id={`${id}-dep`}
                  aria-label={`Departemen baris ${i + 1}`}
                  value={b.departemen_id}
                  label={b.departemen_label}
                  disabled={disabled}
                  onChange={(v) => ubahBaris(b.kunci, { departemen_id: v })}
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor={`${id}-catatan`}>Catatan</Label>
                <Input
                  id={`${id}-catatan`}
                  aria-label={`Catatan baris ${i + 1}`}
                  value={b.catatan}
                  maxLength={300}
                  disabled={disabled}
                  onChange={(e) => ubahBaris(b.kunci, { catatan: e.target.value })}
                />
              </div>
              {!disabled && (
                <div className="flex justify-end lg:justify-center">
                  <button
                    type="button"
                    onClick={() => hapusBaris(b.kunci)}
                    aria-label={`Hapus baris ${i + 1}`}
                    className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive lg:w-10 lg:justify-center lg:px-0"
                  >
                    <FiTrash2 className="h-4 w-4" aria-hidden />
                    <span className="lg:sr-only">Hapus baris</span>
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!disabled && (
        <Button type="button" variant="outline" onClick={() => onUbah([...baris, barisKosong()])} className="gap-2 hover:bg-muted hover:text-foreground">
          <FiPlus className="h-4 w-4" aria-hidden /> Tambah baris
        </Button>
      )}

      <dl className="ml-auto grid max-w-md gap-1 rounded-xl bg-muted/60 p-3 text-sm">
        {mode === "jurnal" ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Total debit</dt>
              <dd className="font-semibold tabular-nums">{formatRupiah(total.debit)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Total kredit</dt>
              <dd className="font-semibold tabular-nums">{formatRupiah(total.kredit)}</dd>
            </div>
            <div className={cn("flex justify-between gap-4 border-t border-border pt-1", selisihAda && "text-destructive")}>
              <dt>Selisih</dt>
              <dd className="font-semibold tabular-nums">{selisihAda ? formatRupiah(total.selisih) : "Seimbang"}</dd>
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{labelTotal}</dt>
            <dd className="font-semibold tabular-nums">{formatRupiah(total.debit)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
