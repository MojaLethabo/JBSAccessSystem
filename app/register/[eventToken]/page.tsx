"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiVerifyRegistrationLink, apiRegisterGuest, ApiError } from "@/lib/api";

type Phase = "loading" | "invalid" | "form" | "submitting" | "success" | "error";

const ORG_TYPES = [
  "Government / Public Sector", "SETA", "University / Higher Education Institution",
  "TVET College", "Private Sector / Industry", "NGO / Non-Profit",
  "Research Institution / Think Tank", "Entrepreneur / Business Owner", "Student", "Other",
];

const FIELD_LABELS: Record<string, string> = {
  mobileNumber: "Mobile number",
  organisation: "Organisation",
  jobTitle: "Job title / Position",
  location: "Location",
  organisationType: "Organisation type",
};

export default function RegisterPage() {
  const { eventToken } = useParams<{ eventToken: string }>();
  const decoded = decodeURIComponent(eventToken);

  const [phase, setPhase] = useState<Phase>("loading");
  const [eventName, setEventName] = useState("");
  const [registrationFields, setRegistrationFields] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [organisationType, setOrganisationType] = useState("");
  const [otherOrgType, setOtherOrgType] = useState("");

  const [errMsg, setErrMsg] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    apiVerifyRegistrationLink(decoded)
      .then((d) => {
        setEventName(d.eventName);
        setRegistrationFields(d.registrationFields || []);
        setPhase("form");
      })
      .catch(() => setPhase("invalid"));
  }, [decoded]);

  const needs = (field: string) => registrationFields.includes(field);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("submitting");
    try {
      const data = await apiRegisterGuest({
        eventToken: decoded, name, surname, email,
        ...(needs("mobileNumber") && mobileNumber ? { mobileNumber } : {}),
        ...(needs("organisation") && organisation ? { organisation } : {}),
        ...(needs("jobTitle") && jobTitle ? { jobTitle } : {}),
        ...(needs("location") && location ? { location } : {}),
        ...(needs("organisationType") && organisationType ? {
          organisationType,
          ...(organisationType === "Other" && otherOrgType ? { otherOrgType } : {}),
        } : {}),
      });
      setQrDataUrl(data.qrDataUrl);
      setPhase("success");
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
      setPhase("error");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-12">
      <Image src="/uj-logo.jpg" alt="UJ Logo" width={200} height={200} className="mb-6 h-auto max-h-20 w-auto object-contain" />

      {phase === "loading" && <p className="text-sm text-stone-500">Verifying registration link…</p>}

      {phase === "invalid" && (
        <div className="card w-full p-6 text-center">
          <p className="text-lg font-semibold text-red-600">Invalid or expired link</p>
          <p className="mt-2 text-sm text-stone-500">This registration link is not recognised. Please contact your event organizer.</p>
        </div>
      )}

      {(phase === "form" || phase === "submitting") && (
        <div className="card w-full p-6">
          <h1 className="text-xl font-semibold">Register for</h1>
          <p className="mt-1 text-[#f26522] font-medium">{eventName}</p>
          <p className="mt-1 text-sm text-stone-500 mb-6">Fill in your details to receive your QR ticket by email.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Always required */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name <span className="text-red-500">*</span></label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" />
              </div>
              <div>
                <label className="label">Surname <span className="text-red-500">*</span></label>
                <input className="input" value={surname} onChange={(e) => setSurname(e.target.value)} required autoComplete="family-name" />
              </div>
            </div>
            <div>
              <label className="label">Email address <span className="text-red-500">*</span></label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <p className="mt-1 text-xs text-stone-500">Your QR ticket will be sent here.</p>
            </div>

            {/* Optional fields from event config */}
            {needs("mobileNumber") && (
              <div>
                <label className="label">{FIELD_LABELS.mobileNumber} <span className="text-red-500">*</span></label>
                <input className="input" type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required autoComplete="tel" placeholder="+27 XX XXX XXXX" />
              </div>
            )}
            {needs("organisation") && (
              <div>
                <label className="label">{FIELD_LABELS.organisation} <span className="text-red-500">*</span></label>
                <input className="input" value={organisation} onChange={(e) => setOrganisation(e.target.value)} required autoComplete="organization" />
              </div>
            )}
            {needs("jobTitle") && (
              <div>
                <label className="label">{FIELD_LABELS.jobTitle} <span className="text-red-500">*</span></label>
                <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required autoComplete="organization-title" />
              </div>
            )}
            {needs("location") && (
              <div>
                <label className="label">{FIELD_LABELS.location} <span className="text-red-500">*</span></label>
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="City, Province" />
              </div>
            )}
            {needs("organisationType") && (
              <div>
                <label className="label">{FIELD_LABELS.organisationType} <span className="text-red-500">*</span></label>
                <select className="input" value={organisationType} onChange={(e) => setOrganisationType(e.target.value)} required>
                  <option value="">Select type…</option>
                  {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {organisationType === "Other" && (
                  <div className="mt-2">
                    <label className="label">Please specify <span className="text-red-500">*</span></label>
                    <input className="input" value={otherOrgType} onChange={(e) => setOtherOrgType(e.target.value)} required placeholder="Describe your organisation type" />
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={phase === "submitting"}>
              {phase === "submitting" ? "Registering…" : "Register & get QR ticket"}
            </button>
          </form>
        </div>
      )}

      {phase === "error" && (
        <div className="card w-full p-6 text-center">
          <p className="font-semibold text-red-600">Registration failed</p>
          <p className="mt-2 text-sm text-stone-500">{errMsg}</p>
          <button className="btn btn-ghost mt-4 text-sm" onClick={() => setPhase("form")}>Try again</button>
        </div>
      )}

      {phase === "success" && (
        <div className="card w-full p-6 text-center">
          <p className="text-2xl font-bold text-green-600">You&apos;re registered! 🎉</p>
          <p className="mt-2 text-sm text-stone-600">
            Welcome, <strong>{name} {surname}</strong>. Check your email for your ticket.
            Your QR code is below — save it or show it at the door.
          </p>
          {qrDataUrl && (
            <div className="mt-6 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Your QR ticket" className="h-56 w-56 rounded-xl border border-stone-200 shadow" />
            </div>
          )}
          <p className="mt-4 text-xs text-stone-400">Present this QR code at the event entrance for check-in.</p>
        </div>
      )}
    </div>
  );
}
