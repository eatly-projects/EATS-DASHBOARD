// Formulir transaksi pembukuan untuk Jurnal Umum dan Pencatatan Beban.
// Kepala (tanggal, nomor, keterangan; Pencatatan Beban: Hutang Beban & jatuh tempo),
// rincian, dan tombol Simpan / Hapus / Cetak di kanan.
import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiClock, FiPrinter, FiSave, FiTrash2 } from "react-icons/fi";
import { ErrorState, Skeleton } from "@/shared/ui/bits";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { FormDokumen } from "@/widgets/daftar-form/ui/FormDokumen";
import { PilihAkun } from "@/features/pilih-akun/ui/PilihAkun";
import { NAMA_TIPE, useHapusJurnal, useJurnal, useSimpanJurnal } from "@/entities/jurnal";
import { useHak } from "@/entities/navigasi";
import { hariIni } from "@/shared/lib/rentang";
import { lebihDariNol } from "@/shared/lib/uang";
import { tanggal as tglTeks, tanggalJam } from "@/shared/lib/format";
import { TabelRincian, barisKosong, barisTerisi, periksaRincian } from "./TabelRincian";

const TIPE_BEBAN = ["beban", "beban_lainnya", "beban_pokok_penjualan"];

const kepalaKosong = () => ({ tanggal: hariIni(), keterangan: "", akun_lawan_id: null, akun_lawan_label: "", jatuh_tempo: "" });

function dariServer(j) {
  const nolJadiKosong = (v) => (lebihDariNol(v) ? v : "");
  return {
    kepala: {
      tanggal: j.tanggal,
      keterangan: j.keterangan ?? "",
      akun_lawan_id: j.akun_lawan_id,
      akun_lawan_label: j.akun_lawan_nama ?? "",
      jatuh_tempo: j.jatuh_tempo ?? "",
    },
    baris: j.baris.map((b) => ({
      ...barisKosong(),
      akun_id: b.akun_id,
      akun_label: `${b.akun_kode} ${b.akun_nama}`,
      debit: nolJadiKosong(b.debit),
      kredit: nolJadiKosong(b.kredit),
      nilai: nolJadiKosong(b.nilai ?? ""),
      departemen_id: b.departemen_id,
      departemen_label: b.departemen_nama ?? "",
      catatan: b.catatan ?? "",
    })),
  };
}

/** Bentuk baku untuk membandingkan isian dengan yang tersimpan (tanpa label dan kunci baris). */
function baku(tipe, isian) {
  const k = isian.kepala;
  return JSON.stringify({
    tanggal: k.tanggal,
    keterangan: k.keterangan.trim(),
    ...(tipe === "pencatatan_beban" ? { akun_lawan_id: k.akun_lawan_id, jatuh_tempo: k.jatuh_tempo } : {}),
    baris: barisTerisi(isian.baris).map((b) => [b.akun_id, b.debit, b.kredit, b.nilai, b.departemen_id, b.catatan.trim()]),
  });
}

function keBody(tipe, isian) {
  const k = isian.kepala;
  const baris = barisTerisi(isian.baris);
  if (tipe === "pencatatan_beban") {
    return {
      tanggal: k.tanggal,
      keterangan: k.keterangan,
      akun_lawan_id: k.akun_lawan_id,
      jatuh_tempo: k.jatuh_tempo || null,
      baris: baris.map((b) => ({ akun_id: b.akun_id, nilai: b.nilai, departemen_id: b.departemen_id, catatan: b.catatan })),
    };
  }
  return {
    tanggal: k.tanggal,
    keterangan: k.keterangan,
    baris: baris.map((b) => ({ akun_id: b.akun_id, debit: b.debit || "0", kredit: b.kredit || "0", departemen_id: b.departemen_id, catatan: b.catatan })),
  };
}

function PitaStatus({ data }) {
  if (data.status === "diajukan") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 p-3 text-sm">
        <FiClock className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" aria-hidden />
        <p>
          <span className="font-semibold">Menunggu persetujuan.</span> Transaksi ini belum masuk laporan dan belum punya nomor. Penyetuju memutuskannya
          di menu Perusahaan, Persetujuan.
        </p>
      </div>
    );
  }
  if (data.status === "ditolak") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <p>
          <span className="font-semibold">Ditolak oleh {data.diputuskan_oleh_nama ?? "penyetuju"}</span>
          {data.diputuskan_at ? ` (${tanggalJam(data.diputuskan_at)})` : ""}. Alasan: {data.alasan_keputusan || "—"}. Perbaiki lalu simpan lagi
          untuk mengajukan ulang.
        </p>
      </div>
    );
  }
  return null;
}

