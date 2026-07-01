"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@findmystaff/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { Mail, Phone, Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function ProviderProfileClient() {
  const { user } = useAuth();
  const supabase = createClient();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("providers")
          .select(
            "id, email, first_name, last_name, role, specialty, phone, onboarding_status, auth_user_id",
          )
          .eq("auth_user_id", user.id)
          .single();
        if (error) throw error;
        setProvider(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to load profile: " + message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [supabase, user]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">
          My Profile
        </h1>
        <p className="text-muted-foreground">Your provider account details.</p>
      </div>

      <Card className="border-green-100 dark:border-green-900 bg-gradient-to-r from-green-50 to-white dark:from-green-950 dark:to-background max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <User className="h-5 w-5" />
            {provider.first_name} {provider.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">
              <Shield className="h-3 w-3 mr-1" />
              {provider.role}
            </Badge>
            <Badge variant="outline">{provider.specialty}</Badge>
            <Badge variant="outline" className="capitalize">
              {provider.onboarding_status || "invited"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            {provider.email}
          </div>
          {provider.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              {provider.phone}
            </div>
          )}
          {provider.auth_user_id ? (
            <p className="text-sm text-green-600">Account active</p>
          ) : (
            <p className="text-sm text-amber-600">Awaiting account link</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
