// Stub. The sign-in flow already exists (better-auth, magic-link),
// the local-storage gate is in place, and the per-user sync
// endpoints are wired. A real account page — manage devices,
// see what's synced, revoke access — is a v2 feature.
//
// Why this page exists in v1: the header has a link to it, and
// a 404 on a header link is bad UX. A "coming soon" page is
// honest about the state of the work and keeps the navigation
// promise coherent.

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "account" });
  return {
    title: t("title"),
    description: t("body"),
  };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const t = await getTranslations("account");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-fg">{t("headline")}</h1>
      <p className="mt-4 text-base text-fg-muted">{t("body")}</p>
      <div className="mt-8">
        <Link
          href={`/${lang}`}
          className="text-sm text-accent hover:underline"
        >
          ← {t("backLink")}
        </Link>
      </div>
    </main>
  );
}
