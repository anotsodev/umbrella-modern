// Search page placeholder.
//
// FTS infrastructure (tsvector column on `contents`, GIN index,
// search endpoint) lands in the next commit. This page is a minimal
// shell so the header link resolves and so we can verify the reader
// surface in a smoke test.

import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";

export const instant = false;

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function SearchPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const t = await getTranslations("nav");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">{t("search")}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Search lands in the next commit. Postgres FTS index is being added to
        the <code>contents</code> table.
      </p>
    </main>
  );
}
