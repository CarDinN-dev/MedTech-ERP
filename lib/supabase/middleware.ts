import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");
  const isPublicApi = path === "/api/health";
  if (!url || !key) {
    const demoSession = request.cookies.get("medtech_demo_session")?.value;
    if (!demoSession && !isAuthRoute && !isPublicApi) { const redirect = request.nextUrl.clone(); redirect.pathname = "/login"; redirect.searchParams.set("next", path); return NextResponse.redirect(redirect); }
    if (demoSession && path === "/login") { const redirect = request.nextUrl.clone(); redirect.pathname = "/"; redirect.search = ""; return NextResponse.redirect(redirect); }
    return NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values: { name: string; value: string; options?: CookieOptions }[]) => { values.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); }
  }});
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isAuthRoute) { const redirect = request.nextUrl.clone(); redirect.pathname = "/login"; redirect.searchParams.set("next", request.nextUrl.pathname); return NextResponse.redirect(redirect); }
  if (user && request.nextUrl.pathname === "/login") { const redirect = request.nextUrl.clone(); redirect.pathname = "/"; redirect.search = ""; return NextResponse.redirect(redirect); }
  return response;
}
