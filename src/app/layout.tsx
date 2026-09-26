import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "GatVuller — Last-minute afspraken met korting",
    template: "%s · GatVuller",
  },
  description:
    "Vul lege salon-gaten vandaag of morgen. Klanten boeken last-minute met korting. Voor kappers, tandartsen, schoonheid, fysio & meer in BE/NL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE">
      <body className="min-h-screen flex flex-col antialiased">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
