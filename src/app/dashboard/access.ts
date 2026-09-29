import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

/** Dashboard pages are for business owners and admins. Everyone else is sent to log in or home. */
export async function requireOwner(callbackUrl: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (user.role !== "SALON_OWNER" && user.role !== "ADMIN") redirect("/");
  return user;
}
