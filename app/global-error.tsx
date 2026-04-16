"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BRAND_NAME } from "@/lib/brand";

import "./globals.css";

const MESSAGES = {
  en: {
    badge: "Transmission error",
    heading: "We hit a snag decoding this page.",
    body: "Something went wrong on our side. You can try again — if it keeps happening, head back home and we will be right there.",
    tryAgain: "Try again",
    backHome: `Back to ${BRAND_NAME}`,
  },
  cs: {
    badge: "Chyba přenosu",
    heading: "Tuhle stránku se nepodařilo dekódovat.",
    body: "Něco se pokazilo na naší straně. Zkuste to znovu. Když to nepovolí, vraťte se na úvod a chytněte další stopu odtamtud.",
    tryAgain: "Zkusit znovu",
    backHome: `Zpět na ${BRAND_NAME}`,
  },
} as const;

type Locale = keyof typeof MESSAGES;

function detectLocale(): Locale {
  if (typeof window === "undefined") return "cs";
  const p = window.location.pathname;
  return p === "/en" || p.startsWith("/en/") ? "en" : "cs";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("cs");

  useEffect(() => {
    queueMicrotask(() => {
      setLocale(detectLocale());
    });
    console.error(error);
  }, [error]);

  const t = MESSAGES[locale];

  return (
    <html lang={locale}>
      <body className="global-error-body">
        <header className="global-error-header">
          <Link href="/" className="global-error-brand-link">
            {BRAND_NAME}
          </Link>
        </header>

        <main className="global-error-main">
          <div className="global-error-badge-row">
            <span className="global-error-badge-dot" />
            <span className="global-error-badge-label">{t.badge}</span>
            <span className="global-error-badge-dot" />
          </div>

          <h1 className="global-error-title">{t.heading}</h1>

          <p className="global-error-copy">{t.body}</p>

          <div className="global-error-actions">
            <button type="button" onClick={reset} className="global-error-button">
              {t.tryAgain}
            </button>
            <Link href="/" className="global-error-link">
              {t.backHome}
            </Link>
          </div>

          {process.env.NODE_ENV === "development" && error.digest ? (
            <p className="global-error-digest">{error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
