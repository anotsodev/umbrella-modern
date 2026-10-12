// Root 404 page. Renders when a route doesn't match at all
// (e.g. /en/some-typo). It applies the locale-aware layout
// chrome (header, footer, locale picker) and serves a styled
// body with a search box and a home link.
//
// We can't trust `params` here — there is no matched route.
// Instead we read the requested locale from the NEXT_LOCALE
// cookie that next-intl's middleware sets, falling back to
// "en" if the cookie is missing or invalid.

import { cookies } from "next/headers";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n";
import { LocalePicker } from "@/components/locale-picker";
import { Button } from "@/components/button";

// 404s are inherently dynamic — the requested path never matched
// a [lang] segment, so we have to read the active locale from the
// NEXT_LOCALE cookie that next-intl's middleware sets. Opt out of
// Cache Components' default-blocking prerender so the route is
// allowed to read cookies at request time.
export const instant = false;

export default async function NotFound() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const lang = isLocale(cookieLocale ?? "") ? cookieLocale! : "en";
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "notFound" });
  const messages = await getMessages({ locale: lang });
  return (
    <html lang={lang} dir={lang === "ar" || lang === "fa" ? "rtl" : "ltr"}>
      <body>
        <NextIntlClientProvider locale={lang} messages={messages}>
          <main className="mx-auto w-full max-w-2xl px-6 py-16">
            <p className="text-sm font-medium text-fg-muted">404</p>
            <h1 className="mt-2 text-3xl font-semibold text-fg">{t("title")}</h1>
            <p className="mt-3 text-sm text-fg-muted">{t("body")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <form
                action={`/${lang}/search`}
                method="get"
                className="flex items-center gap-2"
                role="search"
              >
                <input
                  type="search"
                  name="q"
                  defaultValue=""
                  placeholder={t("searchPlaceholder")}
                  aria-label="Search"
                  className="w-56 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                />
                <Button type="submit" variant="primary" size="sm">
                  {t("searchButton")}
                </Button>
              </form>
              <Link
                href={`/${lang}`}
                className="text-sm text-fg-muted underline hover:text-fg"
              >
                {t("home")}
              </Link>
              <span className="text-fg-subtle">|</span>
              <LocalePicker current={lang} />
            </div>
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
