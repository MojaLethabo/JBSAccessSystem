"use client";

import Link from "next/link";
import { useState } from "react";
import { apiForgotPassword, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiForgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err) {
      // Show success anyway — don't leak whether email exists
      if (err instanceof ApiError && err.status >= 500) {
        setError("Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Link href="/login" className="mb-8 inline-block text-sm text-[#f26522] hover:underline">
        ← Back to login
      </Link>

      {!submitted ? (
        <>
          <h1 className="text-2xl font-semibold">Forgot password?</h1>
          <p className="mt-2 text-sm text-stone-500">
            Enter your email and we&apos;ll send you a reset link valid for 1 hour.
          </p>

          <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-5xl">📬</p>
          <h1 className="mt-4 text-xl font-semibold">Check your inbox</h1>
          <p className="mt-2 text-sm text-stone-500">
            If <strong>{email}</strong> is registered, a password reset link is on its way.
            Check your spam folder if you don&apos;t see it.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-[#f26522] hover:underline">
            Back to login
          </Link>
        </div>
      )}
    </div>
  );
}
