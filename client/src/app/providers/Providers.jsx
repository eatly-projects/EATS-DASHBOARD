import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { queryClient } from "@/shared/api/queryClient";
import { aturSaatBelumMasuk } from "@/shared/api/client";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { KUNCI_SESI } from "@/entities/sesi";

export function Providers({ children }) {
  useEffect(() => {
    // Sesi habis di tengah jalan (server menjawab 401): kosongkan sesi, maka
    // ProtectedRoute mengarahkan ke halaman masuk.
    aturSaatBelumMasuk(() => queryClient.setQueryData(KUNCI_SESI, null));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
              boxShadow: "var(--shadow-elevated)",
              fontSize: "14px",
              maxWidth: "460px",
            },
            success: { iconTheme: { primary: "hsl(168 55% 36%)", secondary: "white" } },
            error: { iconTheme: { primary: "hsl(8 70% 50%)", secondary: "white" } },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
