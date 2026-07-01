# findmystaff App Specification

## Overview
findmystaff is a miniature healthcare staffing network where facility users can sign up openly, manage facilities/providers/shifts, and assign shifts. Providers created by facilities can OTP-login, see only their own/eligible work and pay, accept/cancel shifts, and receive in-app notifications.

## Technology Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (Auth, Database, Realtime)
- Bun

## Database Schema

### Enums
- `user_type`: `facility`, `provider`
- `provider_role`: `CNA`, `LPN`, `RN`, `NP`
- `specialty`: `ICU`, `Emergency`, `Med-Surg`, `Telemetry`, `Long-Term Care`, `Family Medicine`
- `employment_type`: `1099`, `W2`
- `shift_status`: `open`, `pending`, `assigned`
- `notification_type`: `assigned`, `cancelled`, `accepted`, `interest`, `declined`
- `onboarding_status`: `invited`, `profile_complete`, `credentials_verified`, `active`

### Core Tables
- `profiles`: auth-linked user profile and user type
- `facilities`: CMS-backed facilities
- `providers`: provider roster, email, role, specialty, onboarding status, linked auth user
- `provider_facility_relationships`: provider/facility links with employment type
- `shifts`: facility, role, specialty, start/end, pay, assigned provider, status (`open` -> `pending` on assignment -> `assigned` on provider acceptance)
- `notifications`: recipient, type, shift payload, read status
- `shift_interests`: providers expressing interest in open shifts, with optional note

### Extended Tables (schema in place, limited or no UI yet)
- `facility_users`: facility membership with admin/manager/viewer roles
- `provider_credentials`: licenses, certifications, background checks with expiry
- `provider_availability`: recurring or date-ranged availability windows
- `shift_history`: shift status change audit trail
- `provider_settings`: provider preferences (min pay, commute, notifications)
- `facility_settings`: facility preferences (default pay rate, auto-assign)
- `provider_reviews`: facility ratings of providers per shift
- `timesheets`: clock in/out records per shift with approval status

## RPC Functions
- `check_provider_exists(p_email)`: Pre-login check that an email is rostered (anon-callable)
- `assign_shift(shift_id, provider_id)`: Facility assigns provider; shift becomes `pending`
- `accept_assignment(p_shift_id)`: Provider accepts a pending assignment; shift becomes `assigned`
- `decline_assignment(p_shift_id)`: Provider declines a pending assignment; shift reopens
- `cancel_shift(p_shift_id)`: Provider cancels an assigned shift; shift reopens
- `show_interest(p_shift_id)`: Provider expresses interest in an open shift
- `mark_notification_read(p_notification_id)`: Mark notification as read

All RPCs except `check_provider_exists` require an authenticated user (`anon` EXECUTE is revoked).

## Routes

### Public
- `/` - Home with Facility/Provider entry points
- `/auth` - OTP login with Facility and Provider tabs

### Facility (`/facility/*`)
- `/facility/dashboard` - Facility admin dashboard (stats, quick assign, roster preview)
- `/facility/calendar` - All shifts, pay filters, interests, assign actions
- `/facility/providers` - Provider roster CRUD
- `/facility/facilities` - Facility list
- `/facility/relationships` - Provider-facility relationship graph
- `/facility/notifications` - Cancellations, interests, assign actions

### Provider (`/provider/*`)
- `/provider/dashboard` - Provider dashboard (shifts, suggested work, notifications preview)
- `/provider/profile` - Own provider profile (read-only, no `provider_settings`)
- `/provider/calendar` - Own and eligible open shifts
- `/provider/pay` - Own assigned/pending shift earnings only
- `/provider/notifications` - Assignment accept/decline, shift updates

### Legacy redirects
- `/calendar` → role-appropriate calendar route
- `/notifications` → role-appropriate notifications route
- `/providers`, `/facilities`, `/relationships` → `/facility/*` equivalents

## Required Providers
- `a8@shiftnex.com` (Alice Anderson, RN, ICU)
- `admin@shiftnex.com` (Bob Brown, RN, Emergency)

## Seed Data
- 2 CMS-backed facilities (Mayo Clinic, Methodist Hospital)
- 5 providers with mixed 1099/W2 relationships
- 14 shifts across the current week (dates are relative to when the seed runs), with a mix of `open`, `pending`, and `assigned` statuses
- Sample shift interests and notifications so the realtime inbox is demoable
- Re-running `seed.sql` clears and regenerates shifts, interests, and notifications

## Setup Instructions

1. Set up a Supabase project and run `schema.sql` in the SQL Editor.
2. Run `seed.sql` to populate demo data.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`.
4. Enable Email OTP in Supabase Auth settings.
5. Configure auth redirect URLs for your deployed domain.
6. Enable Realtime for `notifications` and `shifts` tables.
7. Run `bun install` and `bun run dev`.

## Full Database Reset

Run in order in the Supabase SQL Editor:

1. `supabase/teardown.sql` — drops all app tables, functions, enums, and the realtime publication
2. `supabase/schema.sql` — recreates the schema (single source of truth)
3. `supabase/seed.sql` — repopulates demo data

This removes all app data but does not delete `auth.users`. Re-running `seed.sql` alone refreshes shifts, interests, and notifications without touching facilities or providers.

## Final Acceptance Checklist
- [x] Facility open sign-up works for any email.
- [x] Provider OTP works for rostered providers only.
- [x] Required providers `a8@shiftnex.com` and `admin@shiftnex.com` exist and can act as providers.
- [x] Two real CMS facilities are displayed.
- [x] Five providers have roles/specialties and facility relationships.
- [x] Relationship graph shows `1099` vs `W2` links.
- [x] Shift calendar shows next-week shifts, role/specialty, and pay.
- [x] Assignment/cancellation workflows update shifts and create notifications.
- [x] Supabase Realtime updates notifications/calendar without refresh.
- [x] RLS and RPC validation enforce permissions, not just UI hiding.
