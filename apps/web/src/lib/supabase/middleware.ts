import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@findmystaff/env/web";

type UserType = "facility" | "provider";

const PUBLIC_PATHS = ["/auth", "/login"];

const FACILITY_ONLY_LEGACY: Record<string, string> = {
  "/providers": "/facility/providers",
  "/relationships": "/facility/relationships",
  "/facilities": "/facility/facilities",
};

async function getUserType(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<UserType | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", userId)
    .single();

  if (profile?.user_type === "facility" || profile?.user_type === "provider") {
    return profile.user_type;
  }
  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({
            request,
          });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return supabaseResponse;
  }

  if (!user) {
    if (
      pathname.startsWith("/facility/") ||
      pathname.startsWith("/provider/") ||
      pathname === "/calendar" ||
      pathname === "/notifications" ||
      pathname in FACILITY_ONLY_LEGACY ||
      pathname === "/"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const userType = await getUserType(supabase, user.id);

  if (pathname.startsWith("/facility/")) {
    if (userType !== "facility") {
      const url = request.nextUrl.clone();
      url.pathname =
        userType === "provider" ? "/provider/dashboard" : "/auth";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/provider/")) {
    if (userType !== "provider") {
      const url = request.nextUrl.clone();
      url.pathname =
        userType === "facility" ? "/facility/dashboard" : "/auth";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (pathname in FACILITY_ONLY_LEGACY) {
    const url = request.nextUrl.clone();
    url.pathname = FACILITY_ONLY_LEGACY[pathname];
    return NextResponse.redirect(url);
  }

  if (pathname === "/calendar") {
    const url = request.nextUrl.clone();
    url.pathname =
      userType === "provider" ? "/provider/calendar" : "/facility/calendar";
    return NextResponse.redirect(url);
  }

  if (pathname === "/notifications") {
    const url = request.nextUrl.clone();
    url.pathname =
      userType === "provider"
        ? "/provider/notifications"
        : "/facility/notifications";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
