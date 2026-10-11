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
import { HeaderAuth } from "@/components/header-auth";
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
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <NextIntlClientProvider locale={lang} messages={messages}>
          {/* Suspense required: LocalStorageNotice uses useEffect +
              useTranslations which need a client boundary; under
              Next 16 cacheComponents, any client component that
              reads state on mount must be wrapped. */}
          <Suspense fallback={null}>
            <LocalStorageNotice lang={lang} />
          </Suspense>
          <header className="border-b border-line">
            <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
              <div className="flex flex-wrap items-center gap-6">
                <Link
                  href={`/${lang}`}
                  className="text-sm font-medium text-fg"
                >
                  Umbrella
                </Link>
                <Link
                  href={`/${lang}`}
                  className="text-sm text-fg-muted hover:text-fg"
                >
                  {tNav("home")}
                </Link>
                <Link
                  href={`/${lang}/categories`}
                  className="text-sm text-fg-muted hover:text-fg"
                >
                  {tNav("categories")}
                </Link>
                <Link
                  href={`/${lang}/pathways`}
                  className="text-sm text-fg-muted hover:text-fg"
                >
                  {tNav("pathways")}
                </Link>
                <Link
                  href={`/${lang}/forms`}
                  className="text-sm text-fg-muted hover:text-fg"
                >
                  {tNav("forms")}
                </Link>
                <Link
                  href={`/${lang}/how-to-use`}
                  className="text-sm text-fg-muted hover:text-fg"
                >
                  {tNav("howToUse")}
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
                    className="w-40 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                  />
                </form>
              </div>
              {/* Suspense required: next-intl client components use usePathname() which must be inside a Suspense boundary under Next 16 cacheComponents. */}
              <Suspense fallback={null}>
                <LocalePicker current={lang} />
              </Suspense>
              <Suspense
                fallback={
                  <span className="text-sm text-fg-subtle" aria-hidden="true">
                    …
                  </span>
                }
              >
                <HeaderAuth lang={lang} />
              </Suspense>
            </nav>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-line">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-fg-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span>© Umbrella · {tFoot("license")}</span>
                <span aria-hidden="true">·</span>
                <span>{tFoot("dataNote")}</span>
              </div>
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
