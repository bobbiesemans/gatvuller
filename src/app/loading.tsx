export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 animate-pulse space-y-6">
      <div className="h-16 w-2/3 rounded-2xl bg-[#f8ebe5]" />
      <div className="h-10 w-1/2 rounded-xl bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
