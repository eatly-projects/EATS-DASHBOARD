// Membaca & memeriksa variabel lingkungan. Satu-satunya berkas rahasia ada di
// akar project (EATS-DASHBOARD/.env). Di Vercel nilainya datang dari dasbor,
// jadi berkas itu memang tidak ada di sana dan itu normal.
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(AKAR, ".env"), quiet: true });

const wajib = (nama) => {
  const v = process.env[nama];
  if (!v || !v.trim()) {
    console.error(`\n[env] ${nama} belum diisi. Lihat .env.example di akar project.\n`);
    process.exit(1);
  }
  return v.trim();
};

const skema = (process.env.DB_SCHEMA || "").trim();
if (!/^[a-z_][a-z0-9_]*$/.test(skema) || skema === "public") {
  // Operations pernah 500 di production karena DB_SCHEMA lupa diisi di Vercel
  // dan diam-diam jatuh ke `public`. Di sini lebih baik menolak menyala.
  console.error(`\n[env] DB_SCHEMA tidak sah: "${skema}". Isi DB_SCHEMA=finance.\n`);
  process.exit(1);
}

const jwtSecret = wajib("JWT_SECRET");
if (jwtSecret.length < 32) {
  console.error("\n[env] JWT_SECRET minimal 32 karakter.\n");
  process.exit(1);
}

const databaseUrl = wajib("DATABASE_URL");
if (/@db\.[^.]+\.supabase\.co/.test(databaseUrl)) {
  console.error("\n[env] Host db.<ref>.supabase.co sudah tidak bisa dipakai. Gunakan pooler aws-1-ap-southeast-1.pooler.supabase.com:6543.\n");
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  isVercel: Boolean(process.env.VERCEL),
  port: Number(process.env.PORT) || 4910,
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5178")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl,
  dbSchema: skema,
  jwtSecret,
  anthropicKey: (process.env.ANTHROPIC_API_KEY || "").trim(),
  geminiKey: (process.env.GEMINI_API_KEY || "").trim(),
};
