import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";
import { Providers } from "@/components/providers";
import { EnvironmentBanner } from "@/components/environment-banner";
import { appUrl } from "@/lib/config";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const site = appUrl();

export const metadata: Metadata = {
  title: {
    default: "GatVuller — lege uren, last-minute omzet",
    template: "%s · GatVuller",
  },
  description:
    "Lokale kappers, schoonheidssalons en masseurs zetten een vrij uur om in omzet. Klanten in Antwerpen boeken vandaag of morgen met korting.",
  metadataBase: new URL(site),
  alternates: { canonical: "/" },
  openGraph: {
    title: "GatVuller — lege uren worden omzet",
    description: "Last-minute afspraken bij betrouwbare zaken in je buurt. Eerst beauty in Antwerpen.",
    locale: "nl_BE",
    type: "website",
    url: site,
  },
  manifest: "/manifest.webmanifest",
  twitter: {
    card: "summary_large_image",
    title: "GatVuller",
    description: "Vrije uren bij lokale zaken, meteen te boeken.",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased`}>
        <Providers>
          <EnvironmentBanner />
          <Header />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
