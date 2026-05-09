"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { apiResetPassword, ApiError } from "@/lib/api";

type Phase = "form" | "submitting" | "success" | "error";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [phase, setPhase] = useState<Phase>(token ? "form" : "error");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errMsg, setErrMsg] = useState(token ? "" : "No reset token found. Please request a new reset link.");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setErrMsg("Passwords do not match"); return; }
    if (password.length < 8) { setErrMsg("Password must be at least 8 characters"); return; }
    setErrMsg("");
    setPhase("submitting");
    try {
      await apiResetPassword(token, password);
      setPhase("success");
      setTimeout(() => router.replace("/login"), 3000);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "Reset failed. The link may have expired.");
      setPhase("error");
    }
  }

  if (phase === "success") return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="card p-8 text-center">
        <p className="text-5xl">✅</p>
        <h1 className="mt-4 text-xl font-semibold">Password updated!</h1>
        <p className="mt-2 text-sm text-stone-500">Redirecting you to login…</p>
      </div>
    </div>
  );

  if (phase === "error") return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="card p-8 text-center">
        <p className="text-5xl">❌</p>
        <h1 className="mt-4 text-xl font-semibold">Link invalid or expired</h1>
        <p className="mt-2 text-sm text-stone-500">{errMsg}</p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm text-[#f26522] hover:underline">
          Request a new reset link
        </Link>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-semibold">Set new password</h1>
      <p className="mt-2 text-sm text-stone-500">Choose a new password for your account.</p>

      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label">New password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <p className="mt-1 text-xs text-stone-500">At least 8 characters</p>
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {errMsg && <p className="text-sm text-red-500">{errMsg}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={phase === "submitting"}>
          {phase === "submitting" ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-500">
        Remembered it?{" "}
        <Link href="/login" className="text-[#f26522] hover:underline">Back to login</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-[#f26522]" />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
