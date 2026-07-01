import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FacilityDashboard from "./dashboard";

export default async function FacilityDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return <FacilityDashboard />;
}
