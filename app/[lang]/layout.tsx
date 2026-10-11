import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { locales, isLocale, rtlLocales } from "@/i18n";
import { LocalePicker } from "@/components/locale-picker";
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
                  href={`/${lang}/search`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {tNav("search")}
                </Link>
              </div>
              {/* Suspense required: next-intl client components use usePathname() which must be inside a Suspense boundary under Next 16 cacheComponents. */}
              <Suspense fallback={null}>
                <LocalePicker current={lang} />
              </Suspense>
            </nav>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-xs text-zinc-500">
              <span>© Umbrella · {tFoot("license")}</span>
              <a
                href="https://github.com/anotsodev/Umbrella_android"
                className="hover:underline"
              >
                Source
              </a>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
