import { defineRouting } from "next-intl/routing";

// Single source of truth for locale routing config.
// Used by both the i18n request config and the middleware.
//
// Mirrors the umbrella-content repo's language roots.
// Keep in sync with NEXT_PUBLIC_SUPPORTED_LOCALES in .env.example.
export const routing = defineRouting({
  locales: ["en", "ar", "es", "fa", "fr", "ru", "zh-Hant"],
  defaultLocale: "en",
  localePrefix: "always",
});
