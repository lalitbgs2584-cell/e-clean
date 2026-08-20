"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Leaf, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError(authError.message ?? "We could not create this authority account.");
      setLoading(false);
      return;
    }

    if (!data?.token) {
      setError("Sign-up succeeded, but we could not establish a secure authority session.");
      setLoading(false);
      return;
    }

    const provision = await fetch("/api/authority/provision", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.token}`,
      },
    });

    if (!provision.ok) {
      const body = await provision.json().catch(() => null);
      setError(body?.error ?? "We could not provision this authority account.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  }

  return <main className="login-page"><Link className="login-back" href="/login"><ArrowLeft size={16}/> Back to sign in</Link><section className="login-panel"><div className="brand login-brand"><span className="brand-mark"><Leaf size={20}/></span><span>E-CLEAN</span></div><div className="login-heading"><span className="eyebrow">AUTHORITY ONBOARDING</span><h1>Set up your access</h1><p>Create an account for your municipal operations team.</p></div><form onSubmit={submit}><label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Authority staff member"/></label><label>Official email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@municipality.gov"/></label><label>Choose password<input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>{error&&<p className="login-error" role="alert">{error}</p>}<button className="button primary login-submit" disabled={loading}>{loading?"Creating account…":<>Create authority account <ArrowRight size={17}/></>}</button></form><p className="auth-alt">Already have access? <Link href="/login">Sign in</Link></p></section><aside className="login-aside"><div className="login-aside-content"><span className="eyebrow"><i/> RESTRICTED ACCESS</span><h2>Built for accountable municipal operations.</h2><p>Authority accounts provide a shared place to review reports, coordinate teams, and verify outcomes.</p><div className="login-mini-card"><div><span className="mini-icon"><ShieldCheck size={18}/></span><b>Authority-only workspace</b></div><p>Use an approved municipal email address to keep operational records protected.</p></div></div></aside></main>;
}
