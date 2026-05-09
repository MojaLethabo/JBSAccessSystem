"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { apiListEvents, apiGetAnalyticsSummary, apiGetEventAnalytics, apiLogout, ApiError, EventRow } from "@/lib/api";
import Header from "@/app/components/Header";

const ORG_TYPES = [
  "Government / Public Sector", "SETA", "University / Higher Education Institution",
  "TVET College", "Private Sector / Industry", "NGO / Non-Profit",
  "Research Institution / Think Tank", "Entrepreneur / Business Owner", "Student", "Other",
];

type OrgBar = { type: string; count: number; checkedIn: number };
type EventAnalytics = {
  totalGuests: number; checkedIn: number;
  byOrgType: OrgBar[];
  registrationsPerDay: { date: string; count: number }[];
};

function Bar({ value, max, green = false }: { value: number; max: number; green?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="bar-track">
      <div className={`bar-fill ${green ? "bar-fill-green" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function InsightsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>(searchParams.get("event") || "");
  const [selectedOrgType, setSelectedOrgType] = useState<string>("");
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [summary, setSummary] = useState<{ eventId: string; eventName: string; totalGuests: number; checkedIn: number; byOrgType: Record<string, number> }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiListEvents();
      setEvents(data.events || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.replace("/login"); return; }
      setError("Could not load events");
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (selectedEvent) {
        const data = await apiGetEventAnalytics(selectedEvent);
        setAnalytics(data.analytics); setSummary(null);
      } else {
        const data = await apiGetAnalyticsSummary(selectedOrgType ? { orgType: selectedOrgType } : undefined);
        setSummary(data.summary); setAnalytics(null);
      }
    } catch { setError("Could not load analytics"); }
    finally { setLoading(false); }
  }, [selectedEvent, selectedOrgType]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  function logout() { apiLogout(); router.replace("/login"); router.refresh(); }

  const filteredOrgTypes = analytics?.byOrgType
    ? (selectedOrgType ? analytics.byOrgType.filter((b) => b.type === selectedOrgType) : analytics.byOrgType)
    : [];
  const maxOrgCount = filteredOrgTypes.reduce((m, b) => Math.max(m, b.count), 0);
  const maxDayCount = analytics?.registrationsPerDay.reduce((m, b) => Math.max(m, b.count), 0) || 0;
  const summaryTotals = summary?.reduce((acc, s) => ({ guests: acc.guests + s.totalGuests, checkedIn: acc.checkedIn + s.checkedIn }), { guests: 0, checkedIn: 0 });
  const summaryOrgMap: Record<string, number> = {};
  summary?.forEach((s) => Object.entries(s.byOrgType).forEach(([t, c]) => { summaryOrgMap[t] = (summaryOrgMap[t] || 0) + c; }));
  const summaryOrgBars = Object.entries(summaryOrgMap).filter(([t]) => !selectedOrgType || t === selectedOrgType).sort(([, a], [, b]) => b - a);
  const maxSummaryOrg = summaryOrgBars.reduce((m, [, c]) => Math.max(m, c), 0);
  const checkinPct = analytics && analytics.totalGuests > 0 ? Math.round((analytics.checkedIn / analytics.totalGuests) * 100) : 0;

  return (
    <div className="app-shell">
      <Header onLogout={logout} />
      <main className="main-content">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1a0a00]">Analytics</h1>
            <p className="text-sm text-[#a05a3a] mt-0.5">Insights across events and attendee types</p>
          </div>
          <Link href="/dashboard" className="text-sm text-[#f26522] font-semibold hover:underline">← Dashboard</Link>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Filter by event</label>
            <select className="input" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
              <option value="">All events</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="label">Filter by organisation type</label>
            <select className="input" value={selectedOrgType} onChange={(e) => setSelectedOrgType(e.target.value)}>
              <option value="">All types</option>
              {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading && <p className="text-sm text-[#a05a3a]">Loading analytics…</p>}

        {/* Single event */}
        {!loading && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="stat-card"><div className="stat-value">{analytics.totalGuests}</div><div className="stat-label">Total registrations</div></div>
              <div className="stat-card"><div className="stat-value">{analytics.checkedIn}</div><div className="stat-label">Checked in</div></div>
              <div className="stat-card"><div className="stat-value">{checkinPct}%</div><div className="stat-label">Check-in rate</div></div>
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-[#f26522] mb-4">By organisation type</h2>
              {filteredOrgTypes.length === 0 ? <p className="text-sm text-[#a05a3a]">No data yet.</p> : (
                <div className="space-y-3">
                  {[...filteredOrgTypes].sort((a, b) => b.count - a.count).map((b) => (
                    <div key={b.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold truncate max-w-[60%]">{b.type}</span>
                        <span className="text-xs text-[#a05a3a] ml-2">{b.count} reg · {b.checkedIn} in</span>
                      </div>
                      <div className="flex items-center gap-2"><Bar value={b.count} max={maxOrgCount} /><span className="text-xs font-bold text-[#f26522] w-8 text-right">{b.count}</span></div>
                      {b.checkedIn > 0 && <div className="flex items-center gap-2 mt-0.5"><Bar value={b.checkedIn} max={maxOrgCount} green /><span className="text-xs font-bold text-green-600 w-8 text-right">{b.checkedIn}</span></div>}
                    </div>
                  ))}
                  <div className="flex gap-4 pt-2 text-xs text-[#a05a3a]">
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded-full bg-[#f26522]"></span> Registered</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded-full bg-green-500"></span> Checked in</span>
                  </div>
                </div>
              )}
            </div>
            {analytics.registrationsPerDay.length > 0 && (
              <div className="card p-5">
                <h2 className="font-bold text-[#f26522] mb-4">Registrations per day</h2>
                <div className="space-y-2">
                  {analytics.registrationsPerDay.map((d) => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs text-[#a05a3a] w-24 shrink-0">{d.date}</span>
                      <Bar value={d.count} max={maxDayCount} />
                      <span className="text-xs font-bold w-6 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {!loading && summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="stat-card"><div className="stat-value">{events.length}</div><div className="stat-label">Total events</div></div>
              <div className="stat-card"><div className="stat-value">{summaryTotals?.guests ?? 0}</div><div className="stat-label">Total registrations</div></div>
              <div className="stat-card"><div className="stat-value">{summaryTotals?.checkedIn ?? 0}</div><div className="stat-label">Total check-ins</div></div>
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-[#f26522] mb-4">All registrations by organisation type</h2>
              {summaryOrgBars.length === 0 ? <p className="text-sm text-[#a05a3a]">No data yet.</p> : (
                <div className="space-y-2">
                  {summaryOrgBars.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-sm truncate w-56 shrink-0">{type}</span>
                      <Bar value={count} max={maxSummaryOrg} />
                      <span className="text-xs font-bold w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-[#f26522] mb-4">Per-event summary</h2>
              {summary.length === 0 ? <p className="text-sm text-[#a05a3a]">No events yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs font-bold uppercase tracking-wide text-[#a05a3a] border-b border-[#ffe0cc]">
                      <tr>
                        <th className="py-2 text-left">Event</th>
                        <th className="py-2 text-right">Registrations</th>
                        <th className="py-2 text-right">Checked in</th>
                        <th className="py-2 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffe8d6]">
                      {summary.map((s) => {
                        const rate = s.totalGuests > 0 ? Math.round((s.checkedIn / s.totalGuests) * 100) : 0;
                        return (
                          <tr key={s.eventId} className="hover:bg-[#fff4ee]">
                            <td className="py-2.5 pr-4"><Link href={`/events/${s.eventId}`} className="text-[#f26522] font-semibold hover:underline">{s.eventName}</Link></td>
                            <td className="py-2.5 text-right">{s.totalGuests}</td>
                            <td className="py-2.5 text-right">{s.checkedIn}</td>
                            <td className="py-2.5 text-right"><span className={`font-bold ${rate >= 75 ? "text-green-600" : rate >= 40 ? "text-amber-600" : "text-[#a05a3a]"}`}>{rate}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function InsightsPage() {
  return <Suspense><InsightsContent /></Suspense>;
}
