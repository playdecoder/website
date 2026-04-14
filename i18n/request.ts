import { getRequestConfig } from "next-intl/server";

import cs from "./cs.json";
import en from "./en.json";
import { routing } from "./routing";

const messages = {
  en: en as Record<string, unknown>,
  cs: cs as Record<string, unknown>,
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "en" | "cs")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale as keyof typeof messages],
  };
});