export function FormJurnal({ tipe, id, tutup, setelahSimpan, tandaiBerubah }) {
  const q = useJurnal(tipe, id);
  const hak = useHak(tipe);
  const simpan = useSimpanJurnal(tipe);
  const hapus = useHapusJurnal(tipe);
  const [awal, setAwal] = useState(id ? null : { kepala: kepalaKosong(), baris: [barisKosong(), barisKosong()] });
  const [isian, setIsian] = useState(awal);

  if (q.data && !isian) {
    const d = dariServer(q.data);
    setAwal(d);
    setIsian(d);
  }

  const berubah = useMemo(() => Boolean(isian && awal && baku(tipe, isian) !== baku(tipe, awal)), [isian, awal, tipe]);
  useEffect(() => tandaiBerubah(berubah), [berubah, tandaiBerubah]);

  if (id && q.isError) return <ErrorState pesan={q.error?.message} />;
  if (!isian) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const beban = tipe === "pencatatan_beban";
  const data = q.data;
  const bolehUbah = id ? hak.ubah : hak.buat;
  const kunci = `${tipe}-${id ?? "baru"}`;
  const ubahKepala = (bagian) => setIsian((x) => ({ ...x, kepala: { ...x.kepala, ...bagian } }));
  const kurang = (beban && !isian.kepala.akun_lawan_id ? "Pilih akun Hutang Beban." : null) || (!isian.kepala.tanggal ? "Isi tanggal." : null) || periksaRincian(beban ? "beban" : "jurnal", isian.baris);
  const nomorTeks = data?.nomor ?? (data?.status === "diajukan" || data?.status === "ditolak" ? "Diberikan setelah disetujui" : "Otomatis saat disimpan");

  const tekanSimpan = () =>
    simpan.mutate(
      { id, ...keBody(tipe, isian) },
      {
        onSuccess: (j) => {
          const d = dariServer(j);
          setAwal(d);
          setIsian(d);
          setelahSimpan(j.id, j.nomor ?? `${NAMA_TIPE[tipe]} ${tglTeks(j.tanggal)}`);
        },
      },
    );

  return (
    <FormDokumen
      tab={[
        {
          kunci: "kepala",
          judul: NAMA_TIPE[tipe],
          isi: (
            <fieldset disabled={!bolehUbah} className="space-y-4">
              {data && <PitaStatus data={data} />}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {beban && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`${kunci}-hutang`}>Hutang beban</Label>
                    <PilihAkun
                      id={`${kunci}-hutang`}
                      tipe={["liabilitas_jangka_pendek"]}
                      value={isian.kepala.akun_lawan_id}
                      label={isian.kepala.akun_lawan_label}
                      disabled={!bolehUbah}
                      placeholder="Pilih akun utang, misalnya Hutang Biaya"
                      onChange={(a) => ubahKepala({ akun_lawan_id: a.id, akun_lawan_label: `${a.kode} ${a.nama}` })}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor={`${kunci}-tanggal`}>Tanggal</Label>
                  <Input id={`${kunci}-tanggal`} type="date" value={isian.kepala.tanggal} onChange={(e) => ubahKepala({ tanggal: e.target.value })} />
                </div>
                {beban ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${kunci}-tempo`}>Jatuh tempo (boleh kosong)</Label>
                    <Input id={`${kunci}-tempo`} type="date" value={isian.kepala.jatuh_tempo} onChange={(e) => ubahKepala({ jatuh_tempo: e.target.value })} />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">Nomor</p>
                  <p className="flex h-10 items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm text-muted-foreground">{nomorTeks}</p>
                </div>
                <div className={beban ? "space-y-1.5 sm:col-span-2 xl:col-span-4" : "space-y-1.5 sm:col-span-2 xl:col-span-2"}>
                  <Label htmlFor={`${kunci}-ket`}>Keterangan</Label>
                  <Input
                    id={`${kunci}-ket`}
                    value={isian.kepala.keterangan}
                    maxLength={500}
                    onChange={(e) => ubahKepala({ keterangan: e.target.value })}
                    placeholder={beban ? "Misalnya: tagihan listrik November" : "Misalnya: penyesuaian akhir bulan"}
                  />
                </div>
              </div>
            </fieldset>
          ),
        },
        {
          kunci: "rincian",
          judul: beban ? "Rincian Beban" : "Rincian Jurnal",
          isi: (
            <TabelRincian
              mode={beban ? "beban" : "jurnal"}
              baris={isian.baris}
              onUbah={(baris) => setIsian((x) => ({ ...x, baris }))}
              disabled={!bolehUbah}
              tipeAkun={beban ? TIPE_BEBAN : undefined}
              idForm={kunci}
            />
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
                nonaktif: Boolean(kurang) || (id && !berubah),
                memuat: simpan.isPending,
              },
            ]
          : []),
        ...(id ? [{ kunci: "cetak", label: "Cetak", ikon: FiPrinter, onClick: () => window.print() }] : []),
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
                  judul: `Hapus ${NAMA_TIPE[tipe]} ${data?.nomor ?? ""}?`,
                  isi: "Transaksi di periode yang sudah dikunci tidak bisa dihapus. Penghapusan tercatat di Log Aktivitas.",
                  tombol: "Ya, hapus",
                },
              },
            ]
          : []),
      ]}
      catatan={bolehUbah && kurang && (!id || berubah) ? kurang : null}
    />
  );
}
