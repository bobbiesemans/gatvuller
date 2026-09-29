import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, toLocale } from "./config";
import { catalogFor } from "./catalog";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = toLocale(store.get(LOCALE_COOKIE)?.value);
  return { locale, messages: catalogFor(locale) };
});
