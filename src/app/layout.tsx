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
import { getCurrentUser } from "@/lib/session";

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
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      locale: OG_LOCALE[locale],
      type: "website",
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/icon.svg", type: "image/svg+xml" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    twitter: { card: "summary_large_image", title: "GatVuller", description: t("ogDescription") },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = toLocale(await getLocale());
  const messages = await getMessages();
  const me = await getCurrentUser();
  const t = await getTranslations("ui.nav");
  return (
    <html lang={HTML_LANG[locale]}>
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} min-h-screen flex flex-col antialiased`}>
        <Providers locale={locale} messages={messages}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {t("skip")}
          </a>
          <EnvironmentBanner />
          <Header />
          <main id="main" tabIndex={-1} className="flex-1 pb-20 outline-none lg:pb-0">{children}</main>
          <Footer />
          <MobileNav role={me?.role ?? null} />
        </Providers>
      </body>
    </html>
  );
}
