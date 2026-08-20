"use client";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending: checkingSession } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [router, session]);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
      rememberMe: remember,
    });
    if (authError) {
      setError(
        authError.message ??
          "We couldn't sign you in. Check your credentials and try again.",
      );
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
  }
  return (
    <main className="login-page">
      <Link className="login-back" href="/">
        <ArrowLeft size={16} /> Back to E-CLEAN
      </Link>
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          <span>E-CLEAN</span>
        </div>
        <div className="login-heading">
          <span className="eyebrow">AUTHORITY PORTAL</span>
          <h1>Welcome back</h1>
          <p>Sign in to your authority dashboard.</p>
        </div>
        <form onSubmit={signIn}>
          <label>
            Email address
            <input
              required
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@municipality.gov"
            />
          </label>
          <label>
            Password
            <div className="password-input">
              <input
                required
                autoComplete="current-password"
                type={visible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <div className="login-options">
            <label className="check-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />{" "}
              Remember me
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button primary login-submit"
            disabled={loading || checkingSession}
          >
            {loading ? (
              "Signing in…"
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        <p className="auth-alt">
          New authority team member?{" "}
          <Link href="/register">Create an authority account</Link>
        </p>
        <div className="login-secure">
          <span>
            <LockKeyhole size={17} />
          </span>
          <p>
            <b>Secure authority access</b>Authorized municipal staff only. Your
            session is encrypted and monitored.
          </p>
        </div>
      </section>
      <aside className="login-aside">
        <div className="login-aside-content">
          <span className="eyebrow">
            <i /> CITY OPERATIONS, CONNECTED
          </span>
          <h2>Every cleaner street starts with a coordinated response.</h2>
          <p>
            Bring reports, teams, evidence, and resident verification into one
            secure operational view.
          </p>
          <div className="login-mini-card">
            <div>
              <span className="mini-icon">
                <ShieldCheck size={18} />
              </span>
              <b>Authority control center</b>
            </div>
            <p>
              Review urgent reports and coordinate field teams in real time.
            </p>
            <div className="mini-pulse">
              <i /> 64 teams currently active
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
