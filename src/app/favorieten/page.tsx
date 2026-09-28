import { FavoritesClient } from "./favorites-client";

export const metadata = { title: "Favorieten — GatVuller" };

export default function FavorietenPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#b4492b]">Bewaard</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Jouw favoriete last-minute afspraken</h1>
      <p className="mt-2 text-slate-500 max-w-xl">
        Opgeslagen op dit toestel — zoals bij Too Good To Go. Open een slot om te boeken voor hij verdwijnt.
      </p>
      <div className="mt-8">
        <FavoritesClient />
      </div>
    </div>
  );
}
