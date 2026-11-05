// Titik masuk Vercel (fungsi tanpa server). Aplikasi dibuat sekali per salinan
// fungsi supaya kolam sambungan database dipakai ulang antar-permintaan.
import { buatAplikasi } from "../src/app.js";

const app = buatAplikasi();
export default app;
