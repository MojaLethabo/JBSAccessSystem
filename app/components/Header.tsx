"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV = [
  { href: "/dashboard", label: "Events" },
  { href: "/insights", label: "Analytics" },
];

export default function Header({ onLogout }: { onLogout?: () => void }) {
  const pathname = usePathname();

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Brand */}
        <Link href="/dashboard" className="header-brand">
          <div className="header-logo-wrap">
            <Image src="/uj-logo.jpg" alt="UJ" width={36} height={36} className="header-logo-img" />
          </div>
          <div className="header-brand-text">
            <span className="header-brand-jbs">JBS</span>
            <span className="header-brand-sub">Access System</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="header-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`header-nav-item${pathname?.startsWith(item.href) ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        {onLogout && (
          <button className="header-logout" onClick={onLogout}>
            Log out
          </button>
        )}
      </div>
    </header>
  );
}
