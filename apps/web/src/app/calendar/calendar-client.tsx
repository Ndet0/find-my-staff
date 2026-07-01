"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@findmystaff/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@findmystaff/ui/components/select";
import { Input } from "@findmystaff/ui/components/input";
import { Label } from "@findmystaff/ui/components/label";
import { Badge } from "@findmystaff/ui/components/badge";
import { Card, CardContent } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { toast } from "sonner";
import { Filter } from "lucide-react";

const ROLES = ["CNA", "LPN", "RN", "NP"];
const SPECIALTIES = ["ICU", "Emergency", "Med-Surg", "Telemetry", "Long-Term Care", "Family Medicine"];

export default function CalendarClient() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [facilities, setFacilities] = useState<any[]>([]);
  const [shiftInterests, setShiftInterests] = useState<Record<string, any[]>>({});

  // Facility filters
  const [filterFacility, setFilterFacility] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterMinPay, setFilterMinPay] = useState<string>("");
  const [filterMaxPay, setFilterMaxPay] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const isFacility = profile?.user_type === "facility";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("shifts")
          .select("*, facility:facilities(name), assigned_provider:providers(first_name, last_name)");
        
        if (profile?.user_type === "provider") {
          const { data: providerData, error: providerError } = await supabase
            .from("providers")
            .select("id, role, specialty")
            .eq("auth_user_id", user?.id)
            .single();
          
          if (providerError) throw providerError;
          
          if (providerData) {
            query = supabase
              .from("shifts")
              .select("*, facility:facilities(name), assigned_provider:providers(first_name, last_name)")
              .or(`assigned_provider_id.eq.${providerData.id},and(status.eq.open,required_role.in.("${providerData.role}"))`);
          }
        }
        
        const { data, error } = await query;
        if (error) throw error;
        setShifts(data ?? []);

        if (isFacility) {
          const { data: fData } = await supabase.from("facilities").select("*");
          setFacilities(fData ?? []);

          // Fetch shift interests for facility shifts
          const { data: interestsData } = await supabase
            .from("shift_interests")
            .select("*, provider:providers(first_name, last_name, role, note)")
            .in("shift_id", (data ?? []).map((s: any) => s.id));
          
          const interestsMap: Record<string, any[]> = {};
          (interestsData ?? []).forEach((interest: any) => {
            if (!interestsMap[interest.shift_id]) {
              interestsMap[interest.shift_id] = [];
            }
            interestsMap[interest.shift_id].push(interest);
          });
          setShiftInterests(interestsMap);
        }
      } catch (err: any) {
        toast.error("Failed to load shifts: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const channel = supabase
      .channel("calendar-shifts")
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, profile]);

  const handleShowInterest = async (shiftId: string) => {
    const { data, error } = await supabase.rpc("show_interest", { p_shift_id: shiftId });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Interest shown! The facility has been notified.");
    } else {
      toast.error(data?.error || "Failed to show interest");
    }
  };

  const handleCancelShift = async (shiftId: string) => {
    const { data, error } = await supabase.rpc("cancel_shift", { p_shift_id: shiftId });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Shift cancelled!");
    } else {
      toast.error(data?.error || "Failed to cancel shift");
    }
  };

  const getFilteredShifts = () => {
    let result = shifts;

    if (!isFacility) {
      // Provider tabs
      if (activeTab === "my") {
        result = result.filter((s) => s.status === "assigned" || s.status === "pending");
      } else if (activeTab === "suggested") {
        result = result.filter((s) => s.status === "open");
      }
    } else {
      // Facility filters
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
        result = result.filter((s) => s.hourly_pay_rate >= parseFloat(filterMinPay));
      }
      if (filterMaxPay) {
        result = result.filter((s) => s.hourly_pay_rate <= parseFloat(filterMaxPay));
      }
    }

    return result;
  };

  const filteredShifts = getFilteredShifts();

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
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">Shift Calendar</h1>
      
      {!isFacility && (
        <div className="flex gap-2">
          <Button size="sm" variant={activeTab === "all" ? "default" : "outline"} onClick={() => setActiveTab("all")} className={activeTab === "all" ? "bg-green-700" : "border-green-200"}>All</Button>
          <Button size="sm" variant={activeTab === "my" ? "default" : "outline"} onClick={() => setActiveTab("my")} className={activeTab === "my" ? "bg-green-700" : "border-green-200"}>My Shifts</Button>
          <Button size="sm" variant={activeTab === "suggested" ? "default" : "outline"} onClick={() => setActiveTab("suggested")} className={activeTab === "suggested" ? "bg-green-700" : "border-green-200"}>Suggested</Button>
        </div>
      )}

      {isFacility && (
        <div className="space-y-2">
          <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)} className="border-green-200">
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          {showFilters && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="pt-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
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
                    <Select value={filterFacility} onValueChange={(v) => setFilterFacility(v ?? "all")}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Role</Label>
                    <Select value={filterRole} onValueChange={(v) => setFilterRole(v ?? "all")}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Specialty</Label>
                    <Select value={filterSpecialty} onValueChange={(v) => setFilterSpecialty(v ?? "all")}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">From Date</Label>
                    <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">To Date</Label>
                    <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Min Pay ($)</Label>
                    <Input type="number" value={filterMinPay} onChange={(e) => setFilterMinPay(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs">Max Pay ($)</Label>
                    <Input type="number" value={filterMaxPay} onChange={(e) => setFilterMaxPay(e.target.value)} placeholder="∞" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        {filteredShifts.map((shift) => (
          <Card key={shift.id} className="border-green-100 dark:border-green-900 hover:shadow-sm transition-shadow">
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold">
                    {shift.facility?.name} - {shift.date}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {shift.start_time} - {shift.end_time}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {shift.required_role} | {shift.required_specialty}
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(shift.status)}
                  <p className="text-sm font-medium text-green-700 mt-1">${shift.hourly_pay_rate}/hr</p>
                </div>
              </div>
              {shift.assigned_provider && (
                <p className="text-sm mt-2">
                  Assigned: {shift.assigned_provider.first_name} {shift.assigned_provider.last_name}
                </p>
              )}
              {profile?.user_type === "provider" && shift.status === "open" && (
                <Button size="sm" className="mt-3 bg-green-700 hover:bg-green-800" onClick={() => handleShowInterest(shift.id)}>
                  Show Interest
                </Button>
              )}
              {profile?.user_type === "provider" && (shift.status === "assigned" || shift.status === "pending") && (
                <Button size="sm" variant="outline" className="mt-3 border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleCancelShift(shift.id)}>
                  Cancel Shift
                </Button>
              )}
              {isFacility && shiftInterests[shift.id] && shiftInterests[shift.id].length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-100 dark:border-green-900">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Interested Providers:</p>
                  <div className="flex flex-wrap gap-2">
                    {shiftInterests[shift.id].map((interest) => (
                      <Badge key={interest.id} variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {interest.provider?.first_name} {interest.provider?.last_name}
                        {interest.provider?.role && ` (${interest.provider.role})`}
                        {interest.note && `: ${interest.note}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
