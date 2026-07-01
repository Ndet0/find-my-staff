"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      let fetchedProfile = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        fetchedProfile = profile;
        setProfile(profile);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',runId:'post-fix',location:'use-auth.ts:fetchUser',message:'Auth state resolved',data:{hasUser:!!user,hasProfile:!!fetchedProfile,profileUserType:fetchedProfile?.user_type??null},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      setLoading(false);
    };
    
    fetchUser();
    
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, profile, loading, supabase };
}
