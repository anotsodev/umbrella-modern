import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { locales, isLocale, rtlLocales } from "@/i18n";
import { LocalePicker } from "@/components/locale-picker";
import { LocalStorageNotice } from "@/components/local-storage-notice";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const messages = await getMessages();
  const dir = rtlLocales.has(lang) ? "rtl" : "ltr";
  const tNav = await getTranslations("nav");
  const tFoot = await getTranslations("footer");

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={lang} messages={messages}>
          {/* Suspense required: LocalStorageNotice uses useEffect +
              useTranslations which need a client boundary; under
              Next 16 cacheComponents, any client component that
              reads state on mount must be wrapped. */}
          <Suspense fallback={null}>
            <LocalStorageNotice lang={lang} />
          </Suspense>
          <header className="border-b border-zinc-200 dark:border-zinc-800">
            <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-6">
                <Link
                  href={`/${lang}`}
                  className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Umbrella
                </Link>
                <Link
                  href={`/${lang}`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {tNav("home")}
                </Link>
                <Link
                  href={`/${lang}/categories`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {tNav("categories")}
                </Link>
                <Link
                  href={`/${lang}/pathways`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {tNav("pathways")}
                </Link>
                <Link
                  href={`/${lang}/forms`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {tNav("forms")}
                </Link>
                <form
                  action={`/${lang}/search`}
                  method="get"
                  className="flex items-center"
                  role="search"
                >
                  <input
                    type="search"
                    name="q"
                    defaultValue=""
                    placeholder={tNav("searchPlaceholder")}
                    aria-label="Search"
                    className="w-40 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </form>
              </div>
              {/* Suspense required: next-intl client components use usePathname() which must be inside a Suspense boundary under Next 16 cacheComponents. */}
              <Suspense fallback={null}>
                <LocalePicker current={lang} />
              </Suspense>
            </nav>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-zinc-500">
              <span>© Umbrella · {tFoot("license")}</span>
              <div className="flex items-center gap-4">
                <Link href={`/${lang}/terms`} className="hover:underline">
                  {tFoot("privacy")}
                </Link>
                <a
                  href="https://github.com/anotsodev/Umbrella_android"
                  className="hover:underline"
                >
                  Source
                </a>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
