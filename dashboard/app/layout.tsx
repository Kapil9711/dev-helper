import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { LiveUpdates } from "@/components/layout/live-updates";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "VH DevTools",
  description: "Real-time application observability dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LiveUpdates />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
