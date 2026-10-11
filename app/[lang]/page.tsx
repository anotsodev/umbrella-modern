import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await getTranslations("home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="text-sm uppercase tracking-widest text-zinc-500">
        {t("phase")} · {lang}
      </p>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        {t("subtitle")}
      </p>
      <p className="text-sm text-zinc-500">
        {t("footer")}
      </p>
    </main>
  );
}
