import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const name = `medtech-erp-db-test-${Date.now()}`;
const password = "medtech-test";

function docker(args, input, quiet = false) {
  const result = spawnSync("docker", args, { input, encoding: "utf8", stdio: input ? ["pipe", "pipe", "pipe"] : quiet ? "pipe" : "inherit" });
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.stdout || result.error?.message || `docker ${args.join(" ")} failed`);
  if (input && result.stdout) process.stdout.write(result.stdout);
  return result;
}

function psql(sql, label) {
  process.stdout.write(`\n[database] ${label}\n`);
  docker(["exec", "-i", name, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres"], sql);
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  docker(["run", "-d", "--name", name, "-e", `POSTGRES_PASSWORD=${password}`, "postgres:16-alpine"]);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    await delay(1000);
    const result = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], { stdio: "ignore" });
    if (result.status === 0) { ready = true; break; }
  }
  if (!ready) throw new Error("PostgreSQL test container did not become ready");

  psql(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1)-1, 0)] $$;
    grant usage on schema auth, storage to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
  `, "Supabase compatibility schemas");

  const migrations = readdirSync(path.join(root, "supabase", "migrations")).filter(file => file.endsWith(".sql")).sort();
  for (const migration of migrations) psql(readFileSync(path.join(root, "supabase", "migrations", migration), "utf8"), migration);
  psql(readFileSync(path.join(root, "supabase", "seed.sql"), "utf8"), "seed data");
  psql(readFileSync(path.join(root, "tests", "database", "fixtures.sql"), "utf8"), "test identities");
  psql(readFileSync(path.join(root, "tests", "database", "rls.test.sql"), "utf8"), "RBAC and RLS assertions");
  psql(readFileSync(path.join(root, "tests", "database", "warehouse-rls.test.sql"), "utf8"), "warehouse integrity and RLS assertions");
  process.stdout.write("\nDatabase permission and RLS tests passed.\n");
} finally {
  spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
}
