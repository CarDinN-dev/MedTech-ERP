"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD, signInDemo } from "@/lib/demo-auth";
import { appendAuditLog } from "@/lib/audit-store";
import { safeLocalPath } from "@/lib/security";

export default function LoginPage() {
  const router = useRouter();
  const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const useDemoCredentials = () => {
    setEmail(DEFAULT_DEMO_EMAIL);
    setPassword(DEFAULT_DEMO_PASSWORD);
    setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (demoMode) {
        const session = signInDemo(email, password);
        appendAuditLog({ action: "LOGIN", module: "Authentication", record: session.email, details: `Successful login as ${session.role}` });
      } else {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(safeLocalPath(next));
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to sign in";
      appendAuditLog({ action: "LOGIN", module: "Authentication", record: email.trim() || "unknown user", details: message, result: "failure", severity: "high", user: email.trim() || "unknown user", role: "Unknown" });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return <main className="grid min-h-screen bg-[#f7f9fd] lg:grid-cols-[1.05fr_.95fr] dark:bg-[#0b1020]">
    <section className="relative hidden overflow-hidden bg-[#101a35] p-12 text-white lg:flex lg:flex-col">
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 12% 22%, #ED1E36 0, transparent 24%), radial-gradient(circle at 82% 78%, #592C5A 0, transparent 28%), linear-gradient(135deg, rgba(255,255,255,.08), transparent 42%)" }} />
      <div className="absolute left-0 top-0 h-full w-1.5 bg-[var(--brand-red)]" />
      <div className="relative flex items-center gap-3">
        <div className="grid h-16 w-16 place-items-center overflow-hidden"><Image src="/brand-mark.svg" alt="MedTech" width={56} height={56} priority className="object-contain" style={{ width: 56, height: 56 }} /></div>
        <div><div className="text-lg font-bold">MedTech <span className="text-red-300">ERP</span></div><div className="text-[10px] tracking-[.18em] text-slate-400">CORPORATION TRADING</div></div>
      </div>
      <div className="relative my-auto max-w-xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-medtech-red/25 bg-white/10 px-3 py-1.5 text-xs text-red-100"><ShieldCheck className="h-4 w-4" /> Secure enterprise workspace</div>
        <h1 className="max-w-lg text-4xl font-bold leading-tight">MedTech operations, controlled from one workspace.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Connect finance, commercial, supply chain, service and people operations across MedTech in one governed ERP demo.</p>
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[["13", "business modules"], ["12", "controlled roles"], ["24/7", "operational view"]].map(item => <div key={item[0]} className="rounded-xl border border-white/10 bg-white/[.055] p-4 shadow-sm"><div className="text-xl font-bold text-red-200">{item[0]}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{item[1]}</div></div>)}
        </div>
      </div>
      <div className="relative text-xs text-slate-500">(c) 2026 MedTech Corporation Trading - Doha, Qatar</div>
    </section>
    <section className="flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-9 lg:hidden"><div className="inline-flex items-center gap-2"><div className="grid h-11 w-11 place-items-center overflow-hidden"><Image src="/brand-mark.svg" alt="MedTech" width={40} height={40} priority className="object-contain" style={{ width: 40, height: 40 }} /></div><b>MedTech ERP</b></div></div>
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-medtech-red/15 bg-[var(--red-tint)] px-2.5 py-1 text-[10px] font-bold text-medtech-red"><KeyRound className="h-3.5 w-3.5" /> {demoMode ? "CLIENT DEMO LOGIN" : "SECURE LOGIN"}</div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Sign in with your MedTech work account.</p>
        </div>
        {demoMode && <button type="button" onClick={useDemoCredentials} className="mb-5 flex w-full items-center gap-3 rounded-xl border border-medtech-navy/20 bg-[var(--panel)] p-3 text-left shadow-sm transition hover:border-medtech-red/70 dark:bg-[var(--elevated)]"><div className="rounded-lg bg-[var(--red-tint)] p-2 text-medtech-red"><KeyRound className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-medtech-navy dark:text-red-100">Use Super Admin demo account</div><div className="mt-0.5 text-[10px] text-medtech-red">{DEFAULT_DEMO_EMAIL} - {DEFAULT_DEMO_PASSWORD}</div></div></button>}
        <form onSubmit={submit} className="space-y-5">
          <label className="block"><span className="mb-2 block text-xs font-semibold">Work email</span><span className="relative block"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="h-11 w-full rounded-xl border bg-[var(--panel)] pl-10 pr-3 outline-none transition focus:border-medtech-red focus:ring-2 focus:ring-[var(--focus-ring)]" placeholder="name@medtech.qa" /></span></label>
          <label className="block"><span className="mb-2 flex text-xs font-semibold"><span>Password</span><button type="button" onClick={() => setError(demoMode ? "Ask the administrator to set a new temporary password from Administration -> Users." : "Contact your system administrator to reset your password.")} className="ml-auto text-medtech-red">Forgot password?</button></span><span className="relative block"><LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><input required type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="h-11 w-full rounded-xl border bg-[var(--panel)] pl-10 pr-11 outline-none transition focus:border-medtech-red focus:ring-2 focus:ring-[var(--focus-ring)]" placeholder="Enter your password" /><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(value => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
          <button disabled={loading} className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--brand-red)] font-semibold text-white shadow-lg shadow-red-950/10 transition hover:bg-[#C9162C] disabled:opacity-60">{loading ? "Signing in..." : "Sign in securely"}</button>
        </form>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck className="h-4 w-4 text-medtech-red" /> Session protected - Role identified - Activity audited</div>
      </div>
    </section>
  </main>;
}

