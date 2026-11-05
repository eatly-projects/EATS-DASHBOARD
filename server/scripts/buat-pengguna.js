// Membuat akun login (atau mengganti kata sandi akun yang sudah ada).
//
//   npm run pengguna:buat -- --email lutfi@contoh.com --nama "Lutfi" --peran admin
//       -> kata sandi diketik (tidak terlihat di layar)
//   npm run pengguna:buat -- --email ... --nama ... --peran staf --sandi-acak
//       -> kata sandi acak, ditulis ke berkas akun-baru.local.txt di akar project
//          (berkas *.local.txt tidak ikut ke GitHub), tidak dicetak ke layar.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { pool } from "../src/shared/db/pool.js";

const arg = (nama) => {
  const i = process.argv.indexOf(`--${nama}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const email = (arg("email") || "").trim().toLowerCase();
const nama = (arg("nama") || "").trim();
const peran = (arg("peran") || "staf").trim();
const acak = process.argv.includes("--sandi-acak");

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("--email wajib dan harus sah.");
if (!nama) throw new Error("--nama wajib diisi.");
if (!["admin", "staf"].includes(peran)) throw new Error("--peran harus admin atau staf.");

function tanyaSandi(judul) {
  return new Promise((selesai) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.stdoutMuted = true;
    rl._writeToOutput = (s) => { if (!rl.stdoutMuted || s.includes(judul)) rl.output.write(s); };
    rl.question(judul, (j) => { rl.close(); process.stdout.write("\n"); selesai(j); });
  });
}

let sandi;
if (process.env.SANDI_BARU) {
  // Untuk otomasi (mis. akun uji sekali pakai): kata sandi dari variabel lingkungan.
  sandi = process.env.SANDI_BARU;
} else if (acak) {
  sandi = crypto.randomBytes(9).toString("base64url");
} else {
  sandi = await tanyaSandi("Kata sandi (min. 8 karakter): ");
  const ulang = await tanyaSandi("Ulangi kata sandi: ");
  if (sandi !== ulang) throw new Error("Kata sandi tidak sama.");
}
if (sandi.length < 8) throw new Error("Kata sandi minimal 8 karakter.");

const hash = await bcrypt.hash(sandi, 10);
try {
  const { rows } = await pool.query(
    `insert into pengguna (email, nama, peran, kata_sandi_hash) values ($1, $2, $3, $4)
     on conflict ((lower(email))) do update set nama = excluded.nama, peran = excluded.peran,
       kata_sandi_hash = excluded.kata_sandi_hash, aktif = true, diubah_at = now()
     returning id, (xmax = 0) as baru`,
    [email, nama, peran, hash],
  );
  console.log(`Akun ${email} (${peran}) ${rows[0].baru ? "dibuat" : "diperbarui"}.`);
  if (acak) {
    const berkas = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../akun-baru.local.txt");
    fs.appendFileSync(berkas, `${new Date().toISOString()}  ${email}  ${peran}  kata sandi: ${sandi}\n`);
    console.log(`Kata sandi acak ditulis ke ${berkas} (tidak ikut ke GitHub).`);
  }
} finally {
  await pool.end();
}
