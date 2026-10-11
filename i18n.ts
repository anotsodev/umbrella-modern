import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Languages we ship with. Mirrors the umbrella-content repo's language roots.
// Keep in sync with NEXT_PUBLIC_SUPPORTED_LOCALES in .env.example.
export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;
export type Locale = (typeof locales)[number];

export const rtlLocales: ReadonlySet<Locale> = new Set<Locale>(["ar", "fa"]);

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  try {
    return (await import(`./messages/${locale}.json`)).default;
  } catch {
    return {};
  }
}

// Shallow-merge missing top-level keys from the default locale so partial
// translations never crash the page. Deep-merging would be safer, but
// `next-intl` 4.x dropped `fallbackLocale` from the client provider, so we
// emulate it at the request layer where the bundle sees one merged map.
function withFallback(
  primary: Record<string, unknown>,
  fallback: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fallback, ...primary };
  for (const key of Object.keys(out)) {
    const a = primary[key];
    const b = fallback[key];
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
      out[key] = withFallback(a as Record<string, unknown>, b as Record<string, unknown>);
    }
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = (await requestLocale) ?? defaultLocale;
  const locale: Locale = isLocale(requested) ? requested : defaultLocale;

  const messages = await loadMessages(locale);
  if (locale === defaultLocale) {
    return { locale, messages };
  }
  const fallbackMessages = await loadMessages(defaultLocale);
  return { locale, messages: withFallback(messages, fallbackMessages) };
});
