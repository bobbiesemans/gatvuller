import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.auth");
  return { title: t("registerMetaTitle"), description: t("registerMetaDesc"), alternates: { canonical: "/register" }, robots: { index: false } };
}

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:py-16">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-lg" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
