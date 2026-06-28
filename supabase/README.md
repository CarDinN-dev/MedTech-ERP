# Supabase database

Run locally with `supabase start`, then `supabase db reset` to apply migrations and seed data. Production changes must be applied through versioned migrations using `supabase db push`; never edit production tables manually.

The schema uses UUID keys, soft deletion, immutable audit rows, centrally allocated document numbers, private Storage buckets, and permission-driven RLS. Service-role credentials are server-only and must never be exposed through `NEXT_PUBLIC_*` variables.

Before launch, create the first user in Supabase Auth and assign the `super_admin` role using a one-time SQL operation from the Supabase SQL editor. Enable TOTP MFA and configure an SMTP provider in Auth settings.
