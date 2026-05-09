/**
 * Centralised API client.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jbs_token");
}

export function setToken(token: string) { localStorage.setItem("jbs_token", token); }
export function clearToken() { localStorage.removeItem("jbs_token"); }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.replace("/login");
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error || "Request failed", res.status, data);
  return data as T;
}

export class ApiError extends Error {
  status: number; data: unknown;
  constructor(message: string, status: number, data?: unknown) { super(message); this.status = status; this.data = data; }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function apiLogin(email: string, password: string) {
  const data = await request<{ ok: boolean; token: string; organizer: { id: string; email: string; name: string | null } }>(
    "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }
  );
  setToken(data.token); return data;
}
export async function apiRegisterOrganizer(email: string, password: string, name?: string) {
  const data = await request<{ ok: boolean; token: string; organizer: { id: string; email: string; name: string | null } }>(
    "/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }
  );
  setToken(data.token); return data;
}
export function apiLogout() { clearToken(); }
export async function apiMe() {
  return request<{ organizer: { id: string; email: string; name: string | null } }>("/auth/me");
}

// ── Events ────────────────────────────────────────────────────────────────────
export type EventRow = {
  id: string; name: string; eventToken: string;
  startDate: string; durationDays: number; guestCount: number;
  registrationUrl: string; registrationFields: string[];
};

export type GuestDetail = {
  id: string; name: string; surname: string; email: string;
  mobileNumber: string | null; organisation: string | null;
  jobTitle: string | null; location: string | null;
  organisationType: string | null; otherOrgType: string | null;
  checkedInAt: string | null; createdAt: string;
};

export type EventDetail = {
  id: string; name: string; eventToken: string;
  startDate: string; durationDays: number; registrationUrl: string;
  registrationFields: string[];
  stats: { totalGuests: number; checkedIn: number };
  guests: GuestDetail[];
};

export async function apiListEvents() {
  return request<{ events: EventRow[] }>("/events");
}
export async function apiCreateEvent(payload: { name: string; startDate: string; durationDays: number; registrationFields: string[] }) {
  return request<{ event: EventRow }>("/events", { method: "POST", body: JSON.stringify(payload) });
}
export async function apiGetEvent(id: string) {
  return request<{ event: EventDetail }>(`/events/${id}`);
}
export async function apiUpdateEvent(id: string, payload: { name?: string; registrationFields?: string[] }) {
  return request<{ ok: boolean; event: { id: string; name: string; registrationFields: string[] } }>(
    `/events/${id}`, { method: "PATCH", body: JSON.stringify(payload) }
  );
}
export async function apiGetEventAnalytics(id: string) {
  return request<{
    ok: boolean;
    analytics: {
      totalGuests: number; checkedIn: number;
      byOrgType: { type: string; count: number; checkedIn: number }[];
      registrationsPerDay: { date: string; count: number }[];
    };
  }>(`/events/${id}/insights`);
}
export async function apiGetAnalyticsSummary(params?: { eventId?: string; orgType?: string }) {
  const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
  return request<{
    ok: boolean;
    summary: {
      eventId: string; eventName: string; totalGuests: number; checkedIn: number;
      byOrgType: Record<string, number>;
    }[];
  }>(`/events/insights/summary${qs}`);
}

// ── Check-in ──────────────────────────────────────────────────────────────────
export async function apiCheckin(eventId: string, qrToken: string) {
  return request<{
    ok: boolean; code?: string; message?: string;
    guest?: { name: string; surname: string; checkedInAt: string }; checkedInAt?: string;
  }>("/checkin", { method: "POST", body: JSON.stringify({ eventId, qrToken }) });
}

// ── Guest Registration (public) ───────────────────────────────────────────────
export async function apiVerifyRegistrationLink(eventToken: string) {
  return request<{ ok: boolean; eventName: string; registrationFields: string[]; organisationTypes: string[] }>(
    `/register/${encodeURIComponent(eventToken)}`
  );
}
export async function apiRegisterGuest(payload: {
  eventToken: string; name: string; surname: string; email: string;
  mobileNumber?: string; organisation?: string; jobTitle?: string;
  location?: string; organisationType?: string; otherOrgType?: string;
}) {
  return request<{
    ok: boolean;
    guest: { id: string; name: string; surname: string; email: string };
    emailSent: boolean; emailNote?: string; qrDataUrl: string;
  }>("/register", { method: "POST", body: JSON.stringify(payload) });
}

// ── Email verification & password reset ───────────────────────────────────────
export async function apiVerifyEmail(token: string) {
  return request<{ ok: boolean; token: string; organizer: { id: string; email: string; name: string | null } }>(
    "/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }
  );
}
export async function apiResendVerification(email: string) {
  return request<{ ok: boolean; message: string }>(
    "/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }
  );
}
export async function apiForgotPassword(email: string) {
  return request<{ ok: boolean; message: string }>(
    "/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }
  );
}
export async function apiResetPassword(token: string, password: string) {
  return request<{ ok: boolean; message: string }>(
    "/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }
  );
}
