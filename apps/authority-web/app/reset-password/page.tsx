"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Leaf } from "lucide-react";
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const match = password === confirm;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length >= 8 && match) setDone(true);
  }
  const strength =
    password.length > 11
      ? "Strong"
      : password.length >= 8
        ? "Good"
        : "Use 8+ characters";
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          <span>E-CLEAN</span>
        </div>
        {done ? (
          <div className="auth-success">
            <span>
              <CheckCircle2 size={27} />
            </span>
            <h1>Password updated successfully</h1>
            <p>Your authority account is ready to use with the new password.</p>
            <Link className="button primary" href="/dashboard">
              Return to dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="login-heading">
              <span className="eyebrow">ACCOUNT RECOVERY</span>
              <h1>Set a new password</h1>
              <p>Choose a strong password you don’t use elsewhere.</p>
            </div>
            <form onSubmit={submit}>
              <label>
                New password
                <input
                  required
                  minLength={8}
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="password-strength">
                <i
                  style={{
                    width:
                      password.length > 11
                        ? "100%"
                        : password.length >= 8
                          ? "66%"
                          : "33%",
                  }}
                />
                <span>{strength}</span>
              </div>
              <label>
                Confirm password
                <input
                  required
                  autoComplete="new-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
              {confirm && !match && (
                <p className="login-error">Passwords do not match.</p>
              )}
              <button className="button primary login-submit">
                <KeyRound size={16} /> Reset password
              </button>
            </form>
          </>
        )}
      </section>
      <aside className="login-aside">
        <div className="login-aside-content">
          <span className="eyebrow">
            <i /> SECURE RECOVERY
          </span>
          <h2>Restore access safely.</h2>
        </div>
      </aside>
    </main>
  );
}
