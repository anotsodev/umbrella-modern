"use client";

// First-visit banner explaining that pathway + form progress is
// device-local until sign-in lands. Sign-in already exists in
// Phase 0, so the "Sign in to sync" link in the banner is real;
// the "coming soon" framing refers to the per-user server
// persistence that Phase 2 adds in this same release.
//
// Dismissal is sticky via a localStorage key. We don't try to
// hide it server-side (it would defeat the point — anonymous
// users have no account to attach state to) but we do make it
// dismissable once, since it would get old fast on repeat visits.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const DISMISS_KEY = "umbrella.dismiss.localStorageNotice";

function loadDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function setDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore — better to keep showing the banner than crash
  }
}

type Props = {
  lang: string;
};

export function LocalStorageNotice({ lang }: Props) {
  const t = useTranslations("notice");
  const [visible, setVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setVisible(!loadDismissed());
    setHydrated(true);
  }, []);

  // Render nothing during SSR / before the dismiss flag is
  // read. The banner is purely a client-side affordance.
  if (!hydrated || !visible) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="flex-1 min-w-0">
          {t.rich("localStorageOnly", {
            signInLink: (chunks) => (
              <Link
                href={`/${lang}/sign-in`}
                className="font-medium underline hover:no-underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
        <button
          type="button"
          onClick={() => {
            setDismissed();
            setVisible(false);
          }}
          className="rounded border border-amber-400 px-2 py-0.5 text-xs hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
        >
          {t("gotIt")}
        </button>
      </div>
    </div>
  );
}
