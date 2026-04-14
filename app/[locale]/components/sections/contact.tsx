import { getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { PAGE_SECTION_ID } from "@/lib/routes";
import {
  PODCAST_SOCIAL_HREF,
  PODCAST_SOCIAL_KEYS,
  SITE_CONTACT_EMAIL,
  SITE_CONTACT_MAILTO,
} from "@/lib/socials";

import { SectionHeading } from "../ui/section-heading";

import { PodcastPlatformLinks } from "./podcast-platform-links";

export async function Contact({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "contact" });

  return (
    <section
      id={PAGE_SECTION_ID.contact}
      className="border-edge bg-surface relative overflow-hidden border-t py-24 md:py-36"
    >
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />

      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        aria-hidden
      >
        <span
          className="contact-backdrop-word font-display text-edge/15 font-extrabold whitespace-nowrap"
          style={{ fontSize: "clamp(5rem, 18vw, 18rem)" }}
        >
          {t("tuneIn")}
        </span>
      </div>

      <div className="scroll-reveal relative mx-auto max-w-6xl px-5 text-center">
        <SectionHeading variant="center" label={t("label")} />

        <h2
          className="font-display text-primary mb-10 leading-tight font-bold"
          style={{ fontSize: "clamp(1.5rem, 5vw, 3rem)" }}
        >
          {t("headingLine1")}
          <br />
          <span className="text-muted font-normal">{t("headingLine2")}</span>
        </h2>

        <a
          href={SITE_CONTACT_MAILTO}
          className="text-accent-text hover-underline mb-14 inline-block font-mono transition-opacity hover:opacity-75"
          style={{
            fontSize: "clamp(1rem, 3vw, 1.5rem)",
            letterSpacing: "0.02em",
          }}
        >
          {SITE_CONTACT_EMAIL}
        </a>

        <PodcastPlatformLinks variant="contact" getLabel={(key) => t(key)} className="mb-6" />

        <hr
          className="border-edge/45 mx-auto mb-8 w-full max-w-[9rem] border-0 border-t sm:max-w-[11rem]"
          aria-hidden
        />

        <div className="text-muted flex flex-wrap items-center justify-center gap-x-0 gap-y-2">
          {PODCAST_SOCIAL_KEYS.map((key, i) => (
            <Fragment key={key}>
              {i > 0 ? (
                <span
                  className="text-edge/60 pointer-events-none px-3 font-mono text-xs select-none sm:px-4"
                  aria-hidden
                >
                  ·
                </span>
              ) : null}
              <a
                href={PODCAST_SOCIAL_HREF[key]}
                target="_blank"
                rel="noopener noreferrer"
                className="hover-underline hover:text-primary font-mono text-xs tracking-widest uppercase transition-colors"
              >
                {t(key)}
              </a>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
