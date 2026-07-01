# Security Headers

MedTech ERP applies browser hardening headers from `next.config.ts` for the Next.js app. The HTTPS Nginx profile adds transport and proxy-level hardening without overriding the app's dynamic CSP.

## Applied Headers

- `Content-Security-Policy`: same-origin by default, blocks objects and frames, restricts forms/base URI, and uses `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: disables camera, microphone, geolocation, payment, USB, serial, Bluetooth, and motion sensors.
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `X-DNS-Prefetch-Control: off`
- `X-Permitted-Cross-Domain-Policies: none`
- `Strict-Transport-Security`: production only, and also set by the HTTPS Nginx profile.

## CSP Differences

Development keeps `script-src 'unsafe-eval'` and local websocket/http connect sources so Next.js dev tools, HMR, and overlays keep working.

Production removes `unsafe-eval`, adds `upgrade-insecure-requests`, and keeps sources limited to the app origin plus `NEXT_PUBLIC_SUPABASE_URL` when configured.

`unsafe-inline` remains for scripts/styles because the current Next.js runtime and UI patterns rely on inline bootstrap/style behavior. Move to nonce-based CSP before removing it.

## External Content

The app currently has no third-party scripts, remote image allowlist, iframe embeds, or `target="_blank"` links. New external links must include `rel="noopener noreferrer"`.
