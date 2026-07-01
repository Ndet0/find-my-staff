"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, Users, Calendar, Bell, Network, LayoutDashboard, LogIn, DollarSign } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@findmystaff/ui/components/button";

export default function Header() {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const userType = profile?.user_type;
  const isAuthenticated = !!user;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    };

    fetchUnread();

    const channel = supabase
      .channel("header-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const facilityLinks = [
    { to: "/facility/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { to: "/facility/calendar" as const, label: "Calendar", icon: Calendar },
    { to: "/facility/providers" as const, label: "Providers", icon: Users },
    { to: "/facility/facilities" as const, label: "Facilities", icon: Building2 },
    { to: "/facility/relationships" as const, label: "Relationships", icon: Network },
    { to: "/facility/notifications" as const, label: "Notifications", icon: Bell, badge: unreadCount },
  ];

  const providerLinks = [
    { to: "/provider/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { to: "/provider/profile" as const, label: "Profile", icon: Users },
    { to: "/provider/calendar" as const, label: "Calendar", icon: Calendar },
    { to: "/provider/pay" as const, label: "Pay", icon: DollarSign },
    { to: "/provider/notifications" as const, label: "Notifications", icon: Bell, badge: unreadCount },
  ];

  const links = isAuthenticated
    ? (userType === "facility" ? facilityLinks : providerLinks)
    : [];

  return (
    <div className="bg-green-900 text-white border-b border-green-800">
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <nav className="flex gap-6 text-sm items-center">
          <Link href="/" className="font-bold mr-2 text-green-100 hover:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            findmystaff
          </Link>
          
          {isAuthenticated && links.map(({ to, label, badge, icon: Icon }) => {
            const isActive = pathname === to;
            return (
              <Link 
                key={to} 
                href={to}
                className={`relative flex items-center gap-1.5 transition-colors ${
                  isActive 
                    ? 'text-white font-semibold' 
                    : 'text-green-200 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {mounted && badge && badge > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="flex items-center gap-2">
          <ModeToggle />
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = "/auth"}
              className="border-green-200 text-green-100 hover:bg-green-800 hover:text-white"
            >
              <LogIn className="h-4 w-4 mr-1" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
