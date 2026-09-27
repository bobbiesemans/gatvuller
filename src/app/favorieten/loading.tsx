export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 animate-pulse space-y-4">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-9 w-80 rounded bg-slate-200" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
