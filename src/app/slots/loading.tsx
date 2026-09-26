export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 animate-pulse space-y-6">
      <div className="h-10 w-72 rounded-xl bg-slate-200" />
      <div className="h-11 w-full rounded-xl bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
