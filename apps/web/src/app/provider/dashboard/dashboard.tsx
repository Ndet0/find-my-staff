"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@findmystaff/ui/components/button";
import { Badge } from "@findmystaff/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { toast } from "sonner";
import { CheckCircle, XCircle, Calendar, DollarSign, Clock, User, Bell } from "lucide-react";

export default function ProviderDashboard() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  const [provider, setProvider] = useState<any>(null);
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [suggestedShifts, setSuggestedShifts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: pData, error: pError } = await supabase
          .from("providers")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();
        
        if (pError) throw pError;
        setProvider(pData);

        if (pData) {
          const { data: assignedData } = await supabase
            .from("shifts")
            .select("*, facility:facilities(name)")
            .eq("assigned_provider_id", pData.id);
          
          const { data: suggestedData } = await supabase
            .from("shifts")
            .select("*, facility:facilities(name)")
            .eq("status", "open")
            .eq("required_role", pData.role);
          
          setMyShifts(assignedData ?? []);
          setSuggestedShifts(suggestedData ?? []);
        }

        const { data: nData } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        
        setNotifications(nData ?? []);
      } catch (err: any) {
        toast.error("Failed to load dashboard: " + err.message);
      }
    };

    fetchData();

    const shiftsChannel = supabase
      .channel("provider-shifts")
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => {
        fetchData();
        toast.info("Shifts updated");
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel("provider-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, () => {
        fetchData();
        toast.info("New notification received");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(shiftsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, supabase]);

  const handleShowInterest = async (shiftId: string) => {
    setProcessing(`interest-${shiftId}`);
    const { data, error } = await supabase.rpc("show_interest", { p_shift_id: shiftId });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Interest shown! The facility has been notified.");
    } else {
      toast.error(data?.error || "Failed to show interest");
    }
    setProcessing(null);
  };

  const handleAccept = async (shiftId: string) => {
    setProcessing(`accept-${shiftId}`);
    const { data, error } = await supabase.rpc("accept_assignment", { p_shift_id: shiftId });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Shift accepted!");
    } else {
      toast.error(data?.error || "Failed to accept shift");
    }
    setProcessing(null);
  };

  const handleDecline = async (shiftId: string) => {
    setProcessing(`decline-${shiftId}`);
    const { data, error } = await supabase.rpc("decline_assignment", { p_shift_id: shiftId });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Shift declined.");
    } else {
      toast.error(data?.error || "Failed to decline shift");
    }
    setProcessing(null);
  };

  const handleCancel = async (shiftId: string) => {
    setProcessing(`cancel-${shiftId}`);
    const { data, error } = await supabase.rpc("cancel_shift", { p_shift_id: shiftId });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Shift cancelled!");
    } else {
      toast.error(data?.error || "Failed to cancel shift");
    }
    setProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Open</Badge>;
      case "pending": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pending</Badge>;
      case "assigned": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Assigned</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) return (
    <div className="container mx-auto p-4 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">Provider Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome {user?.email}. View your profile, shifts, and manage your calendar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/provider/profile">
          <Button size="sm" variant="outline" className="border-green-200">
            <User className="h-4 w-4 mr-1" />
            Profile
          </Button>
        </Link>
        <Link href="/provider/calendar">
          <Button size="sm" variant="outline" className="border-green-200">
            <Calendar className="h-4 w-4 mr-1" />
            Calendar
          </Button>
        </Link>
        <Link href="/provider/pay">
          <Button size="sm" variant="outline" className="border-green-200">
            <DollarSign className="h-4 w-4 mr-1" />
            Pay
          </Button>
        </Link>
        <Link href="/provider/notifications">
          <Button size="sm" variant="outline" className="border-green-200">
            <Bell className="h-4 w-4 mr-1" />
            Notifications
          </Button>
        </Link>
      </div>

      {provider && (
        <Card className="border-green-100 dark:border-green-900 bg-gradient-to-r from-green-50 to-white dark:from-green-950 dark:to-background">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">{provider.first_name} {provider.last_name}</h2>
                <p className="text-sm text-muted-foreground">{provider.role} | {provider.specialty}</p>
                <p className="text-sm text-muted-foreground">{provider.email}</p>
              </div>
              <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">{provider.role}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-green-100 dark:border-green-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-700" />
              My Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myShifts.map((shift) => (
                <div key={shift.id} className="flex justify-between items-start p-3 bg-green-50/50 dark:bg-green-950/50 rounded-lg border border-green-100 dark:border-green-900">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{shift.facility?.name}</p>
                      {getStatusBadge(shift.status)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {shift.date} | {shift.start_time} - {shift.end_time}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-green-700 mt-1">
                      <DollarSign className="h-3 w-3" />
                      ${shift.hourly_pay_rate}/hr
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {shift.status === "pending" && (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-green-700 hover:bg-green-800" 
                          onClick={() => handleAccept(shift.id)}
                          disabled={processing === `accept-${shift.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleDecline(shift.id)}
                          disabled={processing === `decline-${shift.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </>
                    )}
                    {shift.status === "assigned" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleCancel(shift.id)}
                        disabled={processing === `cancel-${shift.id}`}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {myShifts.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No assigned or pending shifts.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-100 dark:border-green-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-700" />
              Suggested Open Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestedShifts.map((shift) => (
                <div key={shift.id} className="flex justify-between items-start p-3 bg-green-50/50 dark:bg-green-950/50 rounded-lg border border-green-100 dark:border-green-900">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{shift.facility?.name}</p>
                      {getStatusBadge(shift.status)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {shift.date} | {shift.start_time} - {shift.end_time}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-green-700 mt-1">
                      <DollarSign className="h-3 w-3" />
                      ${shift.hourly_pay_rate}/hr
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{shift.required_role} | {shift.required_specialty}</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-green-700 hover:bg-green-800"
                    onClick={() => handleShowInterest(shift.id)}
                    disabled={processing === `interest-${shift.id}`}
                  >
                    Show Interest
                  </Button>
                </div>
              ))}
              {suggestedShifts.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No suggested shifts available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-green-100 dark:border-green-900">
        <CardHeader>
          <CardTitle className="text-lg">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-950/50 rounded-lg">
                <p className="text-sm">{n.message}</p>
                <Badge className={
                  n.type === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  n.type === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-green-100 text-green-800'
                }>
                  {n.type}
                </Badge>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                No notifications
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
