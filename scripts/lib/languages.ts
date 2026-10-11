// Detect language directionality (LTR / RTL) for the languages we ship.
// Source: Unicode CLDR plus the umbrella-content repo's published list.
// Anything not in the table falls back to LTR.
const RTL = new Set(["ar", "fa", "he", "ur"]);

export function isRtl(code: string): boolean {
  return RTL.has(code);
}

export const NATIVE_NAMES: Record<string, string> = {
  ar: "العربية",
  en: "English",
  es: "Español",
  fa: "فارسی",
  fr: "Français",
  ru: "Русский",
  "zh-Hant": "繁體中文",
};

export const ENGLISH_NAMES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  es: "Spanish",
  fa: "Persian",
  fr: "French",
  ru: "Russian",
  "zh-Hant": "Traditional Chinese",
};
