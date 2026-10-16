"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
      { href: "/plans", label: "Plans", icon: PathIcon },
      { href: "/lessons", label: "Lessons", icon: LessonIcon },
      { href: "/subjects", label: "Subjects", icon: BookIcon },
      { href: "/exams", label: "Exams", icon: ExamIcon },
    ],
  },
  {
    label: "Progress",
    items: [
      { href: "/results", label: "Results", icon: ResultsIcon },
      { href: "/performance", label: "Performance", icon: ChartIcon },
    ],
  },
] as const;

const STORAGE_KEY = "lunora:sidebar-collapsed";

export function StudentSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapse preference once on mount.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  // Persist collapse preference.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Close on Escape when the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const width = collapsed ? "w-[68px]" : "w-60";

  return (
    <>
      {/* ============ MOBILE TRIGGER ============ */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-3 z-40 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-neutral-950/80 text-neutral-300 backdrop-blur-xl transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <path
            d="M3 5h10M3 8h10M3 11h10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* ============ DESKTOP SIDEBAR ============ */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/5 bg-neutral-950/70 backdrop-blur-xl transition-[width] duration-200 ease-out lg:flex ${width}`}
      >
        <SidebarInner
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* ============ MOBILE DRAWER ============ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm"
          />

          {/* Panel */}
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/10 bg-neutral-950 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="grid h-9 w-9 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M5 5l6 6M11 5l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <SidebarInner pathname={pathname} collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}

/* ============================================================
   SidebarInner — the actual nav content, shared between
   desktop and mobile
   ============================================================ */
function SidebarInner({
  pathname,
  collapsed,
  onToggleCollapse,
}: {
  pathname: string;
  collapsed: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ============ BRAND ============ */}
      <div
        className={`flex items-center gap-3 border-b border-white/5 px-4 py-4 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[12px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
            L
          </span>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-white">
              Lunora
            </span>
          )}
        </Link>
      </div>

      {/* ============ NAV ============ */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                        collapsed ? "justify-center px-0" : ""
                      } ${
                        isActive
                          ? "bg-white/[0.06] text-white"
                          : "text-neutral-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-fuchsia-400"
                        />
                      )}
                      <Icon />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ============ FOOTER ============ */}
      <div
        className={`border-t border-white/5 ${
          collapsed ? "px-2 py-3" : "px-3 py-3"
        }`}
      >
        <div
          className={`flex items-center gap-3 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 ring-0",
              },
            }}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-neutral-300">
                Account
              </p>
              <p className="truncate text-[10px] text-neutral-500">
                Manage settings
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============ COLLAPSE TOGGLE (desktop only) ============ */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-20 hidden h-6 w-6 place-items-center rounded-full border border-white/10 bg-neutral-950 text-neutral-400 shadow-lg transition-colors hover:text-white lg:grid"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className={`h-3 w-3 transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
          >
            <path
              d="M10 3.5 5.5 8 10 12.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Icons
   ============================================================ */
function HomeIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4 flex-shrink-0">
      <path
        d="M2.5 7 8 3l5.5 4v5.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6 13.5V9h4v4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PathIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4 flex-shrink-0">
      <circle cx="3.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="3.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4.5 4.5c3 1 5 2 6 3M4.5 11.5c3-1 5-2 6-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LessonIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4 flex-shrink-0">
      <path d="M3 2.5h10v11H3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4 flex-shrink-0">
      <path
        d="M3 3h5.5a1.5 1.5 0 0 1 1.5 1.5V13L8 11.5 5.5 13V3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 3h-2.5M13 6h-2.5M13 9h-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ExamIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4 flex-shrink-0">
      <path d="M4 2.5h6.5L13 5v8.5H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 2.5V5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 9h5M6 11.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ResultsIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4 flex-shrink-0">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.5 9.5 7 11 10.5 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4 flex-shrink-0">
      <path d="M2.5 13.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.5 13.5V9M7.5 13.5V5M10.5 13.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}