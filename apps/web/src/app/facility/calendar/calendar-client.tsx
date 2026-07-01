"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@findmystaff/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@findmystaff/ui/components/select";
import { Input } from "@findmystaff/ui/components/input";
import { Label } from "@findmystaff/ui/components/label";
import { Badge } from "@findmystaff/ui/components/badge";
import { Card, CardContent } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { ShiftCard } from "@/components/shifts/shift-card";
import { SHIFT_ROLES, SHIFT_SPECIALTIES } from "@/lib/shift-utils";
import { toast } from "sonner";
import { Filter } from "lucide-react";

export default function FacilityCalendarClient() {
  const supabase = createClient();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [shiftInterests, setShiftInterests] = useState<Record<string, any[]>>(
    {},
  );

  const [filterFacility, setFilterFacility] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterMinPay, setFilterMinPay] = useState<string>("");
  const [filterMaxPay, setFilterMaxPay] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("shifts")
          .select(
            "*, facility:facilities(name), assigned_provider:providers(first_name, last_name)",
          );
        if (error) throw error;
        setShifts(data ?? []);

        const { data: fData } = await supabase.from("facilities").select("*");
        setFacilities(fData ?? []);

        const { data: interestsData } = await supabase
          .from("shift_interests")
          .select("*, provider:providers(first_name, last_name, role)")
          .in(
            "shift_id",
            (data ?? []).map((s: { id: string }) => s.id),
          );

        const interestsMap: Record<string, any[]> = {};
        (interestsData ?? []).forEach((interest: any) => {
          if (!interestsMap[interest.shift_id]) {
            interestsMap[interest.shift_id] = [];
          }
          interestsMap[interest.shift_id].push(interest);
        });
        setShiftInterests(interestsMap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to load shifts: " + message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const channel = supabase
      .channel("facility-calendar-shifts")
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
  }, [supabase]);

  const getFilteredShifts = () => {
    let result = shifts;

    if (filterStatus !== "all") {
      result = result.filter((s) => s.status === filterStatus);
    }
    if (filterFacility !== "all") {
      result = result.filter((s) => s.facility_id === filterFacility);
    }
    if (filterRole !== "all") {
      result = result.filter((s) => s.required_role === filterRole);
    }
    if (filterSpecialty !== "all") {
      result = result.filter((s) => s.required_specialty === filterSpecialty);
    }
    if (filterDateFrom) {
      result = result.filter((s) => s.date >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((s) => s.date <= filterDateTo);
    }
    if (filterMinPay) {
      result = result.filter(
        (s) => s.hourly_pay_rate >= parseFloat(filterMinPay),
      );
    }
    if (filterMaxPay) {
      result = result.filter(
        (s) => s.hourly_pay_rate <= parseFloat(filterMaxPay),
      );
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
        Shift Calendar
      </h1>
      <p className="text-muted-foreground">
        All shifts across facilities with full pay rate visibility.
      </p>

      <div className="space-y-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="border-green-200"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        {showFilters && (
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={filterStatus}
                    onValueChange={(v) => setFilterStatus(v ?? "all")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Facility</Label>
                  <Select
                    value={filterFacility}
                    onValueChange={(v) => setFilterFacility(v ?? "all")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select
                    value={filterRole}
                    onValueChange={(v) => setFilterRole(v ?? "all")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {SHIFT_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Specialty</Label>
                  <Select
                    value={filterSpecialty}
                    onValueChange={(v) => setFilterSpecialty(v ?? "all")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {SHIFT_SPECIALTIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Min Pay ($)</Label>
                  <Input
                    type="number"
                    value={filterMinPay}
                    onChange={(e) => setFilterMinPay(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Pay ($)</Label>
                  <Input
                    type="number"
                    value={filterMaxPay}
                    onChange={(e) => setFilterMaxPay(e.target.value)}
                    placeholder="∞"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {filteredShifts.map((shift) => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            showPay
            showAssignedProvider
            footer={
              shiftInterests[shift.id]?.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-green-100 dark:border-green-900">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Interested Providers:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {shiftInterests[shift.id].map((interest: any) => (
                      <Badge
                        key={interest.id}
                        variant="outline"
                        className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                      >
                        {interest.provider?.first_name}{" "}
                        {interest.provider?.last_name}
                        {interest.provider?.role &&
                          ` (${interest.provider.role})`}
                        {interest.note && `: ${interest.note}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : undefined
            }
          />
        ))}
        {filteredShifts.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No shifts found.
          </div>
        )}
      </div>
    </div>
  );
}
