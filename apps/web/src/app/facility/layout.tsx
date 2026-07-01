import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  if (!profile?.user_type) {
    // #region agent log
    fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',runId:'post-fix',location:'facility/layout.tsx',message:'Redirect missing profile to auth',data:{userId:user.id,profileUserType:null},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    redirect("/auth");
  }

  if (profile.user_type !== "facility") {
    // #region agent log
    fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',runId:'post-fix',location:'facility/layout.tsx',message:'Redirect wrong role to provider dashboard',data:{userId:user.id,profileUserType:profile.user_type},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    redirect("/provider/dashboard");
  }

  return <>{children}</>;
}
