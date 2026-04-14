"use client";

// global-error.tsx wraps the root layout itself, so no providers, no context,
// no CSS-in-JS, and no next-intl are available. We detect the locale from the
// URL on mount and use hardcoded strings to stay self-contained.

import Link from "next/link";
import { useEffect, useState } from "react";

const MESSAGES = {
  en: {
    badge: "Transmission error",
    heading: "We hit a snag decoding this page.",
    body: "Something went wrong on our side. You can try again — if it keeps happening, head back home and we will be right there.",
    tryAgain: "Try again",
    backHome: "Back to Decoder",
  },
  cs: {
    badge: "Chyba přenosu",
    heading: "Tuhle stránku se nepodařilo dekódovat.",
    body: "Něco se pokazilo na naší straně. Zkuste to znovu. Když to nepovolí, vraťte se na úvod a chytněte další stopu odtamtud.",
    tryAgain: "Zkusit znovu",
    backHome: "Zpět na Decoder",
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
    setLocale(detectLocale());
    console.error(error);
  }, [error]);

  const t = MESSAGES[locale];

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "#0b0f14",
          color: "#e8eaf0",
          fontFamily: "'ui-monospace', 'SFMono-Regular', 'Menlo', monospace",
        }}
      >
        <header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 64,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            zIndex: 50,
            background: "rgba(11,15,20,0.9)",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#e8eaf0",
              textDecoration: "none",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Decoder
          </Link>
        </header>

        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px 40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 40,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#c8a84b",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(232,234,240,0.5)",
              }}
            >
              {t.badge}
            </span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#c8a84b",
                flexShrink: 0,
              }}
            />
          </div>

          <h1
            style={{
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              fontSize: "clamp(2rem, 6vw, 3.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              margin: "0 0 16px",
              maxWidth: 480,
            }}
          >
            {t.heading}
          </h1>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "rgba(232,234,240,0.55)",
              maxWidth: 400,
              margin: "0 0 40px",
            }}
          >
            {t.body}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: "100%",
              maxWidth: 340,
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#b8f229",
                color: "#0b0f14",
                border: "none",
                borderRadius: 2,
                padding: "14px 32px",
                fontSize: 11,
                fontFamily: "inherit",
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {t.tryAgain}
            </button>
            <Link
              href="/"
              style={{
                color: "rgba(232,234,240,0.55)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 2,
                padding: "14px 32px",
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              {t.backHome}
            </Link>
          </div>

          {process.env.NODE_ENV === "development" && error.digest ? (
            <p
              style={{
                marginTop: 40,
                fontSize: 10,
                color: "rgba(232,234,240,0.35)",
                fontFamily: "inherit",
                wordBreak: "break-all",
                maxWidth: 480,
              }}
            >
              {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
