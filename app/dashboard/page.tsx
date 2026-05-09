"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiListEvents, apiCreateEvent, apiLogout, ApiError, EventRow } from "@/lib/api";
import { eventEndDate } from "@/lib/eventWindow";
import Header from "@/app/components/Header";

const ALL_FIELDS = [
  { key: "mobileNumber", label: "Mobile number" },
  { key: "organisation", label: "Organisation" },
  { key: "jobTitle", label: "Job title / Position" },
  { key: "location", label: "Location" },
  { key: "organisationType", label: "Organisation type" },
];

function splitEventsByWindow(events: EventRow[]) {
  const now = new Date();
  const upcoming: EventRow[] = [], past: EventRow[] = [];
  for (const ev of events) {
    const end = eventEndDate(new Date(ev.startDate), ev.durationDays);
    if (now.getTime() > end.getTime()) past.push(ev); else upcoming.push(ev);
  }
  upcoming.sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
  past.sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate));
  return { upcoming, past };
}

function EventListItem({ ev }: { ev: EventRow }) {
  return (
    <li className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link href={`/events/${ev.id}`} className="font-semibold text-[#f26522] hover:underline">{ev.name}</Link>
        <p className="text-xs text-[#a05a3a] mt-0.5">
          {new Date(ev.startDate).toLocaleString()} · {ev.durationDays} day(s) · {ev.guestCount} guest(s)
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/events/${ev.id}`} className="btn btn-ghost text-sm">Details</Link>
        <Link href={`/checkin/${ev.id}`} className="btn btn-primary text-sm">Check-in</Link>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [durationDays, setDurationDays] = useState("1");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [pendingEventData, setPendingEventData] = useState<{ name: string; startDate: string; durationDays: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiListEvents();
      setEvents(data.events || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.replace("/login"); return; }
      setLoadError("Could not load events");
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);
  const { upcoming, past } = useMemo(() => splitEventsByWindow(events), [events]);
  function logout() { apiLogout(); router.replace("/login"); router.refresh(); }

  function onCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPendingEventData({ name, startDate, durationDays });
    setShowFieldModal(true);
  }

  async function finalizeCreate() {
    if (!pendingEventData) return;
    setCreateError(null);
    setCreating(true);
    try {
      const registrationFields = ["name", "surname", "email", ...selectedFields];
      const data = await apiCreateEvent({
        name: pendingEventData.name,
        startDate: new Date(pendingEventData.startDate).toISOString(),
        durationDays: Number(pendingEventData.durationDays),
        registrationFields,
      });
      setName(""); setStartDate(""); setDurationDays("1"); setSelectedFields([]);
      setShowFieldModal(false);
      await load();
      if (data.event?.id) router.push(`/events/${data.event.id}`);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Could not create event");
    } finally { setCreating(false); }
  }

  function toggleField(key: string) {
    setSelectedFields((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  return (
    <div className="app-shell">
      <Header onLogout={logout} />
      <main className="main-content">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1a0a00]">Events</h1>
          <p className="text-sm text-[#a05a3a] mt-1">Create events, share registration links, and manage check-ins.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create event */}
          <form onSubmit={onCreateSubmit} className="card h-fit space-y-4 p-5">
            <h2 className="text-lg font-bold text-[#f26522]">New event</h2>
            <div>
              <label className="label">Event name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Start date &amp; time</label>
              <input className="input" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Duration (days)</label>
              <input className="input" type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} required />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button type="submit" className="btn btn-primary w-full">Create event →</button>
          </form>

          {/* Event list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-[#1a0a00]">Your events</h2>
              <Link href="/insights" className="text-xs text-[#f26522] font-semibold hover:underline">View analytics →</Link>
            </div>
            {loadError && <p className="text-sm text-red-600">{loadError}</p>}
            {!loadError && events.length === 0 && <p className="text-sm text-[#a05a3a]">No events yet. Create your first one!</p>}
            {!loadError && events.length > 0 && (
              <div className="space-y-8">
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#a05a3a]">Upcoming</h3>
                  {upcoming.length === 0 ? <p className="text-sm text-[#a05a3a]">None scheduled.</p> : (
                    <ul className="space-y-3">{upcoming.map((ev) => <EventListItem key={ev.id} ev={ev} />)}</ul>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#a05a3a]">Past</h3>
                  {past.length === 0 ? <p className="text-sm text-[#a05a3a]">No past events yet.</p> : (
                    <ul className="space-y-3">{past.map((ev) => <EventListItem key={ev.id} ev={ev} />)}</ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Field selection modal */}
        {showFieldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="card w-full max-w-md p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[#f26522]">Guest registration fields</h2>
                <p className="text-sm text-[#a05a3a] mt-1">
                  Choose which details to collect for <strong className="text-[#1a0a00]">{pendingEventData?.name}</strong>.
                  Name, surname and email are always required.
                </p>
              </div>
              <div className="checkbox-group">
                {ALL_FIELDS.map((f) => (
                  <label key={f.key} className="checkbox-item">
                    <input type="checkbox" checked={selectedFields.includes(f.key)} onChange={() => toggleField(f.key)} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <button className="btn btn-ghost flex-1" onClick={() => setShowFieldModal(false)} disabled={creating}>Cancel</button>
                <button className="btn btn-primary flex-1" onClick={finalizeCreate} disabled={creating}>
                  {creating ? "Creating…" : "Create event"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
