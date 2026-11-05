// Bagian 2 · Tren bulanan: pendapatan vs harga pokok (batang) + laba bersih (garis);
// untuk Gabungan juga pendapatan per unit (batang bertumpuk).
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CardBox, SectionHeader } from "@/shared/ui/bits";
import { WARNA, gayaTooltip, sumbuTick } from "@/shared/lib/chart-style";
import { namaBulan, rupiah, sumbuRupiah } from "@/shared/lib/format";
import { kesimpulanTren } from "../lib/ringkasan";

function TooltipRupiah({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={gayaTooltip} className="px-3 py-2 shadow-elevated">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className={Number(p.value) < 0 ? "text-destructive" : undefined}>{rupiah(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const labelLegenda = (v) => <span className="text-xs text-foreground">{v}</span>;

export function BagianTren({ dataUnit, periodeList, periodeTerpilih, unitList, laporanPerUnit, gabungan }) {
  const { teks, nada } = kesimpulanTren(dataUnit, periodeList);
  const data = periodeList.map((p) => {
    const u = dataUnit?.[p]?.ukuran;
    return {
      p,
      bulan: namaBulan(p, { tanpaTahun: true }),
      pendapatan: u?.total_pendapatan ?? null,
      hpp: u?.total_hpp ?? null,
      laba: u?.laba_bersih ?? null,
    };
  });
  const dataUnitTumpuk = periodeList.map((p) => {
    const baris = { p, bulan: namaBulan(p, { tanpaTahun: true }) };
    for (const u of unitList) baris[u.kode] = laporanPerUnit?.[u.kode]?.[p]?.ukuran?.total_pendapatan ?? null;
    return baris;
  });
  const terpilih = namaBulan(periodeTerpilih, { tanpaTahun: true });

  return (
    <section aria-labelledby="bagian-2">
      <SectionHeader id="bagian-2" nomor={2} judul="Tren bulanan" kesimpulan={teks} nada={nada} />
      <div className={gabungan ? "grid gap-4 xl:grid-cols-5" : ""}>
        <CardBox
          className={gabungan ? "xl:col-span-3" : ""}
          title="Pendapatan, harga pokok, dan laba bersih"
          subtitle="Batang = pendapatan dan harga pokok penjualan; garis = laba bersih. Garis putus-putus menandai bulan terpilih."
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bulan" tick={sumbuTick} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={sumbuRupiah} tick={sumbuTick} tickLine={false} axisLine={false} width={78} />
                <Tooltip content={<TooltipRupiah />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
                <Legend formatter={labelLegenda} iconType="circle" iconSize={8} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <ReferenceLine x={terpilih} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
                <Bar dataKey="pendapatan" name="Pendapatan" fill={WARNA.pendapatan} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="hpp" name="Harga pokok penjualan" fill={WARNA.hpp} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line dataKey="laba" name="Laba bersih" stroke={WARNA.laba} strokeWidth={2.5} dot={{ r: 3.5 }} connectNulls={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardBox>

        {gabungan && (
          <CardBox className="xl:col-span-2" title="Pendapatan per unit usaha" subtitle="Sumbangan tiap unit ke pendapatan gabungan.">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataUnitTumpuk} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bulan" tick={sumbuTick} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={sumbuRupiah} tick={sumbuTick} tickLine={false} axisLine={false} width={78} />
                  <Tooltip content={<TooltipRupiah />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
                  <Legend formatter={labelLegenda} iconType="circle" iconSize={8} />
                  {unitList.map((u, i) => (
                    <Bar
                      key={u.kode}
                      dataKey={u.kode}
                      name={u.nama}
                      stackId="unit"
                      fill={WARNA.unit[u.kode] ?? `hsl(var(--chart-${(i % 5) + 1}))`}
                      maxBarSize={32}
                      radius={i === unitList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBox>
        )}
      </div>
    </section>
  );
}
