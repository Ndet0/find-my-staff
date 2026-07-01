import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProviderLayout({
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
    fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',runId:'post-fix',location:'provider/layout.tsx',message:'Redirect missing profile to auth',data:{userId:user.id,profileUserType:null},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    redirect("/auth");
  }

  if (profile.user_type !== "provider") {
    // #region agent log
    fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',runId:'post-fix',location:'provider/layout.tsx',message:'Redirect wrong role to facility dashboard',data:{userId:user.id,profileUserType:profile.user_type},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    redirect("/facility/dashboard");
  }

  return <>{children}</>;
}
