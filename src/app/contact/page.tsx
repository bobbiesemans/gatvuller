import type { Metadata } from "next";
import { COMPANY } from "@/lib/config";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact met GatVuller over een boeking, een zaak of privacy.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">Contact</h1>
      <p className="mt-2 text-sm text-stone-600">
        Algemeen: <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        <br />
        Privacy: <a className="underline" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>
      </p>
      <ContactForm />
    </div>
  );
}
