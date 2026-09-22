import { createClient } from "@supabase/supabase-js";
import { defaultPermissions, storedPermissions, VALID_ROLES, type AccessProfile } from "./permissions";
import { verifySession } from "./session";
export function accessDatabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function getAccessProfile(token: string | undefined): Promise<AccessProfile | null> {
  const id = verifySession(token);
  if (!id) return null;
  const db = accessDatabase();
  const { data: profile, error } = await db.from("profiles").select("id, role").eq("id", id).maybeSingle();
  if (error) throw new Error("Cannot load account");
  if (!profile || !VALID_ROLES.includes(profile.role)) return null;
  if (profile.role === "ADMIN") return { ...profile, permissions: defaultPermissions("ADMIN") };
  const { data, error: permissionError } = await db.from("user_access_permissions").select("*").eq("user_id", id).maybeSingle();
  if (permissionError && process.env.NODE_ENV === "development" && permissionError.code === "PGRST205") return { ...profile, permissions: defaultPermissions(profile.role) };
  if (permissionError) throw new Error("Cannot load permissions; apply the permissions migration before deployment");
  return { ...profile, permissions: data ? storedPermissions(data.permissions, data.permission_version) : defaultPermissions(profile.role) };
}
