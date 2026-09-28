import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";
import { Providers } from "@/components/providers";
import { EnvironmentBanner } from "@/components/environment-banner";
import { appUrl } from "@/lib/config";
import { toLocale } from "@/i18n/config";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

const HTML_LANG = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" } as const;
const OG_LOCALE = { nl: "nl_BE", fr: "fr_BE", en: "en_GB" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.meta");
  const locale = toLocale(await getLocale());
  const site = appUrl();
  return {
    title: { default: t("title"), template: "%s · GatVuller" },
    description: t("description"),
    metadataBase: new URL(site),
    alternates: { canonical: "/" },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      locale: OG_LOCALE[locale],
      type: "website",
      url: site,
    },
    manifest: "/manifest.webmanifest",
    twitter: { card: "summary_large_image", title: "GatVuller", description: t("ogDescription") },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = toLocale(await getLocale());
  const messages = await getMessages();
  return (
    <html lang={HTML_LANG[locale]}>
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} min-h-screen flex flex-col antialiased`}>
        <Providers locale={locale} messages={messages}>
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
