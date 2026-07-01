# Supply Chain Security

## Audit Result

`npm audit --json` initially reported 2 vulnerable packages:

- `xlsx@0.18.5`: high severity, direct dependency, prototype pollution and ReDoS advisories, no fixed npm package in the installed line.
- `esbuild@0.27.7`: low severity, transitive through `vite`/`vitest`, fixed by `0.28.1`.

After remediation, `npm audit --audit-level=moderate` reports `found 0 vulnerabilities`.

## Actions Taken

- Removed direct `xlsx` dependency.
- Switched attendance import parsing from `xlsx` to the existing `exceljs` dependency.
- Added an `esbuild` override to resolve the Vite/Vitest transitive dependency to `0.28.1`.
- Added package scripts:
  - `security:audit`: runs `npm audit --audit-level=moderate`.
  - `security:check`: runs audit, typecheck, lint, tests, and build.
  - `security:sbom`: generates a CycloneDX SBOM at `docs/sbom.cdx.json`.
- Fixed one lint error in `tests/unit/expert-layer-coverage.test.ts` caused by assigning a local variable named `module`.

## Remaining Vulnerable Packages

None known from `npm audit`.

## Outdated Packages

`npm outdated` still reports newer non-vulnerable versions for packages such as `@playwright/test`, `@supabase/supabase-js`, `postcss`, `autoprefixer`, and `recharts`, plus major upgrades for Next, ESLint, Tailwind, Vitest, jsdom, zod, and related tooling.

These were not upgraded here because the vulnerability fix did not require broad framework changes. Safe path: take wanted patch/minor updates first, rerun `npm run security:check`, then plan major upgrades separately.

## Install Scripts

Installed packages with lifecycle/native install scripts are limited to common build/runtime packages from the npm registry: `core-js`, `esbuild`, `fsevents`, `sharp`, and `unrs-resolver`.

No package tarballs resolve outside `https://registry.npmjs.org/`.

## Secrets And SBOM

No local secret scanner (`gitleaks`, `trufflehog`, `detect-secrets`, or `semgrep`) was available in this environment, so no `security:secrets` script was added.

Generate an SBOM when needed:

```bash
npm run security:sbom
```

The SBOM output is intentionally generated on demand instead of checked in by default.
