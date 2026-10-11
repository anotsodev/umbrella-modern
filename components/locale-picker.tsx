"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { locales } from "@/i18n";

// Locale picker for the header. Switches the URL's [lang] segment
// while keeping the rest of the path intact, then refreshes the
// current RSC tree so the new locale's messages load.

const NATIVE_NAMES: Record<(typeof locales)[number], string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  fa: "فارسی",
  fr: "Français",
  ru: "Русский",
  "zh-Hant": "繁體中文",
};

export function LocalePicker({ current }: { current: string }) {
  const t = useTranslations("localePicker");
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function pickLocale(next: string) {
    setOpen(false);
    // Replace the leading [lang] segment with the chosen one.
    const segments = pathname.split("/");
    if (segments[1] === current) {
      segments[1] = next;
    } else {
      // Shouldn't happen for in-app navigation, but be safe.
      segments.splice(1, 0, next);
    }
    const target = segments.join("/") || `/${next}`;
    startTransition(() => {
      router.push(target);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("menu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {NATIVE_NAMES[current as keyof typeof NATIVE_NAMES] ?? current}
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute end-0 z-10 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        >
          {locales.map((code) => (
            <li key={code} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => pickLocale(code)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-start text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                  code === current ? "font-medium" : ""
                }`}
              >
                <span>{NATIVE_NAMES[code]}</span>
                <span className="ms-2 text-xs text-zinc-500">{code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
