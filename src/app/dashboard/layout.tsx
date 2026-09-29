import { DashboardNav } from "@/components/dashboard/nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <DashboardNav />
      {children}
    </div>
  );
}
