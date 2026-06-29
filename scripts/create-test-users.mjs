import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (process.env.ALLOW_TEST_USER_SEED !== "true") throw new Error("Set ALLOW_TEST_USER_SEED=true to acknowledge test-user creation");
const isLocal = /localhost|127\.0\.0\.1/.test(url);
if (!isLocal && process.env.ALLOW_REMOTE_TEST_USERS !== "true") throw new Error("Remote test-user creation is blocked. Set ALLOW_REMOTE_TEST_USERS=true only for an isolated staging project");

const users = JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", "test-users.json"), "utf8"));
const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

for (const fixture of users) {
  let user = listed.users.find(candidate => candidate.email?.toLowerCase() === fixture.email.toLowerCase());
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email: fixture.email, password: fixture.password, email_confirm: true, app_metadata: { test_identity: true, role_code: fixture.roleCode }, user_metadata: { full_name: fixture.user } });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, { password: fixture.password, app_metadata: { ...user.app_metadata, test_identity: true, role_code: fixture.roleCode } });
    if (error) throw error;
    user = data.user;
  }

  const { data: department, error: departmentError } = await supabase.from("departments").select("id").eq("name", fixture.department).maybeSingle();
  if (departmentError) throw departmentError;
  const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, full_name: fixture.user, email: fixture.email, department_id: department?.id ?? null, is_active: true });
  if (profileError) throw profileError;
  const { data: role, error: roleError } = await supabase.from("roles").select("id").eq("code", fixture.roleCode).single();
  if (roleError) throw roleError;
  const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", user.id);
  if (deleteError) throw deleteError;
  const { error: assignmentError } = await supabase.from("user_roles").insert({ user_id: user.id, role_id: role.id });
  if (assignmentError) throw assignmentError;
  process.stdout.write(`Created/updated ${fixture.email} as ${fixture.role}\n`);
}

process.stdout.write("Test identities are ready. Never use these credentials in production.\n");
