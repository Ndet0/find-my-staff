#!/usr/bin/env bun
/**
 * CMS Facility Scraper
 * Fetches real US hospital data from the CMS Provider Data Catalog (data.cms.gov)
 * and upserts it into the Supabase facilities table.
 *
 * Usage:
 *   bun run scripts/scrape-cms.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for bypassing RLS)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CMS Hospital General Information dataset (Socrata API)
const CMS_API_URL =
  "https://data.cms.gov/resource/77hc-ibv8.json?$limit=50&$where=facility_type='Short Term Acute Care Hospital'";

interface CMSHospital {
  provider_id?: string;
  facility_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  facility_type?: string;
  hospital_overall_rating?: string;
  phone_number?: string;
}

async function fetchCMSFacilities(): Promise<CMSHospital[]> {
  const res = await fetch(CMS_API_URL);
  if (!res.ok) {
    throw new Error(`CMS API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as CMSHospital[];
}

async function upsertFacilities(hospitals: CMSHospital[]) {
  for (const h of hospitals) {
    const cmsId = h.provider_id?.trim();
    if (!cmsId) continue;

    const name = h.facility_name?.trim() || "Unknown Hospital";
    const address = h.address?.trim() || "";
    const city = h.city?.trim() || "";
    const state = h.state?.trim() || "";
    const zip = h.zip_code?.trim() || "";
    const facilityType = h.facility_type?.trim() || "Hospital";
    const rating = parseFloat(h.hospital_overall_rating || "0") || null;
    const phone = h.phone_number?.trim() || "";

    const { error } = await supabase.from("facilities").upsert(
      {
        cms_id: cmsId,
        name,
        address,
        city,
        state,
        zip,
        facility_type: facilityType,
        rating,
        contact_phone: phone,
        source_metadata: {
          source: "CMS Provider Data Catalog",
          dataset: "77hc-ibv8",
          provider_id: cmsId,
          date_imported: new Date().toISOString(),
        },
      },
      { onConflict: "cms_id" }
    );

    if (error) {
      console.error(`Failed to upsert ${name}:`, error.message);
    } else {
      console.log(`Upserted: ${name} (${cmsId})`);
    }
  }
}

async function main() {
  console.log("Fetching CMS facilities...");
  const hospitals = await fetchCMSFacilities();
  console.log(`Fetched ${hospitals.length} facilities`);

  if (hospitals.length === 0) {
    console.log("No facilities returned. API may be unavailable or rate-limited.");
    return;
  }

  console.log("Upserting into Supabase...");
  await upsertFacilities(hospitals);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
