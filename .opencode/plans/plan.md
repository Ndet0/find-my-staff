# Plan — Fix findmystaff for ShiftNex Hackathon Compliance

## Overview
This plan fixes critical gaps between the current codebase and the hackathon brief. All changes are minimal, safe, and ordered to avoid dependency issues.

## Fixes

### Fix 1: Correct Required Provider Emails
- **File:** `supabase/seed.sql`
- **Change:** `a8@findmystaff.com` → `a8@shiftnex.com`, `admin@findmystaff.com` → `admin@shiftnex.com`
- **Rationale:** The brief requires exact emails for reviewer OTP login.

### Fix 2: Link `auth_user_id` When Provider Logs In
- **File:** `apps/web/src/app/auth/page.tsx`
- **Change:** In `handleVerifyOtp`, after user confirmation, update `providers.auth_user_id` to `user.id` if the email matches a provider record.
- **Rationale:** Without this, provider-specific RLS and RPC functions fail because `auth_user_id` remains `NULL`.

### Fix 3: Fix Provider RLS Policy Leak
- **File:** `supabase/schema.sql`
- **Change:** `providers_provider_own` policy condition from `auth.uid() IN (SELECT auth_user_id FROM providers WHERE auth_user_id IS NOT NULL)` → `auth.uid() = auth_user_id`
- **Rationale:** Current policy lets any provider read all provider rows.

### Fix 4: Replace Seed Shifts with Exact Example Data
- **File:** `supabase/seed.sql`
- **Change:** Replace 14 ad-hoc shifts with the 6 exact example shifts from the brief (Mon Jun 8 – Sat Jun 13), including pay differentials. Keep a few extra open shifts for Sun Jun 14 coverage.
- **Rationale:** Demo must match the brief’s expected shift data.

### Fix 5: Scope Notifications to the Owning Facility
- **File:** `supabase/schema.sql`
- **Change:** In `accept_shift` and `cancel_shift`, notify only facility users who have a profile (all facility users currently share the same pool, but we at least add a facility_id filter via a join to shifts to only target users who created the shift, or all facility users if no per-facility mapping exists). Actually, since the schema does not have a `facility_users` table, we will add a `facility_id` filter using the shift's facility_id to query only facility users that are relevant. For now, we'll add a comment and update the notification logic to be as targeted as possible.
- **Rationale:** Prevents cross-facility notification spam.

### Fix 6: Add a CMS Scraper Script
- **File:** `scripts/scrape-cms.ts`
- **Change:** Create a runnable TypeScript/Bun script that fetches CMS Care Compare data and upserts into `facilities`.
- **Rationale:** The brief requires a re-runnable scraper for real CMS data.

### Fix 7: Add MCP Server Configuration
- **File:** `.opencode/mcp.json`
- **Change:** Add Supabase MCP server config so Claude/Lovable can read/write the database.
- **Rationale:** Step 2 of the brief explicitly requires the MCP connection.

### Fix 8: Update Documentation
- **File:** `README.md`, `app.md`
- **Change:** Update provider emails, check off acceptance items, add role capability notes.
- **Rationale:** Reviewers need up-to-date docs and a clear role summary.

## Execution Order
1. Schema fixes (`supabase/schema.sql`) — Fix 3, Fix 5
2. Seed data fixes (`supabase/seed.sql`) — Fix 1, Fix 4
3. Auth flow fix (`apps/web/src/app/auth/page.tsx`) — Fix 2
4. Scraper script (`scripts/scrape-cms.ts`) — Fix 6
5. MCP config (`.opencode/mcp.json`) — Fix 7
6. Documentation (`README.md`, `app.md`) — Fix 8

## Testing Checklist
- [ ] `a8@shiftnex.com` and `admin@shiftnex.com` exist in `providers`.
- [ ] Provider OTP login sets `auth_user_id` correctly.
- [ ] Provider dashboard shows profile, shifts, and eligible shifts.
- [ ] `accept_shift` and `cancel_shift` RPCs work end-to-end.
- [ ] Facility assignment notifies the correct provider.
- [ ] Provider cancellation notifies the correct facility.
- [ ] Real-time subscriptions fire without refresh.
- [ ] CMS scraper runs and populates/upserts facilities.
