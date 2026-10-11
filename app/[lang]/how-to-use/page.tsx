import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n";
import { notFound } from "next/navigation";

// A short, image-led tour of Umbrella aimed at the people who
// actually use the app — journalists, activists, aid workers,
// human-rights defenders, business travelers in high-risk
// countries. The screenshots come from the Android build (see
// public/how-to-use/). The copy is English-only in v1; new
// locales will get translated captions in a follow-up.

const STEPS = [
  {
    src: "/how-to-use/02.png",
    title: "Open the home screen",
    body: "From anywhere in the app you can get back to the home screen, which lists every category of guidance Umbrella offers — devices, communication, physical safety, and more.",
  },
  {
    src: "/how-to-use/04.png",
    title: "Browse a category",
    body: "Pick the topic you want to learn about. Each category has short, practical guides written by people who have used these techniques in the field.",
  },
  {
    src: "/how-to-use/04-2.png",
    title: "Open a topic",
    body: "Tap a topic to read the full guide. You can read it offline once it has been loaded, and you can share it with a colleague if they need the same advice.",
  },
  {
    src: "/how-to-use/06.png",
    title: "Follow a pathway",
    body: "Pathways are step-by-step checklists for situations where the order of decisions matters — meeting a source, crossing a border, or preparing for travel. Tick each step as you finish it; your progress is saved on this device.",
  },
  {
    src: "/how-to-use/06-1.png",
    title: "Work through a checklist",
    body: "Each step in a pathway has a short explanation. Some steps include further reading linked to a topic. Don't rush — the order is the point.",
  },
  {
    src: "/how-to-use/06-2.png",
    title: "See your progress",
    body: "The pathway shows how much you've completed at a glance. If you have to stop mid-way, your progress is kept so you can pick up where you left off.",
  },
  {
    src: "/how-to-use/7.png",
    title: "Search across everything",
    body: "Use the search box in the header to find a topic, a pathway, or a form by keyword. Search covers all of Umbrella's content in your chosen language.",
  },
  {
    src: "/how-to-use/8.png",
    title: "Read offline",
    body: "Once a topic has loaded it stays available without a network connection. This is deliberate — Umbrella is built for people who can't always rely on connectivity.",
  },
  {
    src: "/how-to-use/09.png",
    title: "Switch languages",
    body: "Use the language picker in the top-right to read Umbrella in another of the seven supported languages. Content is independently translated per language; some topics are available in more languages than others.",
  },
  {
    src: "/how-to-use/09-2.png",
    title: "Switch from a content page",
    body: "The language picker is available on every page, so you can switch context without losing the page you were on.",
  },
  {
    src: "/how-to-use/10.png",
    title: "Find a form",
    body: "Forms help you capture information safely — incident reports, contact lists, situational assessments. Open the form, fill it in on this device, and export it to a printable HTML file you control.",
  },
  {
    src: "/how-to-use/10-2.png",
    title: "Fill in a form",
    body: "Each form is a series of questions. Move through them at your own pace; your answers stay on this device unless you sign in to sync them across devices.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "howToUse" });
  return {
    title: t("title"),
    description: t("intro"),
  };
}

export default async function HowToUsePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const t = await getTranslations("howToUse");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-fg">{t("title")}</h1>
      <p className="mt-3 text-base text-fg-muted">{t("intro")}</p>
      <p className="mt-2 text-sm text-fg-muted">{t("audience")}</p>

      <ol className="mt-10 space-y-12">
        {STEPS.map((step, i) => (
          <li key={step.src} className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-fg"
              >
                {i + 1}
              </span>
              <h2 className="text-xl font-semibold text-fg">{step.title}</h2>
            </div>
            <div className="overflow-hidden rounded-lg border border-line bg-surface-sunken">
              {/* Screenshots are PNGs from the Android build, sized
                  for narrow mobile screens. Using <img> rather than
                  next/image so the browser picks the right src
                  without needing the `sizes` attribute. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={step.src}
                alt={step.title}
                className="mx-auto block max-h-[480px] w-auto"
                loading="lazy"
              />
            </div>
            <p className="text-sm leading-relaxed text-fg">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 rounded-lg border border-line bg-surface-sunken p-6 text-sm text-fg-muted">
        {t("footer")}
      </div>
    </main>
  );
}
