import type { Metadata } from "next";

import type { RootLayoutProps } from "@/components/types/control.types";
import { AuthProvider } from "@/features/auth/providers/auth-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "TaxSkills · Gestión documental",
  description: "Sistema documental contable y laboral del estudio.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-zinc-50 font-sans text-zinc-950 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
