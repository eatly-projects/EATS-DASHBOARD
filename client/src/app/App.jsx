import { Providers } from "@/app/providers/Providers";
import { AppRouter } from "@/app/router/AppRouter";
import { ErrorBoundary } from "@/app/ErrorBoundary";

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  );
}
