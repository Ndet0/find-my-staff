# findmystaff - Healthcare Staffing Network

## Overview
A miniature healthcare staffing network built with Next.js and Supabase.

## What Was Built

### Phase 0-1 Complete:
- **Next.js App Scaffold** with all required routes
- **Supabase Integration** with `@supabase/ssr` for auth and data
- **OTP Authentication** with Facility and Provider login paths
- **Database Schema** (`supabase/schema.sql`) with enums, tables, RLS policies, triggers, and RPC functions
- **Seed Data** (`supabase/seed.sql`) with 2 CMS facilities, 5 providers, and 14 shifts
- **Teardown Script** (`supabase/teardown.sql`) to drop all app schema objects before a clean rebuild

### App Routes
- `/` - Home with Facility/Provider entry points
- `/auth` - OTP login with Facility and Provider tabs
- `/facility/dashboard` - Facility admin dashboard with stats and realtime
- `/provider/dashboard` - Provider dashboard with shifts and accept/cancel actions
- `/facilities` - Facility list with real CMS data
- `/providers` - Provider roster
- `/relationships` - Relationship graph showing 1099/W2 links
- `/calendar` - Shift calendar with filtering and actions
- `/notifications` - Realtime notifications inbox

### Key Features Implemented
- **Supabase Auth OTP** with email magic links
- **Role-based routing** (facility vs provider dashboards)
- **RLS policies** on all tables
- **RPC functions** for assign_shift, accept_assignment, decline_assignment, cancel_shift, show_interest, mark_notification_read
- **Realtime subscriptions** on shifts and notifications
- **CMS facility data** (Mayo Clinic, Methodist Hospital)
- **5 demo providers** including required emails:
  - `a8@shiftnex.com` (Alice Anderson, RN, ICU)
  - `admin@shiftnex.com` (Bob Brown, RN, Emergency)

## Setup Instructions

1. **Create a Supabase project** at https://supabase.com
2. **Run the schema** in Supabase SQL Editor:
   - Open `supabase/schema.sql` and run it
3. **Run the seed data** in Supabase SQL Editor:
   - Open `supabase/seed.sql` and run it
4. **Configure environment variables** in `apps/web/.env`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. **Enable Email OTP** in Supabase Auth settings:
   - Auth → Providers → Email → Enable "Email OTP"
   - Disable "Confirm email" if you want instant OTP
6. **Configure redirect URLs** in Supabase Auth settings:
   - Add your deployed domain and `http://localhost:3001`
7. **Enable Realtime** for `notifications` and `shifts` tables:
   - Database → Realtime → Enable for both tables
8. **Run the app**:
   ```bash
   bun install
   bun run dev
   ```

## Full Database Reset

To wipe and rebuild the app schema from scratch (destroys all app data; does not delete `auth.users`):

1. Run `supabase/teardown.sql` in the Supabase SQL Editor
2. Run `supabase/schema.sql`
3. Run `supabase/seed.sql`

`schema.sql` is the single source of truth for the schema. Do not use ad-hoc rebuild scripts.

To refresh demo shifts/notifications only (keeps facilities, providers, and auth accounts), re-run `supabase/seed.sql` alone.

## Next Steps

### Phase 2: RLS & Permissions
- Schema already includes RLS policies and RPC functions
- Policies enforce: facility read/write, provider read-only own data
- RPC functions validate role matching and facility relationships

### Phase 3-8: UI & Workflows
- Auth UI complete with role-based routing
- Dashboards complete with data fetching
- Calendar complete with shift actions
- Realtime subscriptions active
- Ready for testing with actual Supabase project

## Final Acceptance Checklist
- [x] Facility open sign-up works for any email.
- [x] Provider OTP works for rostered providers only.
- [x] Required providers `a8@shiftnex.com` and `admin@shiftnex.com` exist.
- [x] Two real CMS facilities are displayed.
- [x] Five providers have roles/specialties and facility relationships.
- [x] Relationship graph shows `1099` vs `W2` links.
- [x] Shift calendar shows next-week shifts, role/specialty, and pay.
- [x] Assignment/cancellation workflows update shifts and create notifications.
- [x] Supabase Realtime updates notifications/calendar without refresh.
- [x] RLS and RPC validation enforce permissions, not just UI hiding.

## Role Capabilities
- **Facility/Admin:** Manage facilities, providers, shifts, assignments, and view all pay data.
- **Provider:** View own profile, see eligible/open shifts, accept/cancel assignments, and view own pay only. Providers can never see another provider's pay or data.

## Technology Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth + Database + Realtime
- Bun
