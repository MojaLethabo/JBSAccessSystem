import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "JBS Access — QR event registration & check-in",
  description:
    "Launch events in minutes. Share one registration link, deliver unique QR tickets to guests and check people in at the door—fast, clear and tied to your event window.",
};

function IconQr({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 5h2v2h-2v-2zm4 0h2v2h-2v-2zm-4-4h6v2h-6v-2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTicket({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v2.5a1.5 1.5 0 010 3V15a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.5a1.5 1.5 0 010-3V7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11h6" strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}

function IconScan({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M7 3H5a2 2 0 00-2 2v2M17 3h2a2 2 0 012 2v2M7 21H5a2 2 0 01-2-2v-2M17 21h2a2 2 0 002-2v-2M9 9h6v6H9z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-10%,rgba(242,101,34,0.09),transparent)]" />
      <div className="pointer-events-none absolute -left-[18%] top-[8%] h-[min(420px,75vw)] w-[min(420px,75vw)] rounded-full bg-[#f26522]/10 blur-[90px]" />
      <div className="pointer-events-none absolute -right-[12%] bottom-[12%] h-[min(380px,70vw)] w-[min(380px,70vw)] rounded-full bg-orange-100/80 blur-[80px]" />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 pb-16 pt-24 sm:px-10 md:pb-24 md:pt-28 lg:px-12">
        <div className="mx-auto w-full max-w-3xl text-center lg:max-w-4xl">
          <div className="flex justify-center">
            <Image
              src="/uj-logo.jpg"
              alt="University of Johannesburg"
              width={1024}
              height={1020}
              priority
              className="h-auto max-h-28 w-auto max-w-[min(100%,320px)] object-contain md:max-h-36"
            />
          </div>

          <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]">
            <span className="text-stone-900">QR event registration</span>
            <br />
            <span className="bg-gradient-to-r from-[#ea580c] via-[#f26522] to-[#fb923c] bg-clip-text text-transparent">
              &amp; check-in
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-stone-600 sm:text-lg">
            Launch events in minutes. Share one registration link, deliver unique QR tickets to guests and check people
            in at the door—fast, clear and tied to your event window.
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/login"
              className="btn btn-primary inline-flex min-h-[3rem] min-w-[200px] px-8 py-3 text-base shadow-[0_4px_24px_-8px_rgba(242,101,34,0.45)] transition hover:brightness-105 hover:shadow-[0_6px_28px_-6px_rgba(242,101,34,0.55)]"
            >
              Organizer login
            </Link>
            <Link
              href="/signup"
              className="btn btn-ghost inline-flex min-h-[3rem] min-w-[200px] border-stone-300 px-8 py-3 text-base text-stone-800 shadow-sm transition hover:border-[#f26522]/45 hover:bg-[#f26522]/[0.07]"
            >
              Register as organizer
            </Link>
          </div>

          <p className="mt-5 text-sm text-stone-500">New here? Registration takes under a minute.</p>
        </div>

        <ul className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-5">
          <li className="rounded-2xl border border-stone-200/90 bg-white p-6 text-left shadow-sm transition hover:border-[#f26522]/30 hover:shadow-md">
            <IconQr className="mb-4 h-9 w-9 text-[#f26522]" />
            <h2 className="text-base font-semibold text-stone-900">Registration links</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">One link per event—guests sign up and get a ticket.</p>
          </li>
          <li className="rounded-2xl border border-stone-200/90 bg-white p-6 text-left shadow-sm transition hover:border-[#f26522]/30 hover:shadow-md">
            <IconTicket className="mb-4 h-9 w-9 text-[#f26522]" />
            <h2 className="text-base font-semibold text-stone-900">Personal QR tickets</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">Unique codes per guest—single-use at entry.</p>
          </li>
          <li className="rounded-2xl border border-stone-200/90 bg-white p-6 text-left shadow-sm transition hover:border-[#f26522]/30 hover:shadow-md">
            <IconScan className="mb-4 h-9 w-9 text-[#f26522]" />
            <h2 className="text-base font-semibold text-stone-900">Door check-in</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">Camera scan at the check-in desk with instant feedback.</p>
          </li>
        </ul>

        <p className="mx-auto mt-14 max-w-md text-center text-sm leading-relaxed text-stone-600">
          Attending an event as a guest?{" "}
          <span className="text-stone-500">Open the registration link your organizer sent—there&apos;s no signup on this page.</span>
        </p>
      </main>
    </div>
  );
}
