"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGetEvent, apiLogout, ApiError, EventDetail } from "@/lib/api";
import Header from "@/app/components/Header";

const POLL_MS = 8000;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [flashNew, setFlashNew] = useState(false);
  const prevCheckedIn = useRef<number>(-1);

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    if (silent) setRefreshing(true);
    try {
      const data = await apiGetEvent(id);
      if (prevCheckedIn.current !== -1 && data.event.stats.checkedIn > prevCheckedIn.current) {
        setFlashNew(true);
        setTimeout(() => setFlashNew(false), 1400);
      }
      prevCheckedIn.current = data.event.stats.checkedIn;
      setEvent(data.event);
      setLastRefreshed(new Date());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.replace("/login"); return; }
      if (!silent) setError(err instanceof ApiError ? err.message : "Could not load event");
    } finally {
      if (silent) setRefreshing(false);
    }
  }, [id, router]);

  // Initial load
  useEffect(() => { void load(false); }, [load]);

  // Silent poll every 8 s
  useEffect(() => {
    const t = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  async function copyLink() {
    if (!event?.registrationUrl) return;
    await navigator.clipboard.writeText(event.registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function logout() { apiLogout(); router.replace("/login"); router.refresh(); }

  if (error) return (
    <div className="app-shell">
      <Header onLogout={logout} />
      <main className="main-content">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-[#f26522] hover:underline">← Back</Link>
      </main>
    </div>
  );

  if (!event) return (
    <div className="app-shell">
      <Header onLogout={logout} />
      <main className="main-content"><p className="text-[#a05a3a] text-sm">Loading…</p></main>
    </div>
  );

  const checkinPct = event.stats.totalGuests > 0
    ? Math.round((event.stats.checkedIn / event.stats.totalGuests) * 100) : 0;

  const extraFields = (event.registrationFields || []).filter(
    (f) => !["name", "surname", "email"].includes(f)
  );

  return (
    <div className="app-shell">
      <Header onLogout={logout} />
      <main className="main-content">
        <div className="mb-2">
          <Link href="/dashboard" className="text-sm text-[#f26522] font-semibold hover:underline">← Dashboard</Link>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1a0a00]">{event.name}</h1>
            <p className="text-sm text-[#a05a3a]">
              {new Date(event.startDate).toLocaleString()} · {event.durationDays} day(s)
            </p>
            {extraFields.length > 0 && (
              <p className="text-xs text-[#a05a3a] mt-1">Collecting: {extraFields.join(", ")}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-xs text-[#a05a3a]">
              <span className={`inline-block w-2 h-2 rounded-full ${refreshing ? "bg-[#f26522] animate-pulse" : "bg-green-500"}`} />
              {refreshing ? "Refreshing…" : lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : ""}
            </div>
            <button onClick={() => void load(true)} className="btn btn-ghost text-xs py-1 px-2" disabled={refreshing}>
              ↻ Refresh
            </button>
            <Link href={`/insights?event=${event.id}`} className="btn btn-ghost text-sm">Analytics</Link>
            <Link href={`/checkin/${event.id}`} className="btn btn-primary">Open check-in</Link>
          </div>
        </div>

        {/* Stats — flash orange border when new check-in detected */}
        <div className={`mt-6 grid grid-cols-3 gap-3 rounded-xl transition-all duration-500 ${flashNew ? "ring-2 ring-[#f26522] ring-offset-2" : ""}`}>
          {[
            { label: "Total guests", value: event.stats.totalGuests },
            { label: "Checked in", value: event.stats.checkedIn, highlight: true },
            { label: "Check-in rate", value: `${checkinPct}%` },
          ].map((s) => (
            <div key={s.label} className={`stat-card text-center transition-colors duration-500 ${flashNew && s.highlight ? "bg-[#fff4ee]" : ""}`}>
              <p className="stat-value">{s.value}</p>
              <p className="stat-label">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Registration link */}
        <div className="card mt-6 p-4">
          <p className="mb-2 text-sm font-bold text-[#f26522]">Registration link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-[#fff4ee] border border-[#ffe0cc] px-3 py-2 text-xs text-[#a05a3a]">
              {event.registrationUrl}
            </code>
            <button onClick={copyLink} className="btn btn-ghost shrink-0 text-sm">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Guest table */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#1a0a00]">Guests ({event.guests.length})</h2>
            <span className="text-xs text-[#a05a3a]">
              {event.guests.filter(g => g.checkedInAt).length} checked in · auto-refreshes every {POLL_MS / 1000}s
            </span>
          </div>
          {event.guests.length === 0 ? (
            <p className="text-sm text-[#a05a3a]">No guests registered yet. Share the registration link above.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#ffe0cc]">
              <table className="w-full text-sm">
                <thead className="bg-[#fff4ee] text-xs font-bold uppercase tracking-wide text-[#a05a3a]">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    {extraFields.includes("mobileNumber") && <th className="px-4 py-3 text-left">Mobile</th>}
                    {extraFields.includes("organisation") && <th className="px-4 py-3 text-left">Organisation</th>}
                    {extraFields.includes("jobTitle") && <th className="px-4 py-3 text-left">Job title</th>}
                    {extraFields.includes("location") && <th className="px-4 py-3 text-left">Location</th>}
                    {extraFields.includes("organisationType") && <th className="px-4 py-3 text-left">Org type</th>}
                    <th className="px-4 py-3 text-left">Registered</th>
                    <th className="px-4 py-3 text-left">Checked in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffe8d6]">
                  {event.guests.map((g) => (
                    <tr key={g.id} className={`transition-colors duration-700 hover:bg-[#fff4ee] ${g.checkedInAt && flashNew ? "bg-green-50" : ""}`}>
                      <td className="px-4 py-3 font-semibold">{g.name} {g.surname}</td>
                      <td className="px-4 py-3 text-[#a05a3a]">{g.email}</td>
                      {extraFields.includes("mobileNumber") && <td className="px-4 py-3 text-[#a05a3a]">{g.mobileNumber ?? "—"}</td>}
                      {extraFields.includes("organisation") && <td className="px-4 py-3 text-[#a05a3a]">{g.organisation ?? "—"}</td>}
                      {extraFields.includes("jobTitle") && <td className="px-4 py-3 text-[#a05a3a]">{g.jobTitle ?? "—"}</td>}
                      {extraFields.includes("location") && <td className="px-4 py-3 text-[#a05a3a]">{g.location ?? "—"}</td>}
                      {extraFields.includes("organisationType") && (
                        <td className="px-4 py-3 text-[#a05a3a]">
                          {g.organisationType === "Other" && g.otherOrgType ? `Other: ${g.otherOrgType}` : (g.organisationType ?? "—")}
                        </td>
                      )}
                      <td className="px-4 py-3 text-[#a05a3a]">{new Date(g.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {g.checkedInAt ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                            ✓ {new Date(g.checkedInAt).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-[#fff4ee] border border-[#ffe0cc] px-2 py-0.5 text-xs text-[#a05a3a]">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
