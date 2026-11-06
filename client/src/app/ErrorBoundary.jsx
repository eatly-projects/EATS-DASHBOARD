import { Component } from "react";

// Tanpa ini, satu galat tampilan membuat layar putih kosong. Di PLD, layar
// galat yang bisa difoto pengguna inilah yang membuka diagnosis masalahnya.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { galat: null };
  }

  static getDerivedStateFromError(galat) {
    return { galat };
  }

  componentDidCatch(galat, info) {
    console.error("[EATS] galat tampilan:", galat, info?.componentStack);
  }

  render() {
    if (!this.state.galat) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/30 bg-card p-6 shadow-card">
          <h1 className="font-display text-xl font-bold text-destructive">Halaman mengalami masalah</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Silakan muat ulang halaman. Kalau masih terjadi, foto layar ini dan kirim ke tim pengembang.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-foreground">
            {String(this.state.galat?.message ?? this.state.galat)}
            {"\n"}Peramban: {navigator.userAgent}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Muat ulang halaman
          </button>
        </div>
      </div>
    );
  }
}
