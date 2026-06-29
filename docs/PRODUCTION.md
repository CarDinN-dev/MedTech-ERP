# Production deployment

## 1. Server baseline

Use Ubuntu 24.04 LTS or equivalent with Docker Engine 26+, Docker Compose v2, at least 4 vCPU, 8 GB RAM, encrypted SSD storage, a static IP, firewall rules for 22/80/443, and DNS for `erp.medtech.qa`. Restrict SSH to key-based authentication and the administration network.

## 2. Supabase

Provision a Supabase project in the required region or deploy the official self-hosted Supabase stack on a separate private host. Apply schema changes only through the CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase db seed
```

Create the first account in Auth, then assign `super_admin` in `public.user_roles`. Disable public sign-up, configure company SMTP, set the application URL and redirect URLs, enable leaked-password protection, and enforce TOTP MFA for privileged roles.

## 3. Application environment

Copy `.env.example` to `.env.production`. Generate `APP_ENCRYPTION_KEY` with a cryptographically secure secret manager. The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_`, log it, or bake it into the container image.

## 4. TLS and startup

Place the issued certificate and private key at `deploy/certs/fullchain.pem` and `deploy/certs/privkey.pem`. For automated renewal, use Certbot on the host and reload Nginx after renewal.

```bash
docker compose --profile production build --pull
docker compose --profile production up -d
docker compose ps
curl -fsS https://erp.medtech.qa/api/health
```

Run containers as a dedicated service account. Pin image digests in regulated environments. Forward container logs to the company SIEM and alert on authentication failures, permission changes, RLS errors, repeated upload rejection, and abnormal exports.

## 5. Backups and recovery

- Database: daily encrypted logical backup, continuous point-in-time recovery where supported, 30-day operational retention, 12 monthly archives, and an off-site copy.
- Storage: nightly incremental backup of private buckets with object versions and quarterly archive.
- Secrets/config: encrypted backup in the company secrets manager; never in source control.
- Recovery: quarterly restore drill into an isolated project. Verify row counts, critical document links, role assignments, and audit continuity. Record recovery time and recovery point objectives.

Example database backup:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file="medtech-$(date +%F).dump"
sha256sum medtech-*.dump > checksums.txt
```

## 6. Release procedure

Test migrations on staging using a production-shaped snapshot with sensitive data masked. Take a fresh backup, deploy migrations, deploy the immutable application image, run the health check and smoke tests, then monitor errors and database load. Database migrations must be backward-compatible for rolling deployments; destructive cleanup is a separate later release.
