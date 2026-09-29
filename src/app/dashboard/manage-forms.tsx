"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";

export function ProfileForm({
  salon,
}: {
  salon: { id: string; name: string; description: string; phone: string | null; website: string | null; address: string; postalCode: string | null };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    const res = await fetch("/api/salon/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salonId: salon.id,
        name: fd.get("name"),
        description: fd.get("description"),
        phone: fd.get("phone"),
        website: fd.get("website"),
        address: fd.get("address"),
        postalCode: fd.get("postalCode"),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "geocode_failed" ? "Dit adres konden we niet op de kaart zetten." : "Opslaan mislukt.");
      return;
    }
    setMessage("Profiel opgeslagen. Een gewijzigd adres is opnieuw gegeocodeerd.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div>
        <Label htmlFor={`name-${salon.id}`}>Naam</Label>
        <Input id={`name-${salon.id}`} name="name" required defaultValue={salon.name} className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`desc-${salon.id}`}>Beschrijving</Label>
        <textarea id={`desc-${salon.id}`} name="description" required minLength={10} defaultValue={salon.description} className="mt-1 min-h-24 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`phone-${salon.id}`}>Telefoon</Label>
          <Input id={`phone-${salon.id}`} name="phone" defaultValue={salon.phone || ""} className="mt-1" />
        </div>
        <div>
          <Label htmlFor={`web-${salon.id}`}>Website</Label>
          <Input id={`web-${salon.id}`} name="website" defaultValue={salon.website || ""} className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor={`addr-${salon.id}`}>Adres</Label>
        <Input id={`addr-${salon.id}`} name="address" required defaultValue={salon.address} className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`pc-${salon.id}`}>Postcode</Label>
        <Input id={`pc-${salon.id}`} name="postalCode" defaultValue={salon.postalCode || ""} className="mt-1 max-w-40" />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <Button type="submit" className="w-fit">Opslaan</Button>
    </form>
  );
}

export function PhotoForm({ salonId, enabled }: { salonId: string; enabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  if (!enabled) {
    return <Notice>Uploaden staat uit zolang er geen opslagtoken is ingesteld.</Notice>;
  }
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const body = new FormData(event.currentTarget);
    body.set("salonId", salonId);
    const res = await fetch("/api/salon/photos", { method: "POST", body });
    if (!res.ok) {
      setError("De foto is niet opgeslagen. Gebruik JPG, PNG of WebP onder 4 MB.");
      return;
    }
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor={`photo-${salonId}`}>Foto</Label>
        <Input id={`photo-${salonId}`} name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1" />
      </div>
      <Button type="submit" size="sm">Uploaden</Button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

export function LocationForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    const res = await fetch("/api/salon/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        city: fd.get("city"),
        category: fd.get("category"),
        address: fd.get("address"),
        businessNumber: fd.get("businessNumber"),
      }),
    });
    if (!res.ok) {
      setError("De locatie is niet aangemaakt. Controleer stad, categorie en adres.");
      return;
    }
    setMessage("Locatie aangemaakt. Ze wacht op goedkeuring.");
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="loc-name">Naam</Label>
        <Input id="loc-name" name="name" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="loc-city">Stad</Label>
        <Input id="loc-city" name="city" required defaultValue="Antwerpen" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="loc-cat">Categorie</Label>
        <select id="loc-cat" name="category" className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm" defaultValue="KAPPER">
          <option value="KAPPER">Kapper</option>
          <option value="SCHOONHEID">Schoonheid</option>
          <option value="NAGELS">Nagels</option>
          <option value="MASSAGE">Massage</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="loc-address">Adres</Label>
        <Input id="loc-address" name="address" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="loc-kbo">Ondernemingsnummer</Label>
        <Input id="loc-kbo" name="businessNumber" className="mt-1" />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <Button type="submit" className="w-fit">Locatie toevoegen</Button>
    </form>
  );
}

export function TemplateEdit({
  template,
}: {
  template: { id: string; salonId: string; title: string; durationMin: number; originalPrice: number; discountPrice: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>Bewerken</Button>;
  }
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const res = await fetch("/api/salon/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: template.id,
        salonId: template.salonId,
        title: fd.get("title"),
        durationMin: Number(fd.get("durationMin")),
        originalPrice: Math.round(Number(fd.get("original")) * 100),
        discountPrice: Math.round(Number(fd.get("discount")) * 100),
      }),
    });
    if (!res.ok) {
      setError("Sjabloon niet opgeslagen.");
      return;
    }
    setOpen(false);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-2 grid gap-2 sm:grid-cols-5">
      <Input name="title" aria-label="Behandeling" defaultValue={template.title} required />
      <Input name="durationMin" aria-label="Minuten" type="number" min={10} defaultValue={template.durationMin} required />
      <Input name="original" aria-label="Normale prijs in euro" type="number" step="0.01" defaultValue={(template.originalPrice / 100).toFixed(2)} required />
      <Input name="discount" aria-label="Kortingsprijs in euro" type="number" step="0.01" defaultValue={(template.discountPrice / 100).toFixed(2)} required />
      <Button type="submit" size="sm">Opslaan</Button>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-5">{error}</p>}
    </form>
  );
}
