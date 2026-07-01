# DevOps Security Hardening

## Secure Local Run

Use local development for demos only:

```bash
npm ci
npm run dev -- -p 3000
```

Keep `.env.production` as a local/demo placeholder unless deploying. Real secrets belong in a secret manager or host-level env file outside source control.

## Secure Docker Run

The app image uses `node:22-alpine`, a multi-stage build, Next standalone output, and a non-root `nextjs` user. The production image copies only `public`, `.next/standalone`, `.next/static`, and `package.json`.

Build and run:

```bash
docker compose build --pull app
docker compose up -d app
docker compose ps
```

The app service uses:

- non-root runtime user from the Dockerfile
- `no-new-privileges`
- all Linux capabilities dropped
- read-only root filesystem
- `/tmp` tmpfs
- process limit
- container healthcheck against `/api/health`

Do not mount the Docker socket into this stack.

## Production Checklist

- Pin `node:22-alpine` and `nginx:1.27-alpine` by digest after scanning the images.
- Build immutable images in CI with `npm ci`.
- Run `npm run security:check` before publishing.
- Use a private registry with image signing where available.
- Keep only ports `80` and `443` public. The demo compose file binds app port `3000` to `127.0.0.1` only; remove that mapping entirely in production if Nginx or a load balancer is the only entrypoint.
- Rotate secrets before go-live and after staff/vendor access changes.
- Keep `.dockerignore` patterns for `.env*`, `.npmrc`, certs, archives, databases, logs, test output, and temp folders.

## Environment Variable Rules

- `NEXT_PUBLIC_*` values are public browser config, not secrets.
- `SUPABASE_SERVICE_ROLE_KEY`, SMTP credentials, encryption keys, TLS private keys, and database URLs are secrets.
- Do not bake secrets into the image. `.dockerignore` excludes `.env*`.
- If production CSP must include a Supabase host, provide `NEXT_PUBLIC_SUPABASE_URL` at build time as public config and keep service-role keys runtime-only.

## TLS Guidance

Use the `production` compose profile with Nginx only after placing certificates at:

```text
deploy/certs/fullchain.pem
deploy/certs/privkey.pem
```

Use TLS 1.2+ and automate renewal on the host. Reload Nginx after renewal. HSTS is enabled only on the HTTPS Nginx profile and production Next responses.

## Reverse Proxy Guidance

The Nginx config:

- disables `server_tokens`
- redirects HTTP to HTTPS
- sets browser hardening headers
- limits request body size to 10 MB
- sets request/proxy timeouts
- rate-limits `/api/`
- blocks dotfiles and common project config paths
- hides `X-Powered-By`

Keep `/api/health` reachable for load balancer health checks. Do not expose source files, `.next/server`, cert directories, or internal admin endpoints.

## Backup Guidance

- Database: daily encrypted backup and point-in-time recovery where supported.
- Object storage: nightly incremental backup of private buckets.
- Config/secrets: store encrypted copies in the company secrets manager, not Git.
- Test restores quarterly in an isolated environment.

## Logging Guidance

Write container logs to stdout/stderr and forward host/container logs to the SIEM. Alert on authentication failures, permission changes, blocked imports, repeated 4xx/5xx spikes, unusual exports, and healthcheck failures.

Avoid logging request bodies, service-role keys, SMTP passwords, encryption keys, access tokens, or uploaded file contents.

## Local vs Production Differences

Local/demo mode publishes app port `3000` on localhost only and uses placeholder env values. Production should put Nginx or a managed load balancer in front of the app and keep the app container private on the Docker network.

The checked-in `.env.production` is a demo placeholder. Replace it on deployment hosts with real values from a secure source.
