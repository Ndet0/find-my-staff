"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@findmystaff/ui/components/button";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { ShiftCard } from "@/components/shifts/shift-card";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

export default function ProviderCalendarClient() {
  const { user } = useAuth();
  const supabase = createClient();
  const [shifts, setShifts] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: providerData, error: providerError } = await supabase
          .from("providers")
          .select("id, role")
          .eq("auth_user_id", user.id)
          .single();

        if (providerError) throw providerError;
        setProviderId(providerData?.id ?? null);

        if (providerData) {
          const { data, error } = await supabase
            .from("shifts")
            .select("*, facility:facilities(name)")
            .or(
              `assigned_provider_id.eq.${providerData.id},and(status.eq.open,required_role.in.("${providerData.role}"))`,
            );
          if (error) throw error;
          setShifts(data ?? []);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to load shifts: " + message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const channel = supabase
      .channel("provider-calendar-shifts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  const handleShowInterest = async (shiftId: string) => {
    setProcessing(`interest-${shiftId}`);
    const { data, error } = await supabase.rpc("show_interest", {
      p_shift_id: shiftId,
    });
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
    const { data, error } = await supabase.rpc("accept_assignment", {
      p_shift_id: shiftId,
    });
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
    const { data, error } = await supabase.rpc("decline_assignment", {
      p_shift_id: shiftId,
    });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Shift declined.");
    } else {
      toast.error(data?.error || "Failed to decline shift");
    }
    setProcessing(null);
  };

  const handleCancelShift = async (shiftId: string) => {
    setProcessing(`cancel-${shiftId}`);
    const { data, error } = await supabase.rpc("cancel_shift", {
      p_shift_id: shiftId,
    });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Shift cancelled!");
    } else {
      toast.error(data?.error || "Failed to cancel shift");
    }
    setProcessing(null);
  };

  const isOwnShift = (shift: { assigned_provider_id?: string | null }) =>
    providerId && shift.assigned_provider_id === providerId;

  const getFilteredShifts = () => {
    let result = shifts;
    if (activeTab === "my") {
      result = result.filter(
        (s) =>
          isOwnShift(s) &&
          (s.status === "assigned" || s.status === "pending"),
      );
    } else if (activeTab === "suggested") {
      result = result.filter((s) => s.status === "open");
    }
    return result;
  };

  const filteredShifts = getFilteredShifts();

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">
        My Calendar
      </h1>
      <p className="text-muted-foreground">
        Your shifts and eligible open shifts.
      </p>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeTab === "all" ? "default" : "outline"}
          onClick={() => setActiveTab("all")}
          className={activeTab === "all" ? "bg-green-700" : "border-green-200"}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={activeTab === "my" ? "default" : "outline"}
          onClick={() => setActiveTab("my")}
          className={activeTab === "my" ? "bg-green-700" : "border-green-200"}
        >
          My Shifts
        </Button>
        <Button
          size="sm"
          variant={activeTab === "suggested" ? "default" : "outline"}
          onClick={() => setActiveTab("suggested")}
          className={
            activeTab === "suggested" ? "bg-green-700" : "border-green-200"
          }
        >
          Suggested
        </Button>
      </div>

      <div className="space-y-4">
        {filteredShifts.map((shift) => {
          const own = isOwnShift(shift);
          return (
            <ShiftCard
              key={shift.id}
              shift={shift}
              showPay={own || shift.status === "open"}
              showAssignedProvider={false}
              actions={
                <>
                  {shift.status === "open" && (
                    <Button
                      size="sm"
                      className="bg-green-700 hover:bg-green-800"
                      onClick={() => handleShowInterest(shift.id)}
                      disabled={processing === `interest-${shift.id}`}
                    >
                      Show Interest
                    </Button>
                  )}
                  {own && shift.status === "pending" && (
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
                  {own && shift.status === "assigned" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleCancelShift(shift.id)}
                      disabled={processing === `cancel-${shift.id}`}
                    >
                      Cancel Shift
                    </Button>
                  )}
                </>
              }
            />
          );
        })}
        {filteredShifts.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No shifts found.
          </div>
        )}
      </div>
    </div>
  );
}
