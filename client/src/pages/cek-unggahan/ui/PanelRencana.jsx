// Isi utama halaman Cek dan setujui: cek silang, peringatan, tabel per unit,
// baris yang diabaikan, dan bilah aksi (Batalkan / Benar, simpan).
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiCheck, FiInfo, FiX } from "react-icons/fi";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { CardBox } from "@/shared/ui/bits";
import { rentangBulan } from "@/shared/lib/format";
import { labelUnit } from "@/entities/referensi";
import { useBatalkanUnggahan, useSetujuiUnggahan } from "@/entities/unggahan";
import { usePilihanLaporan } from "@/features/pilihan-laporan/model/usePilihanLaporan";
import { cekSilangLangsung, pecahKunci, petaDariRencana, petaLama, strukturUnit } from "../lib/rencana";
import { PanelCekSilang } from "./PanelCekSilang";
import { TabelRencanaUnit } from "./TabelRencanaUnit";

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

export function PanelRencana({ unggahan, dataTersimpan, referensi: ref, bisaUbah }) {
  const navigate = useNavigate();
  const rencana = useMemo(() => unggahan.rencana ?? {}, [unggahan.rencana]);
  const awal = useMemo(() => petaDariRencana(rencana), [rencana]);
  const lama = useMemo(() => petaLama(dataTersimpan), [dataTersimpan]);
  const [nilai, setNilai] = useState(() => new Map(awal.nilai));
  const [dilihat, setDilihat] = useState(() => new Set());
  const [bukaDiabaikan, setBukaDiabaikan] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(null); // "simpan" | "batal" | null

  const setujui = useSetujuiUnggahan(unggahan.id);
  const batalkan = useBatalkanUnggahan(unggahan.id);
  const aturPeriode = usePilihanLaporan((s) => s.aturPeriode);
  const aturTahun = usePilihanLaporan((s) => s.aturTahun);

  const urutanUnit = useMemo(() => ref.unit.map((u) => u.kode), [ref.unit]);
  const struktur = useMemo(() => strukturUnit(nilai, lama, urutanUnit), [nilai, lama, urutanUnit]);
  const unitDalamRencana = useMemo(() => struktur.map((s) => s.unit), [struktur]);
  const semuaPeriode = [...new Set(struktur.flatMap((s) => s.periode))];

  const bulanLama = useMemo(() => {
    const s = new Set();
    for (const k of lama.keys()) {
      const { unit_kode, periode } = pecahKunci(k);
      s.add(`${unit_kode}|${periode}`);
    }
    return s;
  }, [lama]);

  const hasilCek = useMemo(
    () => cekSilangLangsung(rencana.pemeriksaan, nilai, ref.pos, unitDalamRencana),
    [rencana.pemeriksaan, nilai, ref.pos, unitDalamRencana],
  );

  const onUbah = useCallback((k, v) => {
    setNilai((m) => {
      const baru = new Map(m);
      baru.set(k, v);
      return baru;
    });
  }, []);
  const onDilihat = useCallback((k) => {
    setDilihat((s) => (s.has(k) ? s : new Set(s).add(k)));
  }, []);

  // Ringkasan untuk bilah aksi & dialog konfirmasi
  const isian = [...nilai.entries()].filter(([, v]) => ada(v));
  const jumlahDiubah = [...nilai.entries()].filter(([k, v]) => (awal.asli.has(k) ? awal.asli.get(k) !== v : ada(v))).length;
  const sisaRagu = [...awal.info.entries()].filter(([k, i]) => i.ragu && !dilihat.has(k)).length;
  const jumlahTidakCocok = hasilCek.filter((c) => c.cocok === false).length;
  const akanDihapus = [...lama.entries()].filter(([k, v]) => ada(v) && !ada(nilai.get(k))).length;
  const unitDiganti = [...new Set([...bulanLama].map((x) => x.split("|")[0]))];
  const periodeDiganti = [...new Set([...bulanLama].map((x) => x.split("|")[1]))];

  const simpan = () => {
    const daftar = isian.map(([k, v]) => {
      const { unit_kode, periode, pos_kode } = pecahKunci(k);
      return { unit_kode, periode, pos_kode, nilai: Number(v) };
    });
    setujui.mutate(daftar, {
      onSuccess: () => {
        aturTahun(null);
        aturPeriode(null);
        navigate("/");
      },
      onSettled: () => setKonfirmasi(null),
    });
  };

  const batal = () => {
    batalkan.mutate(undefined, {
      onSuccess: () => navigate("/unggah"),
      onSettled: () => setKonfirmasi(null),
    });
  };

  const namaUnit = (k) => labelUnit(k, ref.unitPerKode, { pendek: true });

  return (
    <div className="space-y-6 pb-28">
      {rencana.adalah_laporan_keuangan === false && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-destructive">AI menilai berkas ini BUKAN laporan keuangan</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Pastikan berkas yang diunggah sudah benar sebelum menyetujui.</p>
          </div>
        </div>
      )}

      <PanelCekSilang hasil={hasilCek} unitPerKode={ref.unitPerKode} />

      {(rencana.peringatan?.length > 0 || rencana.catatan_ai) && (
        <div className="space-y-2 rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/[0.07] p-4 sm:p-5">
          {rencana.peringatan?.length > 0 && (
            <>
              <p className="flex items-center gap-2 font-medium text-foreground">
                <FiAlertTriangle className="h-4 w-4 text-[hsl(32_80%_40%)]" aria-hidden /> Perlu diperhatikan
              </p>
              <ul className="ml-6 list-disc space-y-1 text-sm text-foreground">
                {rencana.peringatan.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          )}
          {rencana.catatan_ai && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <FiInfo className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium text-foreground">Catatan dari AI: </span>
                {rencana.catatan_ai}
              </span>
            </p>
          )}
        </div>
      )}

      {bisaUbah && bulanLama.size > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 p-4">
          <FiInfo className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
          <p className="text-sm text-foreground">
            Menyetujui akan <span className="font-semibold">MENGGANTI</span> data {unitDiganti.map(namaUnit).join(" & ")} untuk {rentangBulan(periodeDiganti)} yang
            sudah ada di database. Angka lama ditampilkan kecil dan dicoret di bawah angka baru.
            {akanDihapus > 0 && ` ${akanDihapus} angka lama tidak ada di berkas ini dan akan dihapus.`}
          </p>
        </div>
      )}

      {struktur.length === 0 ? (
        <CardBox title="Tidak ada angka yang terbaca">
          <p className="text-sm text-muted-foreground">AI tidak menemukan angka laporan di berkas ini. Batalkan unggahan ini, lalu periksa berkasnya.</p>
        </CardBox>
      ) : (
        struktur.map((s) => (
          <TabelRencanaUnit
            key={s.unit}
            unit={s.unit}
            judul={labelUnit(s.unit, ref.unitPerKode)}
            periodeList={s.periode}
            posKodes={s.pos}
            nilai={nilai}
            lama={lama}
            bulanLama={bulanLama}
            info={awal.info}
            asli={awal.asli}
            dilihat={dilihat}
            referensi={ref}
            bisaUbah={bisaUbah}
            onUbah={onUbah}
            onDilihat={onDilihat}
          />
        ))
      )}

      {rencana.diabaikan?.length > 0 && (
        <CardBox>
          <button
            type="button"
            onClick={() => setBukaDiabaikan((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-[hsl(var(--primary))]"
            aria-expanded={bukaDiabaikan}
          >
            {bukaDiabaikan ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Baris yang diabaikan ({rencana.diabaikan.length})
          </button>
          <p className="mt-1 text-xs text-muted-foreground">Baris di berkas yang tidak dimasukkan, misalnya baris total, judul, atau rincian yang sudah terhitung di pos lain.</p>
          {bukaDiabaikan && (
            <div className="relative mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-1.5 pr-3 text-left font-medium">Isi baris</th>
                    <th className="py-1.5 pr-3 text-left font-medium">Letak</th>
                    <th className="py-1.5 text-left font-medium">Alasan diabaikan</th>
                  </tr>
                </thead>
                <tbody>
                  {rencana.diabaikan.map((d, i) => (
                    <tr key={i} className="border-b border-border/40 align-top">
                      <td className="py-1.5 pr-3">{d.label || "—"}</td>
                      <td className="whitespace-nowrap py-1.5 pr-3 text-muted-foreground">{d.letak || "—"}</td>
                      <td className="py-1.5 text-muted-foreground">{d.alasan || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBox>
      )}

      {bisaUbah && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 py-3 shadow-elevated backdrop-blur md:left-64 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{isian.length.toLocaleString("id-ID")} angka</span> akan disimpan
              {jumlahDiubah > 0 && ` · ${jumlahDiubah} diubah dari hasil AI`}
              {sisaRagu > 0 && <span className="text-[hsl(32_80%_36%)]"> · {sisaRagu} angka kuning belum dicek</span>}
              {jumlahTidakCocok > 0 && <span className="text-destructive"> · {jumlahTidakCocok} total tidak cocok</span>}
            </p>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 hover:bg-muted hover:text-foreground sm:flex-none"
                onClick={() => setKonfirmasi("batal")}
                disabled={setujui.isPending || batalkan.isPending}
              >
                <FiX aria-hidden /> Batalkan
              </Button>
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => setKonfirmasi("simpan")}
                disabled={!isian.length || setujui.isPending || batalkan.isPending}
              >
                <FiCheck aria-hidden /> Benar, simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={konfirmasi !== null} onOpenChange={(o) => !o && setKonfirmasi(null)}>
        <AlertDialogContent>
          {konfirmasi === "simpan" ? (
            <AlertDialogHeader>
              <AlertDialogTitle>Simpan {isian.length.toLocaleString("id-ID")} angka ke database?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    {unitDalamRencana.map(namaUnit).join(" & ")} · {rentangBulan(semuaPeriode)}.
                    {bulanLama.size > 0 && " Data lama untuk unit dan bulan yang sama akan diganti."}
                  </p>
                  {jumlahTidakCocok > 0 && (
                    <p className="font-medium text-destructive">Perhatian: {jumlahTidakCocok} total masih tidak cocok dengan berkas.</p>
                  )}
                  {sisaRagu > 0 && <p className="text-[hsl(32_80%_36%)]">{sisaRagu} angka yang AI kurang yakin belum Anda buka.</p>}
                  <p>Setelah disimpan, angka langsung tampil di dashboard.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
          ) : (
            <AlertDialogHeader>
              <AlertDialogTitle>Batalkan unggahan ini?</AlertDialogTitle>
              <AlertDialogDescription>Tidak ada angka yang disimpan. Berkas tetap tercatat di riwayat sebagai "Dibatalkan".</AlertDialogDescription>
            </AlertDialogHeader>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-muted hover:text-foreground">Kembali</AlertDialogCancel>
            {konfirmasi === "simpan" ? (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  simpan();
                }}
                disabled={setujui.isPending}
              >
                {setujui.isPending ? "Menyimpan…" : "Ya, simpan"}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  batal();
                }}
                disabled={batalkan.isPending}
              >
                {batalkan.isPending ? "Membatalkan…" : "Ya, batalkan"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
