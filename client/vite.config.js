import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    // Port 5178 dikunci. Lutfi memakai 4000 dan 5173 untuk pekerjaan lain;
    // `strictPort` mencegah Vite diam-diam pindah port (lalu proxy/cookie bingung).
    port: 5178,
    strictPort: true,
    host: true,
    // /api diteruskan ke backend (port 4910), jadi browser melihat satu domain:
    // tidak ada masalah CORS dan cookie sesi tetap first-party.
    // Di production, rewrite di vercel.json melakukan hal yang sama.
    proxy: {
      "/api": {
        target: "http://localhost:4910",
        changeOrigin: true,
      },
    },
  },
  // Semua paket didaftarkan supaya Vite tidak memaksa reload di tengah jalan saat
  // halaman baru pertama dibuka (pelajaran PLD Dashboard).
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "axios",
      "zustand",
      "zustand/middleware",
      "recharts",
      "framer-motion",
      "lucide-react",
      "react-hot-toast",
      "react-icons/fi",
      "@radix-ui/react-dialog",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "@radix-ui/react-separator",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-popover",
      "@radix-ui/react-collapsible",
    ],
  },
  build: {
    target: ["es2019", "safari14", "chrome87", "firefox78", "edge88"],
    // Pustaka besar dipisah supaya kode aplikasi yang sering berubah tidak
    // membuat pengguna mengunduh ulang semuanya.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          grafik: ["recharts"],
          data: ["@tanstack/react-query", "axios", "zustand"],
          tampilan: ["framer-motion", "lucide-react", "react-hot-toast"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
