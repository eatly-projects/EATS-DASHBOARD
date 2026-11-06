// Kartu utama dashboard: untung atau rugi bulan terpilih dalam satu angka besar,
// lalu "dari setiap Rp100 penjualan" — ke mana uang penjualan pergi.
//
// Rumusnya sama dengan hitungUkuran: laba bersih = pendapatan − harga pokok −
// biaya operasional. Jadi tiga bagian di batang selalu berjumlah tepat Rp100
// (kalau untung). Kalau rugi, biaya melebihi Rp100 dan kelebihannya = rugi.
import { cn } from "@/shared/lib/cn";
import { namaBulan, periodeSebelum, rupiah } from "@/shared/lib/format";

const ada = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

/** Bulatkan beberapa bagian ke rupiah utuh tanpa mengubah jumlahnya (metode sisa terbesar). */
function bulatkanTetapJumlah(bagian, jumlah) {
  const bawah = bagian.map((b) => Math.floor(b));
  let sisa = jumlah - bawah.reduce((a, b) => a + b, 0);
  const urutan = bagian.map((b, i) => ({ i, pecahan: b - Math.floor(b) })).sort((a, b) => b.pecahan - a.pecahan);
  for (const { i } of urutan) {
    if (sisa <= 0) break;
    bawah[i] += 1;
    sisa -= 1;
  }
  return bawah;
}

const SEGMEN = {
  hpp: { label: "Harga pokok penjualan", ket: "biaya membuat atau membeli barang yang dijual", warna: "bg-[hsl(var(--chart-4))]", teks: "text-foreground" },
  biaya: { label: "Biaya operasional", ket: "gaji, listrik, dan biaya harian lainnya", warna: "bg-[hsl(var(--chart-5))]", teks: "text-white" },
  laba: { label: "Laba bersih", ket: "yang tersisa untuk perusahaan", warna: "bg-[hsl(var(--success))]", teks: "text-white" },
  rugi: { label: "Kekurangan (rugi)", ket: "biaya yang melebihi penjualan", warna: "bg-destructive", teks: "text-white" },
};

function susunPerSeratus(u) {
  if (!ada(u?.total_pendapatan) || Number(u.total_pendapatan) <= 0) return null;
  const P = Number(u.total_pendapatan);
  const H = ada(u.total_hpp) ? Number(u.total_hpp) : 0;
  const B = ada(u.total_biaya_operasional) ? Number(u.total_biaya_operasional) : 0;
  if (H < 0 || B < 0) return null;
  const L = P - H - B;
  const per = (x) => (x / P) * 100;

  if (L >= 0) {
    const [h, b, l] = bulatkanTetapJumlah([per(H), per(B), per(L)], 100);
    return { rugi: false, skala: 100, batang: [["hpp", h], ["biaya", b], ["laba", l]] };
  }
  const h = Math.round(per(H));
  const b = Math.round(per(B));
  const lebih = Math.max(0, h + b - 100);
  return { rugi: true, skala: h + b, lebih, batang: [["hpp", h], ["biaya", b]] };
}

export function KartuHasil({ unitNama, periode, ukuranIni, ukuranLalu }) {
  const L = ukuranIni?.laba_bersih;
  if (!ada(L)) return null;
  const laba = Number(L);
  const rugi = laba < 0;
  const bulan = namaBulan(periode, { panjang: true });
  const bulanLalu = namaBulan(periodeSebelum(periode), { panjang: true });
  const perSeratus = susunPerSeratus(ukuranIni);

  let banding;
  const lalu = ukuranLalu?.laba_bersih;
  if (ada(lalu)) {
    const selisih = laba - Number(lalu);
    const asal = `${Number(lalu) < 0 ? "rugi" : "untung"} ${rupiah(Math.abs(Number(lalu)))}`;
    banding =
      Math.abs(selisih) < 1
        ? `Sama dengan ${bulanLalu} (${asal}).`
        : `${selisih > 0 ? "Naik" : "Turun"} ${rupiah(Math.abs(selisih))} dibanding ${bulanLalu} (${asal}).`;
  } else {
    banding = `${bulanLalu} belum ada datanya, jadi belum bisa dibandingkan.`;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="grid lg:grid-cols-5">
        <div className={cn("p-5 sm:p-7 lg:col-span-2", rugi ? "bg-destructive/[0.06]" : "bg-[hsl(var(--accent))]")}>
          <p className="text-sm font-semibold text-foreground/70">
            {unitNama}, {bulan}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-bold",
                rugi ? "bg-destructive text-white" : "bg-[hsl(var(--success))] text-white",
              )}
            >
              {rugi ? "Rugi" : "Untung"}
            </span>
            <span className="text-sm text-foreground/70">laba bersih</span>
          </div>
          <p
            className={cn(
              "mt-2 break-words text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl",
              rugi ? "text-destructive" : "text-foreground",
            )}
          >
            {rupiah(Math.abs(laba))}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">{banding}</p>
        </div>

        <div className="border-t border-border p-5 sm:p-7 lg:col-span-3 lg:border-l lg:border-t-0">
          <p className="text-base font-bold text-foreground">Dari setiap Rp100 penjualan</p>
          <p className="mt-1 text-sm text-muted-foreground">Ke mana uang penjualan {bulan} pergi.</p>

          {!perSeratus ? (
            <p className="mt-5 text-sm text-muted-foreground">Belum bisa dihitung karena pendapatan bulan ini kosong atau nol.</p>
          ) : (
            <>
              <div className="relative mt-5">
                <div className="flex h-11 w-full overflow-hidden rounded-xl bg-muted">
                  {perSeratus.batang.map(([kunci, nilai]) =>
                    nilai > 0 ? (
                      <div
                        key={kunci}
                        className={cn("flex items-center justify-center border-r-2 border-card text-sm font-bold last:border-r-0", SEGMEN[kunci].warna, SEGMEN[kunci].teks)}
                        style={{ width: `${(nilai / perSeratus.skala) * 100}%` }}
                        title={`${SEGMEN[kunci].label}: Rp${nilai}`}
                      >
                        {(nilai / perSeratus.skala) * 100 >= 9 ? `Rp${nilai}` : ""}
                      </div>
                    ) : null,
                  )}
                </div>
                {perSeratus.rugi && perSeratus.lebih > 0 && (
                  <div
                    className="pointer-events-none absolute -bottom-1.5 -top-1.5 w-0.5 rounded-full bg-foreground"
                    style={{ left: `${(100 / perSeratus.skala) * 100}%` }}
                    aria-hidden
                  />
                )}
              </div>
              {perSeratus.rugi && perSeratus.lebih > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">Garis hitam = batas Rp100 penjualan. Bagian setelah garis adalah rugi.</p>
              )}

              <ul className="mt-5 space-y-3">
                {[...perSeratus.batang, ...(perSeratus.rugi ? [["rugi", perSeratus.lebih]] : [])].map(([kunci, nilai]) => (
                  <li key={kunci} className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-start gap-2.5">
                      <span className={cn("mt-1 h-3 w-3 shrink-0 rounded", SEGMEN[kunci].warna)} aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{SEGMEN[kunci].label}</span>
                        <span className="block text-xs text-muted-foreground">{SEGMEN[kunci].ket}</span>
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-base font-bold tabular-nums", kunci === "rugi" ? "text-destructive" : "text-foreground")}>
                      {nilai < 1 && kunci !== "hpp" && kunci !== "biaya" ? "kurang dari Rp1" : `Rp${nilai}`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
