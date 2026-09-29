import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.auth");
  return { title: t("loginMetaTitle"), description: t("loginMetaDesc"), alternates: { canonical: "/login" }, robots: { index: false } };
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
