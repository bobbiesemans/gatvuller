"use client";

import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

export function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Brussels">
        {children}
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
