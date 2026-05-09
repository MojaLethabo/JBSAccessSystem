"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiCheckin, apiGetEvent, apiLogout, ApiError, EventDetail } from "@/lib/api";

type ScanResult = {
  ok: boolean;
  code?: string;
  message?: string;
  guest?: { name: string; surname: string; checkedInAt: string };
};

type Toast = {
  id: number;
  ok: boolean;
  alreadyUsed?: boolean;
  guestName?: string;
  eventName?: string;
  message?: string;
};

let toastCounter = 0;

/** Safe camera access — works on iOS Safari, Android Chrome, HTTP dev, HTTPS prod */
async function getCameraStream(facingMode: "environment" | "user"): Promise<MediaStream> {
  // 1. Prefer the modern API
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    try {
      return await md.getUserMedia({ video: { facingMode: { exact: facingMode } } });
    } catch {
      // "exact" failed (common on desktop or single-camera phones) — try ideal
      try {
        return await md.getUserMedia({ video: { facingMode } });
      } catch {
        // Last resort — any camera
        return await md.getUserMedia({ video: true });
      }
    }
  }

  // 2. Legacy webkit / older Android fallback
  type LegacyGetUserMedia = (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (err: unknown) => void
  ) => void;
  type LegacyNav = typeof navigator & {
    getUserMedia?: LegacyGetUserMedia;
    webkitGetUserMedia?: LegacyGetUserMedia;
    mozGetUserMedia?: LegacyGetUserMedia;
  };
  const nav = navigator as LegacyNav;
  const legacyFn: LegacyGetUserMedia | undefined =
    nav.getUserMedia?.bind(nav) ||
    nav.webkitGetUserMedia?.bind(nav) ||
    nav.mozGetUserMedia?.bind(nav);

  if (legacyFn) {
    return new Promise<MediaStream>((resolve, reject) => {
      legacyFn({ video: { facingMode } }, resolve, reject);
    });
  }

  throw new Error(
    "Camera not available. Make sure the page is served over HTTPS and you have granted camera permission."
  );
}

