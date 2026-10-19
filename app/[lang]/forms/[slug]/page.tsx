// Single form page — renders the title and a wizard-style runner
// that captures answers client-side. v1 stores answers in
// localStorage (`umbrella.form.<slug>.answers`); the runner's
// "Export HTML" button emits a self-contained printable document
// in the spirit of Security First's Umbrella_web export utilities
// (`utils/forms.js` + `utils/dom.js`).

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import { getForm } from "@/lib/reader";
import { FormRunner } from "@/components/form-runner";

// Next 16 `cacheComponents: true` rejects `export const dynamic = "force-dynamic"`.
// Use `instant = false` instead, per Next.js 16 docs.
export const instant = false;

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export default async function FormPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);

  const form = await getForm(lang, slug);
  if (!form) notFound();

  const t = await getTranslations("forms");
  // We pass raw templates to the client (it substitutes the
  // {current}/{total} placeholders as the user navigates screens).
  // next-intl otherwise treats those as ICU placeholders and errors
  // at t() time because the values aren't supplied here.
  const screenOf = t.raw("screenOf") as string;
  const backHref = `/${lang}/forms`;
  const backLabel = t("back");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <nav className="text-sm text-fg-muted">
        <Link href={backHref} className="hover:underline">
          ← {backLabel}
        </Link>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {form.title}
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        {t("screenCount", { count: form.screenCount })} ·{" "}
        {t("itemCount", { count: form.itemCount })}
      </p>

      <FormRunner
        slug={form.slug}
        title={form.title}
        schema={form.schema}
        lang={lang}
        labels={{
          saveDraft: t("saveDraft"),
          clearAll: t("clearAll"),
          exportHtml: t("exportHtml"),
          savedLocally: t("savedLocally"),
          fieldEmpty: t("fieldEmpty"),
          confirmClear: t("confirmClear"),
          prev: t("prev"),
          next: t("next"),
          finish: t("finish"),
          screenOf,
          fieldEmptyText: t("fieldEmptyText"),
          exportTitle: t("exportTitle"),
          exportedAt: t("exportedAt"),
        }}
      />
    </main>
  );
}
