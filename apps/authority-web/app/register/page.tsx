"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Leaf, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending && !session) router.replace("/login?access=authority");
  }, [isPending, router, session]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const response = await fetch("/api/authority/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "We could not create this authority account.");
      setLoading(false);
      return;
    }
    setSuccess(`${body.data.name} can now sign in to the authority portal.`);
    setName("");
    setEmail("");
    setPassword("");
    setLoading(false);
  }

  if (isPending || !session) return null;

  return (
    <main className="login-page">
      <Link className="login-back" href="/dashboard">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          <span>E-CLEAN</span>
        </div>
        <div className="login-heading">
          <span className="eyebrow">AUTHORITY STAFF ACCESS</span>
          <h1>Add an authority colleague</h1>
          <p>
            New accounts receive secure access to the shared municipal
            operations data.
          </p>
        </div>
        <form onSubmit={submit}>
          <label>
            Full name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Authority staff member"
            />
          </label>
          <label>
            Official email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@municipality.gov"
            />
          </label>
          <label>
            Temporary password
            <input
              required
              minLength={8}
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="login-success" role="status">
              {success}
            </p>
          )}
          <button className="button primary login-submit" disabled={loading}>
            {loading ? (
              "Creating account…"
            ) : (
              <>
                Add authority account <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        <p className="auth-alt">
          Only signed-in authority staff can add colleagues.
        </p>
      </section>
      <aside className="login-aside">
        <div className="login-aside-content">
          <span className="eyebrow">
            <i /> RESTRICTED ACCESS
          </span>
          <h2>Built for accountable municipal operations.</h2>
          <p>
            Authority accounts provide a shared place to review reports,
            coordinate teams, and verify outcomes.
          </p>
          <div className="login-mini-card">
            <div>
              <span className="mini-icon">
                <ShieldCheck size={18} />
              </span>
              <b>Authority-only workspace</b>
            </div>
            <p>
              Use an approved municipal email address to keep operational
              records protected.
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}
