import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.auth");
  return { title: t("forgotTitle"), description: t("forgotMetaDesc"), alternates: { canonical: "/wachtwoord-vergeten" }, robots: { index: false } };
}

export default function ForgotPage() {
  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:py-16">
      <ForgotForm />
    </div>
  );
}
