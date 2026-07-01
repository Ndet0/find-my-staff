"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@findmystaff/ui/components/button";
import { Card, CardContent } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import {
  NotificationBadge,
  extractProviderInfo,
} from "@/components/notifications/notification-badge";
import { toast } from "sonner";
import { Clock, UserCheck } from "lucide-react";

export default function FacilityNotificationsClient() {
  const { user } = useAuth();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [shiftDetails, setShiftDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select(
          "*, shift:shifts(date, start_time, end_time, facility_id, facility:facilities(name), assigned_provider_id, status, required_role, hourly_pay_rate)",
        )
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });

      const notifs = data ?? [];
      setNotifications(notifs);

      const shiftMap: Record<string, any> = {};
      notifs.forEach((n) => {
        if (n.shift) {
          shiftMap[n.shift_id] = n.shift;
        }
      });
      setShiftDetails(shiftMap);
      setLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel("facility-notifications-page")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
          toast.info("New notification received");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  const markAsRead = async (id: string) => {
    const { data, error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: id,
    });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    }
  };

  const handleAssign = async (
    shiftId: string,
    providerId: string,
    notificationId: string,
  ) => {
    setProcessing(`assign-${shiftId}`);
    const { data, error } = await supabase.rpc("assign_shift", {
      shift_id: shiftId,
      provider_id: providerId,
    });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Shift assigned! Provider will be notified.");
      await markAsRead(notificationId);
    } else {
      toast.error(data?.error || "Failed to assign shift");
    }
    setProcessing(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">
        Notifications
      </h1>
      <p className="text-muted-foreground">
        Cancellations, interests, acceptances, and declines.
      </p>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const providerInfo = extractProviderInfo(notification.message);
            const shift = shiftDetails[notification.shift_id];

            return (
              <Card
                key={notification.id}
                className={`border-green-100 dark:border-green-900 transition-all ${notification.read ? "opacity-60" : "bg-green-50/30 dark:bg-green-950/30"}`}
              >
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <NotificationBadge type={notification.type} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {notification.message}
                      </p>
                      {shift && (
                        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {shift.facility?.name} - {shift.date} |{" "}
                          {shift.start_time} - {shift.end_time} | $
                          {shift.hourly_pay_rate}/hr
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      {notification.type === "interest" &&
                        providerInfo &&
                        shift?.status === "open" && (
                          <Button
                            size="sm"
                            className="bg-green-700 hover:bg-green-800"
                            onClick={() => {
                              supabase
                                .from("providers")
                                .select("id")
                                .eq(
                                  "first_name",
                                  providerInfo.name.split(" ")[0],
                                )
                                .eq(
                                  "last_name",
                                  providerInfo.name.split(" ")[1] ?? "",
                                )
                                .single()
                                .then(({ data }) => {
                                  if (data) {
                                    handleAssign(
                                      notification.shift_id,
                                      data.id,
                                      notification.id,
                                    );
                                  } else {
                                    toast.error(
                                      "Could not find provider. Please assign from the dashboard.",
                                    );
                                  }
                                });
                            }}
                            disabled={
                              processing === `assign-${notification.shift_id}`
                            }
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        )}
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No notifications found.
          </div>
        )}
      </div>
    </div>
  );
}
