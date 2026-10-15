"use client";

import { PreferencesProvider } from "@/lib/prefrences";
import { makeQueryClient } from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";

const queryClient = makeQueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      {" "}
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PreferencesProvider>
  );
}
