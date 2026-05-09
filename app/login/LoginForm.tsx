"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiLogin, apiResendVerification, ApiError } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setLoading(true);
    try {
      await apiLogin(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setUnverified(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      await apiResendVerification(email);
      setResent(true);
    } catch {
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <Link href="/" className="mb-8 inline-block text-sm text-[#f26522] hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">Organizer login</h1>
      <p className="mt-2 text-sm text-stone-500">Sign in to create events and open the check-in desk.</p>

      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Password</label>
            <Link href="/forgot-password" className="text-xs text-[#f26522] hover:underline">Forgot password?</Link>
          </div>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {unverified && !resent && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Email not verified</p>
            <p className="mt-1 text-xs">Check your inbox, or{" "}
              <button type="button" className="underline" onClick={resendVerification} disabled={resending}>
                {resending ? "sending…" : "resend the link"}
              </button>.
            </p>
          </div>
        )}

        {resent && (
          <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Verification email sent — check your inbox.
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Need an account?{" "}
        <Link href="/signup" className="text-[#f26522] hover:underline">Register</Link>
      </p>
    </>
  );
}
