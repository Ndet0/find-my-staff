"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { ShiftStatusBadge } from "@/components/shifts/shift-status-badge";
import { shiftHours } from "@/lib/shift-utils";
import { toast } from "sonner";
import { Calendar, Clock, DollarSign } from "lucide-react";

export default function ProviderPayClient() {
  const { user } = useAuth();
  const supabase = createClient();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchPay = async () => {
      setLoading(true);
      try {
        const { data: providerData, error: providerError } = await supabase
          .from("providers")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (providerError) throw providerError;
        if (!providerData) return;

        const { data, error } = await supabase
          .from("shifts")
          .select(
            "id, date, start_time, end_time, hourly_pay_rate, status, facility:facilities(name)",
          )
          .eq("assigned_provider_id", providerData.id)
          .in("status", ["pending", "assigned"]);

        if (error) throw error;

        const rows = data ?? [];
        setShifts(rows);

        let hours = 0;
        let earnings = 0;
        rows.forEach((shift) => {
          const h = shiftHours(shift.start_time, shift.end_time);
          hours += h;
          earnings += h * Number(shift.hourly_pay_rate);
        });
        setTotalHours(hours);
        setTotalEarnings(earnings);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to load pay: " + message);
      } finally {
        setLoading(false);
      }
    };
    fetchPay();
  }, [supabase, user]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">
          My Pay
        </h1>
        <p className="text-muted-foreground">
          Earnings from your assigned and pending shifts only.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-lg">
        <Card className="border-green-100 dark:border-green-900">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Estimated Total
            </p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              ${totalEarnings.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-100 dark:border-green-900">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Total Hours
            </p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              {totalHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {shifts.map((shift) => {
          const hours = shiftHours(shift.start_time, shift.end_time);
          const pay = hours * Number(shift.hourly_pay_rate);
          return (
            <Card
              key={shift.id}
              className="border-green-100 dark:border-green-900"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-700" />
                    {shift.facility?.name} — {shift.date}
                  </CardTitle>
                  <ShiftStatusBadge status={shift.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {shift.start_time} - {shift.end_time} ({hours.toFixed(1)}h @
                  ${shift.hourly_pay_rate}/hr)
                </p>
                <p className="text-sm font-medium text-green-700 mt-1">
                  ${pay.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          );
        })}
        {shifts.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No assigned shifts with pay yet.
          </div>
        )}
      </div>
    </div>
  );
}
