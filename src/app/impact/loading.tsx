export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 animate-pulse space-y-4">
      <div className="h-4 w-20 rounded bg-slate-200" />
      <div className="h-10 w-96 max-w-full rounded bg-slate-200" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
