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
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              404
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t("body")}
            </p>
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
                  className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {t("searchButton")}
                </button>
              </form>
              <Link
                href={`/${lang}`}
                className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t("home")}
              </Link>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <LocalePicker current={lang} />
            </div>
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
