import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProviderDashboard from "./dashboard";

export default async function ProviderDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return <ProviderDashboard />;
}
