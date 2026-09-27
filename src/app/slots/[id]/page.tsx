import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ShareButton } from "@/components/share-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  discountPercent,
  formatEuro,
  saveAmount,
} from "@/lib/utils";
import { BookForm } from "./book-form";
import { Countdown } from "@/components/countdown";
import { FavoriteButton } from "@/components/favorite-button";
import { MiniMap } from "@/components/map/mini-map";
import { MapPin, Star, Clock } from "lucide-react";

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
  const save = saveAmount(slot.originalPrice, slot.discountPrice);
  const open = slot.status === "OPEN" && slot.startsAt > new Date();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="violet">
              {CATEGORY_EMOJI[slot.salon.category]} {CATEGORY_LABELS[slot.salon.category]}
            </Badge>
            <Badge variant="success">-{pct}% Surprise</Badge>
            <Badge>Nog {slot.spotsLeft} beschikbaar</Badge>
            <FavoriteButton slotId={slot.id} />
            <ShareButton title={slot.title} />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {slot.title}
          </h1>
          <p className="text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-slate-800">{slot.salon.name}</span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {slot.salon.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-violet-600" />
              {slot.salon.address}
            </span>
          </p>

          <Card>
            <CardHeader>
              <CardTitle>Tijdvenster & details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-2 text-base text-slate-800 font-medium">
                <Clock className="h-4 w-4 text-violet-600" />
                {format(slot.startsAt, "EEEE d MMMM yyyy · HH:mm", { locale: nlBE })} –{" "}
                {format(slot.endsAt, "HH:mm", { locale: nlBE })}
              </p>
              <p>
                <Countdown to={slot.startsAt} label="Start over" />
              </p>
              {slot.description && <p>{slot.description}</p>}
              <p className="text-slate-500">{slot.salon.description}</p>
              <p className="font-semibold text-emerald-700">Je bespaart {formatEuro(save)}</p>
            </CardContent>
          </Card>

          <div>
            <h2 className="font-bold mb-2">Locatie</h2>
            <MiniMap
              lat={slot.salon.lat}
              lng={slot.salon.lng}
              label={slot.salon.name}
              className="h-56 w-full overflow-hidden rounded-2xl border border-slate-200"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Card className="sticky top-24 overflow-hidden">
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-4 text-white">
              <p className="text-sm text-violet-100">Surprise prijs</p>
              <div className="flex items-end justify-between gap-3 mt-1">
                <p className="text-3xl font-extrabold">{formatEuro(slot.discountPrice)}</p>
                <div className="text-right">
                  <p className="text-sm line-through text-violet-200">{formatEuro(slot.originalPrice)}</p>
                  <Badge className="bg-white text-violet-800 border-0">-{pct}%</Badge>
                </div>
              </div>
            </div>
            <CardContent className="p-5 space-y-4">
              {!open ? (
                <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                  Dit slot is niet meer beschikbaar ({slot.status.toLowerCase()}).
                </p>
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
