import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "GatVuller — Too Good To Go voor afspraken",
    template: "%s · GatVuller",
  },
  description:
    "Surprise slots bij kapper, schoonheid, fysio, tandarts & meer. Last-minute gaten vullen — jij bespaart tot 50%. België & Nederland.",
  metadataBase: new URL("https://gatvuller-validee-s-projects.vercel.app"),
  openGraph: {
    title: "GatVuller — Too Good To Go voor afspraken",
    description: "Ontdek last-minute Surprise slots op de kaart. Niet voor eten — voor lege stoelen.",
    locale: "nl_BE",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
  twitter: {
    card: "summary_large_image",
    title: "GatVuller — Surprise slots",
    description: "Too Good To Go voor afspraken. Kaart + korting + countdown.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased`}>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
