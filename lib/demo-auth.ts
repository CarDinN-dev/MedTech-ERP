"use client";

export const DEMO_SESSION_KEY = "medtech-demo:session";
export const DEMO_USERS_KEY = "medtech-demo:admin:Users:records:v2";
export const DEMO_COOKIE = "medtech_demo_session";
export const DEFAULT_DEMO_EMAIL = "admin@medtech.qa";
export const DEFAULT_DEMO_PASSWORD = "MedTech@2026";
export const PRESENTATION_USER_NAME = "Kashif";

export interface DemoSession { name: string; email: string; role: string; department: string; initials: string; }
interface StoredUser { User?: string; Email?: string; Role?: string; Department?: string; Status?: string; Password?: string; }

const defaultUser: StoredUser = { User: PRESENTATION_USER_NAME, Email: DEFAULT_DEMO_EMAIL, Role: "Super Admin", Department: "Executive", Status: "Active", Password: DEFAULT_DEMO_PASSWORD };

export function signInDemo(email: string, password: string): DemoSession {
  const users = getStoredUsers();
  const user = users.find(item => item.Email?.toLowerCase() === email.trim().toLowerCase());
  if (!user || (user.Password || DEFAULT_DEMO_PASSWORD) !== password) throw new Error("Incorrect email or password.");
  if ((user.Status || "Active").toLowerCase() !== "active") throw new Error("This account is not active. Contact the administrator.");
  const name = user.User || email.split("@")[0];
  const session: DemoSession = { name, email: user.Email || email, role: user.Role || "Read-only Auditor", department: user.Department || "General", initials: initials(name) };
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  document.cookie = `${DEMO_COOKIE}=active; Path=/; Max-Age=28800; SameSite=Lax`;
  return session;
}

export function getDemoSession(): DemoSession | null {
  try {
    const value = localStorage.getItem(DEMO_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as DemoSession;
    if (session.email.toLowerCase() === DEFAULT_DEMO_EMAIL && session.name !== PRESENTATION_USER_NAME) {
      const migrated = { ...session, name: PRESENTATION_USER_NAME, initials: initials(PRESENTATION_USER_NAME) };
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return session;
  } catch { return null; }
}

export function clearDemoSession() {
  localStorage.removeItem(DEMO_SESSION_KEY);
  document.cookie = `${DEMO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function getStoredUsers(): StoredUser[] {
  try {
    const stored = localStorage.getItem(DEMO_USERS_KEY);
    const users: StoredUser[] = stored ? JSON.parse(stored) : [];
    const migrated = users.map(user => user.Email?.toLowerCase() === DEFAULT_DEMO_EMAIL ? { ...user, User: PRESENTATION_USER_NAME } : user);
    return migrated.some(user => user.Email?.toLowerCase() === DEFAULT_DEMO_EMAIL) ? migrated : [defaultUser, ...migrated];
  } catch { return [defaultUser]; }
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "MT"; }
