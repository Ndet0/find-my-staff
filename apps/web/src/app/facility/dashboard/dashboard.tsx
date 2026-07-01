"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@findmystaff/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@findmystaff/ui/components/select";
import { Input } from "@findmystaff/ui/components/input";
import { Label } from "@findmystaff/ui/components/label";
import { toast } from "sonner";
import { Badge } from "@findmystaff/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { Link as LinkIcon, UserPlus, Users, Calendar, Clock, DollarSign, ChevronRight, Bell, Building2 } from "lucide-react";
import Link from "next/link";

const ROLES = ["CNA", "LPN", "RN", "NP"];
const SPECIALTIES = ["ICU", "Emergency", "Med-Surg", "Telemetry", "Long-Term Care", "Family Medicine"];

export default function FacilityDashboard() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  
  const [facilities, setFacilities] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    totalShifts: 0, 
    openShifts: 0, 
    pendingShifts: 0, 
    assignedShifts: 0, 
    totalProviders: 0 
  });
  
  // Quick assign state
  const [assignShiftId, setAssignShiftId] = useState<string>("");
  const [assignProviderId, setAssignProviderId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  
  // Create shift state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newShift, setNewShift] = useState({
    facility_id: "",
    date: "",
    start_time: "",
    end_time: "",
    required_role: "CNA",
    required_specialty: "ICU",
    hourly_pay_rate: "",
  });
  
  // Add provider mini-form state
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [addingProvider, setAddingProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "CNA",
    specialty: "ICU",
    phone: "",
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: fData } = await supabase.from("facilities").select("*");
        const { data: pData } = await supabase.from("providers").select("*");
        const { data: sData } = await supabase.from("shifts").select("*, facility:facilities(name), assigned_provider:providers(first_name, last_name)");
        const { data: rData } = await supabase.from("provider_facility_relationships").select("*, provider:providers(*), facility:facilities(*)");
        const { data: nData } = await supabase.from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(5);
        
        setFacilities(fData ?? []);
        setProviders(pData ?? []);
        setShifts(sData ?? []);
        setRelationships(rData ?? []);
        setNotifications(nData ?? []);
        
        setStats({
          totalShifts: sData?.length ?? 0,
          openShifts: sData?.filter((s: any) => s.status === "open").length ?? 0,
          pendingShifts: sData?.filter((s: any) => s.status === "pending").length ?? 0,
          assignedShifts: sData?.filter((s: any) => s.status === "assigned").length ?? 0,
          totalProviders: pData?.length ?? 0,
        });
      } catch (err: any) {
        toast.error("Failed to load dashboard: " + err.message);
      }
    };

    fetchData();

    const shiftsChannel = supabase
      .channel("facility-shifts")
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => {
        fetchData();
        toast.info("Shifts updated");
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel("facility-notifications")
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

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.facility_id || !newShift.date || !newShift.start_time || !newShift.end_time || !newShift.hourly_pay_rate) {
      toast.error("Please fill in all fields");
      return;
    }

    setCreating(true);
    const { data, error } = await supabase.from("shifts").insert({
      facility_id: newShift.facility_id,
      date: newShift.date,
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      required_role: newShift.required_role,
      required_specialty: newShift.required_specialty,
      hourly_pay_rate: parseFloat(newShift.hourly_pay_rate),
    }).select().single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Shift created successfully!");
      setShifts((prev) => [...prev, data]);
      setNewShift({
        facility_id: "",
        date: "",
        start_time: "",
        end_time: "",
        required_role: "CNA",
        required_specialty: "ICU",
        hourly_pay_rate: "",
      });
      setShowCreateForm(false);
    }
    setCreating(false);
  };

  const handleAssign = async (shiftId: string, providerId: string) => {
    if (!shiftId || !providerId) {
      toast.error("Please select a shift and provider");
      return;
    }
    setAssigning(true);
    const { data, error } = await supabase.rpc("assign_shift", {
      shift_id: shiftId,
      provider_id: providerId,
    });
    if (error) {
      toast.error(error.message);
    } else if (data?.success) {
      toast.success("Shift assigned! Provider will be notified to accept.");
      setAssignShiftId("");
      setAssignProviderId("");
    } else {
      toast.error(data?.error || "Failed to assign shift");
    }
    setAssigning(false);
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingProvider(true);
    const providerPayload = { ...newProvider, email: newProvider.email.toLowerCase().trim() };
    const { data, error } = await supabase.from("providers").insert(providerPayload).select().single();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Provider added! They can now sign up with their email.");
      setProviders((prev) => [...prev, data]);
      setNewProvider({ email: "", first_name: "", last_name: "", role: "CNA", specialty: "ICU", phone: "" });
      setShowAddProvider(false);
    }
    setAddingProvider(false);
  };

  const getMatchingProviders = (shift: any) => {
    if (!shift) return [];
    return relationships
      .filter((r) => r.facility_id === shift.facility_id)
      .filter((r) => r.provider?.role === shift.required_role)
      .map((r) => r.provider);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Open</Badge>;
      case "pending": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pending</Badge>;
      case "assigned": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Assigned</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const openShifts = shifts.filter((s) => s.status === "open");

  // #region agent log
  if (!loading) { fetch('http://127.0.0.1:7669/ingest/bd370256-fc2e-4090-8560-124720a6663e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'95d8d9'},body:JSON.stringify({sessionId:'95d8d9',runId:'post-fix',location:'facility/dashboard/dashboard.tsx:render',message:'Dashboard render state',data:{loading,hasUser:!!user,willCrash:!loading&&!user},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{}); }
  // #endregion

  if (loading || !user) return (
    <div className="container mx-auto p-4 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-5">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">Facility Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome {user?.email}. Manage your facilities, providers, shifts, and assignments.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/facility/calendar">
          <Button size="sm" variant="outline" className="border-green-200">
            <Calendar className="h-4 w-4 mr-1" />
            Calendar
          </Button>
        </Link>
        <Link href="/facility/facilities">
          <Button size="sm" variant="outline" className="border-green-200">
            <Building2 className="h-4 w-4 mr-1" />
            Facilities
          </Button>
        </Link>
        <Link href="/facility/providers">
          <Button size="sm" variant="outline" className="border-green-200">
            <Users className="h-4 w-4 mr-1" />
            Providers
          </Button>
        </Link>
        <Link href="/facility/notifications">
          <Button size="sm" variant="outline" className="border-green-200">
            <Bell className="h-4 w-4 mr-1" />
            Notifications
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-green-100 dark:border-green-900">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Shifts</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{stats.totalShifts}</p>
          </CardContent>
        </Card>
        <Card className="border-green-100 dark:border-green-900">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.openShifts}</p>
          </CardContent>
        </Card>
        <Card className="border-green-100 dark:border-green-900">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-blue-700">{stats.pendingShifts}</p>
          </CardContent>
        </Card>
        <Card className="border-green-100 dark:border-green-900">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Assigned</p>
            <p className="text-2xl font-bold text-green-700">{stats.assignedShifts}</p>
          </CardContent>
        </Card>
        <Card className="border-green-100 dark:border-green-900">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Providers</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{stats.totalProviders}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Assign Section */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-green-800 dark:text-green-200">
            <LinkIcon className="h-5 w-5" />
            Quick Assign — Open Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openShifts.length > 0 ? (
            <div className="space-y-3">
              {openShifts.map((shift) => {
                const matching = getMatchingProviders(shift);
                return (
                  <div key={shift.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-green-50/50 dark:bg-green-950/50 rounded-lg border border-green-100 dark:border-green-900">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{shift.facility?.name}</p>
                        {getStatusBadge(shift.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{shift.date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{shift.start_time} - {shift.end_time}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${shift.hourly_pay_rate}/hr</span>
                        <span>{shift.required_role} | {shift.required_specialty}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={assignShiftId === shift.id ? assignProviderId : ""} 
                        onValueChange={(v) => {
                          setAssignShiftId(shift.id);
                          setAssignProviderId(v ?? "");
                        }}
                      >
                        <SelectTrigger className="w-48 border-green-200">
                          <SelectValue placeholder="Select provider..." />
                        </SelectTrigger>
                        <SelectContent>
                          {matching.length > 0 ? (
                            matching.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.first_name} {p.last_name} ({p.role})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>No matching providers</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        className="bg-green-700 hover:bg-green-800 whitespace-nowrap"
                        onClick={() => handleAssign(shift.id, assignProviderId)}
                        disabled={assigning || assignShiftId !== shift.id || !assignProviderId}
                      >
                        {assigning && assignShiftId === shift.id ? "Assigning..." : "Assign Shift"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No open shifts available.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-green-200"
                onClick={() => setShowCreateForm(true)}
              >
                Create a Shift
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Roster Section */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-green-800 dark:text-green-200">
              <Users className="h-5 w-5" />
              Provider Roster
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="border-green-200"
                onClick={() => setShowAddProvider(!showAddProvider)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                {showAddProvider ? "Cancel" : "Add Provider"}
              </Button>
              <Link href="/facility/providers">
                <Button size="sm" variant="outline" className="border-green-200">
                  Manage All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showAddProvider && (
            <form onSubmit={handleAddProvider} className="mb-4 p-4 bg-green-50/50 dark:bg-green-950/50 rounded-lg border border-green-100 dark:border-green-900 space-y-4">
              <p className="font-medium text-sm text-green-800 dark:text-green-200">Add New Provider</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" required value={newProvider.email} onChange={(e) => setNewProvider({ ...newProvider, email: e.target.value })} className="border-green-200" />
                </div>
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input required value={newProvider.first_name} onChange={(e) => setNewProvider({ ...newProvider, first_name: e.target.value })} className="border-green-200" />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input required value={newProvider.last_name} onChange={(e) => setNewProvider({ ...newProvider, last_name: e.target.value })} className="border-green-200" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={newProvider.phone} onChange={(e) => setNewProvider({ ...newProvider, phone: e.target.value })} className="border-green-200" />
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select value={newProvider.role} onValueChange={(v) => setNewProvider({ ...newProvider, role: v ?? "CNA" })}>
                    <SelectTrigger className="border-green-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Specialty</Label>
                  <Select value={newProvider.specialty} onValueChange={(v) => setNewProvider({ ...newProvider, specialty: v ?? "ICU" })}>
                    <SelectTrigger className="border-green-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="bg-green-700 hover:bg-green-800" disabled={addingProvider} size="sm">
                {addingProvider ? "Adding..." : "Add Provider"}
              </Button>
            </form>
          )}

          {providers.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-start gap-3 p-3 bg-green-50/50 dark:bg-green-950/50 rounded-lg border border-green-100 dark:border-green-900">
                  <div className="w-10 h-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-800 dark:text-green-200 font-bold text-sm">
                    {provider.first_name?.[0]}{provider.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{provider.first_name} {provider.last_name}</p>
                    <p className="text-xs text-muted-foreground">{provider.role} | {provider.specialty}</p>
                    <p className="text-xs text-muted-foreground truncate">{provider.email}</p>
                    {provider.auth_user_id ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Awaiting signup
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No providers added yet.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-green-200"
                onClick={() => setShowAddProvider(true)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Your First Provider
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Shift Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-green-900 dark:text-green-100">Create New Shift</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-green-700 hover:bg-green-800" size="sm">
          {showCreateForm ? "Cancel" : "Create Shift"}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <form onSubmit={handleCreateShift} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Facility</Label>
                  <Select value={newShift.facility_id} onValueChange={(v) => setNewShift({ ...newShift, facility_id: v ?? "" })}>
                    <SelectTrigger className="border-green-200">
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={newShift.date} onChange={(e) => setNewShift({ ...newShift, date: e.target.value })} required className="border-green-200" />
                </div>
                <div>
                  <Label>Pay per Hour ($)</Label>
                  <Input type="number" min="0" step="0.01" value={newShift.hourly_pay_rate} onChange={(e) => setNewShift({ ...newShift, hourly_pay_rate: e.target.value })} required className="border-green-200" />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" value={newShift.start_time} onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })} required className="border-green-200" />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" value={newShift.end_time} onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })} required className="border-green-200" />
                </div>
                <div>
                  <Label>Required Role</Label>
                  <Select value={newShift.required_role} onValueChange={(v) => setNewShift({ ...newShift, required_role: v ?? "CNA" })}>
                    <SelectTrigger className="border-green-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Required Specialty</Label>
                  <Select value={newShift.required_specialty} onValueChange={(v) => setNewShift({ ...newShift, required_specialty: v ?? "ICU" })}>
                    <SelectTrigger className="border-green-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="bg-green-700 hover:bg-green-800" disabled={creating}>
                {creating ? "Creating..." : "Create Shift"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      <Card className="border-green-100 dark:border-green-900">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-green-700" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {notifications.map((n) => (
              <p key={n.id} className="text-sm">{n.message}</p>
            ))}
            {notifications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No notifications</p>
            )}
          </div>
          <Link href="/facility/notifications">
            <Button variant="ghost" size="sm" className="mt-2 text-green-700 hover:text-green-800 hover:bg-green-50">
              View All Notifications
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
