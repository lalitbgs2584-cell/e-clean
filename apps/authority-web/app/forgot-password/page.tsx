"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Leaf, Mail, Send } from "lucide-react";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }
  return (
    <main className="login-page">
      <Link className="login-back" href="/login">
        <ArrowLeft size={16} /> Back to sign in
      </Link>
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          <span>E-CLEAN</span>
        </div>
        {sent ? (
          <div className="auth-success">
            <span>
              <CheckCircle2 size={27} />
            </span>
            <h1>Check your email</h1>
            <p>
              If an authority account exists for <b>{email}</b>, we’ve sent a
              secure password-reset link.
            </p>
            <Link className="button primary" href="/login">
              Return to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="login-heading">
              <span className="eyebrow">ACCOUNT RECOVERY</span>
              <h1>Forgot your password?</h1>
              <p>
                Enter your official email address and we’ll send a secure reset
                link.
              </p>
            </div>
            <form onSubmit={submit}>
              <label>
                Email address
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@municipality.gov"
                />
              </label>
              <button className="button primary login-submit">
                <Send size={16} /> Send reset link
              </button>
            </form>
            <div className="login-secure">
              <span>
                <Mail size={17} />
              </span>
              <p>
                <b>Secure recovery</b>For protection, we never reveal whether an
                email is registered.
              </p>
            </div>
          </>
        )}
      </section>
      <aside className="login-aside">
        <div className="login-aside-content">
          <span className="eyebrow">
            <i /> E-CLEAN SECURITY
          </span>
          <h2>Your municipal operations stay protected.</h2>
        </div>
      </aside>
    </main>
  );
}
