// Forms index — list every form available in the language. Each
// card links to the per-form page where users fill in answers
// and export a printable HTML file. v1 stores answers in
// localStorage; Phase 2 swaps for per-user server state when
// accounts land (the user_forms table is already in the schema).

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import { getAllForms } from "@/lib/reader";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function FormsIndex({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const t = await getTranslations("forms");
  const forms = await getAllForms(lang);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t("intro")}</p>

      {forms.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">{t("empty")}</p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {forms.map((f) => (
            <li key={f.id}>
              <Link
                href={`/${lang}/forms/${f.slug}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {f.title}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {t("screenCount", { count: f.screenCount })} ·{" "}
                  {t("itemCount", { count: f.itemCount })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