export default function CheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const videoRef      = useRef<HTMLVideoElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const readerRef     = useRef<import("@zxing/browser").BrowserQRCodeReader | null>(null);
  const scanningRef   = useRef(false);
  const animFrameRef  = useRef<number | null>(null);
  const processingRef = useRef(false);

  const [event, setEvent]             = useState<EventDetail | null>(null);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [scanning, setScanning]       = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode]   = useState<"environment" | "user">("environment");
  const [toasts, setToasts]           = useState<Toast[]>([]);
  const [manualToken, setManualToken] = useState("");
  const [checkedInCount, setCheckedInCount] = useState(0);

  /* ── Load event ─────────────────────────────────── */
  useEffect(() => {
    apiGetEvent(eventId)
      .then((d) => { setEvent(d.event); setCheckedInCount(d.event.stats.checkedIn); })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) { router.replace("/login"); return; }
        setLoadError(err instanceof ApiError ? err.message : "Could not load event");
      });
  }, [eventId, router]);

  /* ── Toast helpers ──────────────────────────────── */
  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastCounter;
    setToasts((prev) => [{ ...t, id }, ...prev].slice(0, 6));
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, []);

  /* ── Process QR token ───────────────────────────── */
  const processToken = useCallback(async (token: string) => {
    if (!token.trim() || processingRef.current) return;
    processingRef.current = true;
    try {
      const res: ScanResult = await apiCheckin(eventId, token.trim());
      if (res.ok && res.guest) {
        setCheckedInCount((c) => c + 1);
        addToast({
          ok: true,
          guestName: `${res.guest!.name} ${res.guest!.surname}`,
          eventName: event?.name,
        });
      } else {
        addToast({
          ok: false,
          alreadyUsed: res.code === "ALREADY_USED",
          message: res.message || "Check-in failed",
          guestName: res.guest ? `${res.guest.name} ${res.guest.surname}` : undefined,
        });
      }
    } catch {
      addToast({ ok: false, message: "Network error — please try again" });
    } finally {
      setTimeout(() => { processingRef.current = false; }, 1800);
    }
  }, [eventId, event, addToast]);

  /* ── Stop scanner ───────────────────────────────── */
  const stopScanner = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
  }, []);

  /* ── Start scanner ──────────────────────────────── */
  const startScannerWithMode = useCallback(async (mode: "environment" | "user") => {
    setCameraError(null);
    scanningRef.current = true;
    processingRef.current = false;

    try {
      const stream = await getCameraStream(mode);
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach((t) => t.stop()); return; }

      video.srcObject = stream;
      // iOS Safari requires these attributes set in JS too
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Video element error"));
        setTimeout(() => resolve(), 3000); // safety timeout
      });

      await video.play().catch(() => {/* autoplay may be blocked — video still shows */});
      setScanning(true);

      const { BrowserQRCodeReader } = await import("@zxing/browser");
      readerRef.current = new BrowserQRCodeReader();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const tick = async () => {
        if (!scanningRef.current) return;
        if (video.readyState === 4 && readerRef.current && !processingRef.current) {
          const scale = Math.min(1, 900 / Math.max(video.videoWidth, 1));
          canvas.width  = video.videoWidth  * scale;
          canvas.height = video.videoHeight * scale;
          ctx.setTransform(scale, 0, 0, scale, 0, 0);
          ctx.drawImage(video, 0, 0);
          try {
            const decoded = await readerRef.current.decodeFromCanvas(canvas);
            if (decoded?.getText()) await processToken(decoded.getText());
          } catch { /* no QR in frame — normal */ }
        }
        if (scanningRef.current) animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      scanningRef.current = false;
      setScanning(false);
      const msg = err instanceof Error ? err.message : "Camera unavailable";
      // Give a friendlier message for common cases
      if (msg.toLowerCase().includes("https") || msg.toLowerCase().includes("secure")) {
        setCameraError("Camera requires HTTPS. Please open this page via https://…");
      } else if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings and try again.");
      } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("notfound")) {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError(msg);
      }
    }
  }, [processToken]);

  const startScanner = useCallback(() => startScannerWithMode(facingMode), [facingMode, startScannerWithMode]);

  const switchCamera = useCallback(async () => {
    const next: "environment" | "user" = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    stopScanner();
    await new Promise((r) => setTimeout(r, 200));
    await startScannerWithMode(next);
  }, [facingMode, stopScanner, startScannerWithMode]);

  useEffect(() => () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    stopScanner();
  }, [stopScanner]);

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    await processToken(manualToken);
    setManualToken("");
  }

  function logout() { apiLogout(); router.replace("/login"); router.refresh(); }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#f26522] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href={`/events/${eventId}`} className="text-sm font-semibold text-[#f26522] hover:underline shrink-0">← Back</Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#a05a3a]">Check-in</p>
            <p className="font-bold text-[#1a0a00] truncate leading-tight">{event?.name ?? "Loading…"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-black text-[#f26522] leading-none">{checkedInCount}</p>
            <p className="text-xs text-[#a05a3a] font-semibold">/ {event?.stats.totalGuests ?? "—"}</p>
          </div>
          <button onClick={logout} className="shrink-0 text-xs text-[#a05a3a] hover:text-[#f26522] font-semibold ml-1">Log out</button>
        </div>
      </header>

      {loadError && <p className="text-center text-red-600 mt-8 px-4">{loadError}</p>}

      {event && (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-3 py-4 gap-4">

          {/* ── Toast stack ── */}
          <div className="flex flex-col gap-2" aria-live="polite">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`rounded-2xl px-5 py-4 shadow-lg border-2 flex items-start gap-4 animate-slide-in
                  ${t.ok ? "bg-white border-[#f26522]" : t.alreadyUsed ? "bg-amber-50 border-amber-400" : "bg-red-50 border-red-400"}`}
              >
                <span className="text-3xl leading-none shrink-0">{t.ok ? "🎉" : t.alreadyUsed ? "⚠️" : "❌"}</span>
                <div className="flex-1 min-w-0">
                  {t.ok ? (
                    <>
                      <p className="text-lg font-black text-[#f26522] leading-tight">Welcome!</p>
                      <p className="font-bold text-[#1a0a00] truncate">{t.guestName}</p>
                      <p className="text-sm text-[#a05a3a]">to <span className="font-semibold">{t.eventName}</span> — You may proceed ✓</p>
                    </>
                  ) : t.alreadyUsed ? (
                    <>
                      <p className="font-bold text-amber-800">Already checked in</p>
                      {t.guestName && <p className="text-sm text-amber-700">{t.guestName}</p>}
                      <p className="text-xs text-amber-600">{t.message}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-red-700">Check-in failed</p>
                      <p className="text-sm text-red-600">{t.message}</p>
                    </>
                  )}
                </div>
                <button
                  className="shrink-0 text-lg leading-none text-gray-400 hover:text-gray-600 self-start"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  aria-label="Dismiss"
                >×</button>
              </div>
            ))}
          </div>

          {/* ── Camera ── */}
          <div className="card overflow-hidden p-0 flex-1 flex flex-col" style={{ minHeight: "58vh" }}>
            <div className="relative bg-black flex-1">
              {/* Video — always in DOM so ref is stable */}
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scanning ? "opacity-100" : "opacity-0"}`}
                muted
                playsInline
                autoPlay
              />

              {/* Idle state */}
              {!scanning && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-24 h-24 rounded-2xl border-4 border-[#f26522]/40 flex items-center justify-center">
                    <svg className="w-12 h-12 text-[#f26522]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75V16.5zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-sm font-medium">Camera off — tap Start to scan</p>
                </div>
              )}

              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 45% at 50% 48%, transparent 0%, rgba(0,0,0,0.55) 100%)" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative" style={{ width: "62vmin", height: "62vmin", maxWidth: 320, maxHeight: 320 }}>
                      <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#f26522] rounded-tl-lg" />
                      <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#f26522] rounded-tr-lg" />
                      <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#f26522] rounded-bl-lg" />
                      <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#f26522] rounded-br-lg" />
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#f26522] to-transparent sweep-line" />
                    </div>
                  </div>
                  <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-xs font-semibold tracking-wide">
                    ALIGN QR CODE WITHIN FRAME
                  </p>
                </div>
              )}

              {/* Camera error overlay */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <span className="text-4xl">📷</span>
                  <p className="text-white font-semibold text-sm">{cameraError}</p>
                  <button
                    onClick={() => { setCameraError(null); void startScannerWithMode(facingMode); }}
                    className="mt-2 rounded-lg bg-[#f26522] px-4 py-2 text-sm font-bold text-white"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-3 bg-white border-t-2 border-[#ffe0cc] flex items-center gap-2">
              <button
                onClick={scanning ? stopScanner : startScanner}
                className={`btn flex-1 ${scanning ? "btn-ghost" : "btn-primary"} text-sm py-2.5`}
              >
                {scanning ? "⏹ Stop camera" : "▶ Start camera scan"}
              </button>
              {scanning && (
                <button
                  onClick={switchCamera}
                  className="btn btn-ghost shrink-0 px-3 py-2.5 text-xl"
                  title="Flip camera"
                  aria-label="Switch between front and back camera"
                >
                  🔄
                </button>
              )}
            </div>
          </div>

          {/* ── Manual entry ── */}
          <div className="card p-4">
            <p className="mb-2 text-sm font-bold text-[#f26522]">Manual QR token entry</p>
            <form onSubmit={submitManual} className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Paste QR token…"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
              />
              <button type="submit" className="btn btn-primary shrink-0 text-sm">Check in</button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes sweep {
          0%   { top: 4px; opacity: 1; }
          48%  { opacity: 1; }
          50%  { top: calc(100% - 4px); opacity: 0.4; }
          52%  { opacity: 1; }
          100% { top: 4px; opacity: 1; }
        }
        .sweep-line { animation: sweep 2.2s ease-in-out infinite; position: absolute; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-in { animation: slideIn 0.22s cubic-bezier(.22,1,.36,1) both; }
      `}</style>
    </div>
  );
}
