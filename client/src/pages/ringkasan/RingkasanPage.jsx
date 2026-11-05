// Halaman utama: Ringkasan laba rugi bergaya PLD — bagian bernomor bertumpuk,
// tiap bagian dengan satu kalimat kesimpulan.
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { FiFileText, FiUploadCloud } from "react-icons/fi";
import { Info } from "lucide-react";
import { useReferensi, KODE_GABUNGAN, labelUnit } from "@/entities/referensi";
import { useLaporan } from "@/entities/laporan";
import { usePilihanLaporan } from "@/features/pilihan-laporan/model/usePilihanLaporan";
import { PemilihLaporan } from "@/features/pilihan-laporan/ui/PemilihLaporan";
import { ChartSkeleton, EmptyState, ErrorState, StatSkeleton, TableSkeleton, Skeleton } from "@/shared/ui/bits";
import { Button } from "@/shared/ui/button";
import { namaBulan, normalPeriode, periodeSebelum, tanggal } from "@/shared/lib/format";
import { periodeTahunBerjalan, ukuranGabunganBulan } from "./lib/ringkasan";
import { BagianHasilBulan } from "./ui/BagianHasilBulan";
import { BagianTren } from "./ui/BagianTren";
import { BagianBiaya } from "./ui/BagianBiaya";
import { BagianRincian } from "./ui/BagianRincian";

function KerangkaMemuat() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat laporan">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <ChartSkeleton tinggi="h-72" />
      <TableSkeleton baris={8} />
    </div>
  );
}

/** "Data Oktober 2026 dari: Rekap….xlsx · disetujui 5 Nov 2026 oleh Lutfi" */
function AsalData({ asal, unitKode, periode, unitPerKode, gabunganUnitAda, semuaUnit }) {
  const daftarUnit = unitKode === KODE_GABUNGAN ? semuaUnit.map((u) => u.kode) : [unitKode];
  const perUnggahan = new Map();
  for (const u of daftarUnit) {
    const a = asal?.[`${u}|${periode}`];
    if (!a) continue;
    const kunci = a.unggahan_id ?? `${a.nama_berkas}|${a.disetujui_at}`;
    if (!perUnggahan.has(kunci)) perUnggahan.set(kunci, { ...a, unit: [] });
    perUnggahan.get(kunci).unit.push(labelUnit(u, unitPerKode, { pendek: true }));
  }
  const kurang =
    unitKode === KODE_GABUNGAN && Array.isArray(gabunganUnitAda)
      ? semuaUnit.filter((u) => !gabunganUnitAda.includes(u.kode))
      : [];

  if (!perUnggahan.size && !kurang.length) return null;
  return (
    <div className="space-y-1.5 rounded-lg border border-border/60 bg-card/70 px-3 py-2.5 text-xs text-muted-foreground">
      {[...perUnggahan.values()].map((a) => (
        <p key={a.unggahan_id ?? a.nama_berkas} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <FiFileText className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
          <span>
            Data {namaBulan(periode, { panjang: true })}
            {perUnggahan.size > 1 || unitKode === KODE_GABUNGAN ? ` (${a.unit.join(" dan ")})` : ""} dari{" "}
          </span>
          {a.unggahan_id ? (
            <Link to={`/unggahan/${a.unggahan_id}`} className="font-medium text-foreground underline-offset-2 hover:underline">
              {a.nama_berkas ?? "berkas unggahan"}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{a.nama_berkas ?? "berkas unggahan"}</span>
          )}
          <span>
            · disetujui {tanggal(a.disetujui_at)}
            {a.disetujui_oleh_nama ? ` oleh ${a.disetujui_oleh_nama}` : ""}
          </span>
        </p>
      ))}
      {kurang.length > 0 && (
        <p className="flex items-start gap-1.5 text-[hsl(32_80%_36%)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {kurang.map((u) => u.nama).join(" dan ")} belum punya data {namaBulan(periode, { panjang: true })} — angka gabungan bulan ini hanya dari{" "}
            {semuaUnit.filter((u) => gabunganUnitAda.includes(u.kode)).map((u) => u.nama).join(" dan ") || "unit lain"}.
          </span>
        </p>
      )}
    </div>
  );
}

