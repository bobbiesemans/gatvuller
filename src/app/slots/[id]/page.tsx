import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS, discountPercent, formatEuro } from "@/lib/utils";
import { BookForm } from "./book-form";

export const dynamic = "force-dynamic";

export default async function SlotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { salon: true, booking: true },
  });
  if (!slot) notFound();
  const session = await auth();
  const pct = discountPercent(slot.originalPrice, slot.discountPrice);
  const open = slot.status === "OPEN" && slot.startsAt > new Date();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3 space-y-4">
          <Badge variant="violet">{CATEGORY_LABELS[slot.salon.category]}</Badge>
          <h1 className="text-3xl font-extrabold text-slate-900">{slot.title}</h1>
          <p className="text-slate-600">
            {slot.salon.name} · {slot.salon.address}, {slot.salon.city} · ★ {slot.salon.rating.toFixed(1)}
          </p>
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>
                <strong>Wanneer:</strong>{" "}
                {format(slot.startsAt, "EEEE d MMMM yyyy · HH:mm", { locale: nlBE })} –{" "}
                {format(slot.endsAt, "HH:mm", { locale: nlBE })}
              </p>
              {slot.description && <p>{slot.description}</p>}
              <p className="text-slate-500">{slot.salon.description}</p>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card className="sticky top-24">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-violet-700">{formatEuro(slot.discountPrice)}</p>
                  <p className="text-sm text-slate-400 line-through">{formatEuro(slot.originalPrice)}</p>
                </div>
                <Badge variant="success">-{pct}% last-minute</Badge>
              </div>
              {!open ? (
                <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Niet beschikbaar ({slot.status.toLowerCase()}).</p>
              ) : (
                <BookForm
                  slotId={slot.id}
                  price={slot.discountPrice}
                  defaultName={session?.user?.name || ""}
                  defaultEmail={session?.user?.email || ""}
                  loggedIn={Boolean(session?.user)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
