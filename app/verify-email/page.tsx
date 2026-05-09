"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { apiVerifyEmail, apiResendVerification, ApiError, setToken } from "@/lib/api";

type Phase = "verifying" | "success" | "error" | "resent";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [phase, setPhase] = useState<Phase>("verifying");
  const [errMsg, setErrMsg] = useState("");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) { setErrMsg("No verification token found in the link."); setPhase("error"); return; }
    apiVerifyEmail(token)
      .then((data) => {
        setToken(data.token);
        setPhase("success");
        setTimeout(() => router.replace("/dashboard"), 2500);
      })
      .catch((err) => {
        setErrMsg(err instanceof ApiError ? err.message : "Verification failed");
        setPhase("error");
      });
  }, [token, router]);

  async function resend() {
    if (!email.trim()) return;
    setResending(true);
    try {
      await apiResendVerification(email.trim());
      setPhase("resent");
    } catch {
      // still show resent — don't leak existence
      setPhase("resent");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      {phase === "verifying" && (
        <div>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-[#f26522]" />
          <p className="text-stone-500">Verifying your email…</p>
        </div>
      )}

      {phase === "success" && (
        <div className="card p-8">
          <p className="text-5xl">✅</p>
          <h1 className="mt-4 text-xl font-semibold text-stone-900">Email verified!</h1>
          <p className="mt-2 text-sm text-stone-500">Redirecting you to the dashboard…</p>
        </div>
      )}

      {phase === "error" && (
        <div className="card p-8">
          <p className="text-5xl">❌</p>
          <h1 className="mt-4 text-xl font-semibold text-stone-900">Verification failed</h1>
          <p className="mt-2 text-sm text-stone-500">{errMsg}</p>
          <div className="mt-6 border-t border-stone-100 pt-6">
            <p className="mb-3 text-sm text-stone-600">Need a new verification link?</p>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-primary shrink-0 text-sm" onClick={resend} disabled={resending}>
                {resending ? "Sending…" : "Resend"}
              </button>
            </div>
          </div>
          <Link href="/login" className="mt-4 inline-block text-sm text-[#f26522] hover:underline">
            Back to login
          </Link>
        </div>
      )}

      {phase === "resent" && (
        <div className="card p-8">
          <p className="text-5xl">📬</p>
          <h1 className="mt-4 text-xl font-semibold text-stone-900">Check your inbox</h1>
          <p className="mt-2 text-sm text-stone-500">
            If that email is registered and unverified, a new link is on its way.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-[#f26522] hover:underline">
            Back to login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-[#f26522]" />
      </div>
    }>
      <VerifyEmailInner />
    </Suspense>
  );
}
