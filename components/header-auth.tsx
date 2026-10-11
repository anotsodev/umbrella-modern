"use client";

// HeaderAuth — discoverable sign-in / user dropdown for the global
// header. Phase 2 shipped the per-user server persistence but the
// header only had a hidden /<lang>/sign-in route. This makes
// signing in discoverable: anonymous users see a "Sign in" link,
// signed-in users see their email + a dropdown with Account and
// Sign out.
//
// Wrapped in <Suspense> at the call site because useSession()
// from better-auth uses React state and is a client hook, and
// Next 16 cacheComponents requires a Suspense boundary around
// any client component that reads state on mount.

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import Link from "next/link";

type Props = { lang: string };

export function HeaderAuth({ lang }: Props) {
  const { data: session, isPending } = useSession();
  const t = useTranslations("auth");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (isPending) {
    return (
      <span className="text-sm text-zinc-400" aria-hidden="true">
        …
      </span>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href={`/${lang}/sign-in`}
        className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {t("headerSignIn")}
      </Link>
    );
  }

  const email = session.user.email ?? t("signedInFallback");

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="max-w-[12rem] truncate" title={email}>
          {email}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute end-0 z-20 mt-1 min-w-[10rem] rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900"
        >
          <Link
            href={`/${lang}/account`}
            role="menuitem"
            className="block w-full px-3 py-1.5 text-start text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => setMenuOpen(false)}
          >
            {t("account")}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setMenuOpen(false);
              // SECURITY: do not replace this signOut() call with a client-only
              // cookie clear. The server must delete the `session` row to honor
              // the privacy statement's "session deleted immediately on sign-out"
              // promise. See dev-docs/spec.md "Server-side session invalidation".
              await signOut();
            }}
            className="block w-full px-3 py-1.5 text-start text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {t("signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
