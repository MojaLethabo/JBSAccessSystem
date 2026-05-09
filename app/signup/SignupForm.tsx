"use client";

import Link from "next/link";
import { useState } from "react";
import { apiRegisterOrganizer, ApiError } from "@/lib/api";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await apiRegisterOrganizer(email, password, name || undefined);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) return (
    <div className="card p-8 text-center">
      <p className="text-5xl">📬</p>
      <h1 className="mt-4 text-xl font-semibold">Check your inbox</h1>
      <p className="mt-2 text-sm text-stone-500">
        We sent a verification link to <strong>{email}</strong>.
        Click it to activate your account — it expires in 24 hours.
      </p>
      <p className="mt-4 text-xs text-stone-400">Don&apos;t see it? Check your spam folder.</p>
      <Link href="/login" className="mt-6 inline-block text-sm text-[#f26522] hover:underline">
        Back to login
      </Link>
    </div>
  );

  return (
    <>
      <Link href="/" className="mb-8 inline-block text-sm text-[#f26522] hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold">Create organizer account</h1>
      <p className="mt-2 text-sm text-stone-500">Register to create events and run check-in.</p>

      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label">Name (optional)</label>
          <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name or organization" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <p className="mt-1 text-xs text-stone-500">At least 8 characters</p>
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Creating account…" : "Register"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="text-[#f26522] hover:underline">Sign in</Link>
      </p>
    </>
  );
}
