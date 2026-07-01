"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@findmystaff/ui/components/button";
import { Input } from "@findmystaff/ui/components/input";
import { Label } from "@findmystaff/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@findmystaff/ui/components/select";
import { Badge } from "@findmystaff/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { toast } from "sonner";
import { User, Mail, Phone, Shield } from "lucide-react";

const ROLES = ["CNA", "LPN", "RN", "NP"];
const SPECIALTIES = ["ICU", "Emergency", "Med-Surg", "Telemetry", "Long-Term Care", "Family Medicine"];

export default function ProvidersClient() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProvider, setNewProvider] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "CNA",
    specialty: "ICU",
    phone: "",
  });

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      const { data } = await supabase.from("providers").select("*, provider_credentials(*), provider_settings(*)");
      setProviders(data ?? []);
      setLoading(false);
    };
    fetchProviders();
  }, [supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const providerPayload = { ...newProvider, email: newProvider.email.toLowerCase().trim() };
    const { data, error } = await supabase.from("providers").insert(providerPayload).select().single();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Provider created! They can now sign up with this email.");
      setProviders((prev) => [...prev, data]);
      setShowForm(false);
      setNewProvider({ email: "", first_name: "", last_name: "", role: "CNA", specialty: "ICU", phone: "" });
    }
    setCreating(false);
  };

  if (loading) return (
    <div className="container mx-auto p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">Providers</h1>
          <p className="text-muted-foreground">Manage your provider roster and add new providers.</p>
        </div>
        {profile?.user_type === "facility" && (
          <Button onClick={() => setShowForm(!showForm)} className="bg-green-700 hover:bg-green-800">
            {showForm ? "Cancel" : "Add Provider"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-lg text-green-800 dark:text-green-200">Add New Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={newProvider.email} onChange={(e) => setNewProvider({ ...newProvider, email: e.target.value })} className="border-green-200" />
                </div>
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" required value={newProvider.first_name} onChange={(e) => setNewProvider({ ...newProvider, first_name: e.target.value })} className="border-green-200" />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" required value={newProvider.last_name} onChange={(e) => setNewProvider({ ...newProvider, last_name: e.target.value })} className="border-green-200" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={newProvider.phone} onChange={(e) => setNewProvider({ ...newProvider, phone: e.target.value })} className="border-green-200" />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newProvider.role} onValueChange={(v) => setNewProvider({ ...newProvider, role: v ?? "CNA" })}>
                    <SelectTrigger className="border-green-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select value={newProvider.specialty} onValueChange={(v) => setNewProvider({ ...newProvider, specialty: v ?? "ICU" })}>
                    <SelectTrigger className="border-green-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="bg-green-700 hover:bg-green-800" disabled={creating}>
                {creating ? "Creating..." : "Create Provider"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <Card key={provider.id} className="border-green-100 dark:border-green-900 hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <User className="h-4 w-4 text-green-700" />
                    {provider.first_name} {provider.last_name}
                  </h2>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Mail className="h-3 w-3" />
                    {provider.email}
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <Shield className="h-3 w-3 mr-1" />
                  {provider.role}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                {provider.phone && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {provider.phone}
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {provider.onboarding_status || "invited"}
                </Badge>
                {provider.provider_credentials && provider.provider_credentials.length > 0 && (
                  <Badge variant="outline" className="text-xs text-blue-600">
                    {provider.provider_credentials.length} credential{provider.provider_credentials.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              {provider.auth_user_id ? (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950 rounded px-2 py-1 w-fit">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Account active
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 rounded px-2 py-1 w-fit">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  Awaiting signup
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {providers.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No providers found. Add a provider to get started.
          </div>
        )}
      </div>
    </div>
  );
}
