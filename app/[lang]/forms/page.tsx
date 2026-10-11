// Forms index — list every form available in the language. Each
// card links to the per-form page where users fill in answers
// and export a printable HTML file. v1 stores answers in
// localStorage; Phase 2 swaps for per-user server state when
// accounts land (the user_forms table is already in the schema).

import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import { getAllForms } from "@/lib/reader";
import { LinkCard } from "@/components/card";

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
      <p className="mt-2 text-fg-muted">{t("intro")}</p>

      {forms.length === 0 ? (
        <p className="mt-8 text-sm text-fg-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {forms.map((f) => (
            <li key={f.id}>
              <LinkCard
                href={`/${lang}/forms/${f.slug}`}
                title={f.title}
                subtitle={`${t("screenCount", { count: f.screenCount })} · ${t("itemCount", { count: f.itemCount })}`}
                titleSize="sm"
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
