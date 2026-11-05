// Menjalankan backend di laptop: npm run dev (port 4910).
import { buatAplikasi } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./shared/db/pool.js";

const app = buatAplikasi();

try {
  const { rows } = await pool.query("select current_user as peran, current_setting('search_path') as jalur");
  console.log(`[db] tersambung sebagai ${rows[0].peran}, search_path ${rows[0].jalur}`);
} catch (e) {
  console.error("[db] GAGAL tersambung:", e.message);
}

const server = app.listen(env.port, () => {
  console.log(`[api] EATS Dashboard API berjalan di http://localhost:${env.port}`);
});

const berhenti = () => {
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", berhenti);
process.on("SIGTERM", berhenti);
