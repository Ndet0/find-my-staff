"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@findmystaff/ui/components/card";
import { Skeleton } from "@findmystaff/ui/components/skeleton";
import { Badge } from "@findmystaff/ui/components/badge";
import { Building2, Star, MapPin, Phone, Mail } from "lucide-react";

export default function FacilitiesClient() {
  const { user } = useAuth();
  const supabase = createClient();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      setLoading(true);
      const { data } = await supabase.from("facilities").select("*");
      setFacilities(data ?? []);
      setLoading(false);
    };
    fetchFacilities();
  }, [supabase]);

  if (loading) return (
    <div className="container mx-auto p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-green-900 dark:text-green-100">Facilities</h1>
        <p className="text-muted-foreground">Real CMS Care Compare data</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {facilities.map((facility) => (
          <Card key={facility.id} className="border-green-100 dark:border-green-900 hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-700" />
                  <h2 className="font-semibold text-lg">{facility.name}</h2>
                </div>
                {facility.rating && (
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                    <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                    {facility.rating}/5
                  </Badge>
                )}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {facility.address}
                </div>
                <p>{facility.city}, {facility.state} {facility.zip}</p>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm text-muted-foreground">Type: {facility.facility_type}</p>
                {facility.quality_score && (
                  <p className="text-sm text-muted-foreground">Quality Score: {facility.quality_score}</p>
                )}
              </div>
              {(facility.contact_phone || facility.contact_email) && (
                <div className="mt-3 pt-3 border-t border-green-100 dark:border-green-900 text-sm text-muted-foreground space-y-1">
                  {facility.contact_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {facility.contact_phone}
                    </div>
                  )}
                  {facility.contact_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {facility.contact_email}
                    </div>
                  )}
                </div>
              )}
              {facility.cms_id && (
                <p className="text-xs text-muted-foreground mt-2">CMS ID: {facility.cms_id}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {facilities.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No facilities found.
          </div>
        )}
      </div>
    </div>
  );
}
