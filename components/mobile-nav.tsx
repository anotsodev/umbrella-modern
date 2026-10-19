"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";

const LINKS = [
  { key: "home", href: "" },
  { key: "categories", href: "/categories" },
  { key: "pathways", href: "/pathways" },
  { key: "forms", href: "/forms" },
  { key: "howToUse", href: "/how-to-use" },
  { key: "account", href: "/account" },
  { key: "credits", href: "/credits" },
] as const;

// Hamburger menu for viewports below lg, where the inline nav links
// no longer fit alongside search + locale + auth controls. The search
// input only lives in the panel on phones (<sm); from sm up it stays
// visible in the header bar itself.
export function MobileNav({ lang }: { lang: string }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape while open.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative lg:hidden">
      <button
        type="button"
        aria-label={t("menu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex shrink-0 items-center rounded-md border border-line-strong p-2 text-fg hover:bg-surface-sunken"
      >
        {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
      </button>
      {open && (
        <div className="absolute start-0 z-10 mt-2 w-56 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg">
          <form
            action={`/${lang}/search`}
            method="get"
            role="search"
            className="p-2 pb-1 sm:hidden"
          >
            <input
              type="search"
              name="q"
              defaultValue=""
              placeholder={t("searchPlaceholder")}
              aria-label={t("search")}
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />
          </form>
          {LINKS.map(({ key, href }) => (
            <Link
              key={key}
              href={`/${lang}${href}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-fg hover:bg-surface-sunken"
            >
              {t(key)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