export function RingkasanPage() {
  const { ref, isPending: refMemuat, isError: refGalat, error: galatRef, refetch: muatUlangRef } = useReferensi();
  const pilihan = usePilihanLaporan();
  const laporan = useLaporan(pilihan.tahun);
  const L = laporan.data;

  const periodeList = useMemo(() => [...new Set((L?.periode ?? []).map(normalPeriode))].sort(), [L]);
  const tahunList = useMemo(() => L?.tahun_tersedia ?? [], [L]);
  const unitList = useMemo(() => {
    const dariLaporan = L?.unit ?? [];
    return dariLaporan.length ? dariLaporan : (ref?.unit ?? []);
  }, [L, ref]);

  const unitPilihan = pilihan.unit === KODE_GABUNGAN || unitList.some((u) => u.kode === pilihan.unit) ? pilihan.unit : KODE_GABUNGAN;
  const periode = periodeList.includes(pilihan.periode) ? pilihan.periode : periodeList[periodeList.length - 1] ?? null;

  // Tahun tersimpan yang sudah tidak ada datanya -> kembali ke tahun terbaru.
  useEffect(() => {
    if (pilihan.tahun && tahunList.length && !tahunList.includes(pilihan.tahun)) pilihan.aturTahun(null);
  }, [pilihan, tahunList]);

  if (refMemuat || laporan.isPending) return <KerangkaMemuat />;
  if (refGalat) return <ErrorState pesan={galatRef?.message} aksi={<Button onClick={() => muatUlangRef()}>Coba lagi</Button>} />;
  if (laporan.isError)
    return <ErrorState pesan={laporan.error?.message} aksi={<Button onClick={() => laporan.refetch()}>Coba lagi</Button>} />;

  if (!periodeList.length || !periode) {
    return (
      <EmptyState
        ikon={FiUploadCloud}
        judul="Belum ada laporan yang disetujui"
        keterangan="Unggah laporan keuangan (Excel, PDF, atau foto). Setelah AI membacanya dan Anda menyetujuinya, angkanya tampil di sini."
        aksi={
          <Button asChild>
            <Link to="/unggah">
              <FiUploadCloud aria-hidden /> Unggah laporan pertama
            </Link>
          </Button>
        }
      />
    );
  }

  const daftarPos = ref?.pos ?? [];
  const dataUnit = L?.laporan?.[unitPilihan] ?? {};
  const unitNama = labelUnit(unitPilihan, ref?.unitPerKode, { pendek: true });
  const bulanIni = dataUnit[periode] ?? null;
  const bulanLalu = dataUnit[periodeSebelum(periode)] ?? null;
  const periodeYtd = periodeTahunBerjalan(periodeList, periode);
  const ukuranYtd = ukuranGabunganBulan(dataUnit, periodeYtd, daftarPos);
  const tahun = L?.tahun ?? Number(periode.slice(0, 4));

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PemilihLaporan
            unitList={unitList}
            unitPerKode={ref?.unitPerKode}
            unit={unitPilihan}
            onUnit={pilihan.aturUnit}
            periodeList={periodeList}
            periode={periode}
            onPeriode={pilihan.aturPeriode}
            tahunList={tahunList}
            tahun={tahun}
            onTahun={pilihan.aturTahun}
          />
          {laporan.isFetching && <span className="text-xs text-muted-foreground">Memperbarui…</span>}
        </div>
        <AsalData
          asal={L?.asal}
          unitKode={unitPilihan}
          periode={periode}
          unitPerKode={ref?.unitPerKode}
          gabunganUnitAda={L?.laporan?.[KODE_GABUNGAN]?.[periode]?.unit_ada}
          semuaUnit={unitList}
        />
      </div>

      <BagianHasilBulan
        unitNama={unitNama}
        periode={periode}
        ukuranIni={bulanIni?.ukuran ?? null}
        ukuranLalu={bulanLalu?.ukuran ?? null}
        ukuranTahunBerjalan={ukuranYtd}
        periodeTahunBerjalan={periodeYtd}
      />
      <BagianTren
        dataUnit={dataUnit}
        periodeList={periodeList}
        periodeTerpilih={periode}
        unitList={unitList}
        laporanPerUnit={L?.laporan}
        gabungan={unitPilihan === KODE_GABUNGAN}
      />
      <BagianBiaya periode={periode} bulanIni={bulanIni} bulanLalu={bulanLalu} daftarPos={daftarPos} />
      <BagianRincian
        unitNama={unitNama}
        dataUnit={dataUnit}
        periodeList={periodeList}
        periodeTerpilih={periode}
        daftarPos={daftarPos}
        namaKelompok={ref?.namaKelompok}
        tahun={tahun}
      />
    </div>
  );
}
