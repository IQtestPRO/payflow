import type { Metadata } from "next";
import "@/app/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "PayFlow",
  description: "Central de WhatsApp, pagamentos pendentes, ofertas e campanhas."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
