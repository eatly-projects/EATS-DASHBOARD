// Gaya grafik Recharts. Warna dari variabel CSS tema "Merah cabai":
// pendapatan merah cabai, harga pokok kunyit, laba bersih garis arang.
export const WARNA = {
  pendapatan: "hsl(var(--chart-1))",
  hpp: "hsl(var(--chart-4))",
  laba: "hsl(var(--chart-2))",
  biaya: "hsl(var(--chart-5))",
  unit: {
    EATS: "hsl(var(--chart-1))",
    BOOMBOO: "hsl(var(--chart-4))",
  },
};

export const sumbuTick = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

export const gayaTooltip = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};
