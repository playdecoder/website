import { getTranslations } from "next-intl/server";
import Image from "next/image";
import type { ReactNode } from "react";

import { HOST_PHOTOS } from "@/lib/episode-catalog";
import { PAGE_SECTION_ID } from "@/lib/routes";
import { SHOW_HOST_NAMES } from "@/lib/show";
import { HOST_SOCIAL_X_HREF } from "@/lib/socials";

import { SectionHeading } from "../ui/section-heading";

import { HostRoleRail } from "./host-role-rail";

function HostXLink({
  href,
  variant,
  ariaLabel,
  children,
}: {
  href: string;
  variant: "secondary" | "accent";
  ariaLabel: string;
  children: ReactNode;
}) {
  const palette =
    variant === "secondary"
      ? "border-secondary/30 bg-secondary/[0.05] text-secondary hover:border-secondary/50 hover:bg-secondary/[0.1] focus-visible:ring-secondary/40"
      : "border-accent/30 bg-accent/[0.05] text-accent-text hover:border-accent/50 hover:bg-accent/[0.1] focus-visible:ring-accent/40";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`focus-visible:ring-offset-bg inline-flex w-fit items-center justify-center rounded-sm border px-1.5 py-px font-mono text-[9px] tracking-[0.16em] uppercase transition-[border-color,background-color] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none sm:px-2 sm:py-0.5 sm:text-[10px] sm:tracking-[0.18em] sm:focus-visible:ring-offset-2 ${palette}`}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

function HostSocialsStrip({
  label,
  variant,
  xHref,
  xAriaLabel,
  xLabel,
}: {
  label: string;
  variant: "secondary" | "accent";
  xHref: string;
  xAriaLabel: string;
  xLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted font-mono text-[9px] tracking-[0.2em] sm:text-[10px]">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <HostXLink href={xHref} variant={variant} ariaLabel={xAriaLabel}>
          {xLabel}
        </HostXLink>
      </div>
    </div>
  );
}

export async function Hosts({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "hosts" });

  return (
    <section
      id={PAGE_SECTION_ID.hosts}
      className="border-edge bg-surface relative border-t py-24 md:py-32"
    >
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading variant="rail" label={t("label")} className="mb-16" />

        <div className="grid gap-6 md:grid-cols-2 md:items-stretch md:gap-8">
          <div className="host-card group bg-bg border-edge hover:border-secondary/50 scroll-reveal relative flex h-full flex-col overflow-hidden rounded-sm border transition-colors duration-300">
            <div className="host-card__rail bg-secondary absolute top-0 right-0 left-0 z-10 h-0.5" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 sm:p-8 md:flex-row md:gap-8 md:p-10">
              <div className="host-card__photo host-photo-shell host-photo-shell--tint-secondary border-edge/70 bg-surface group-hover:border-secondary/45 relative mx-auto aspect-[3/4] w-full max-w-[min(100%,17.5rem)] shrink-0 overflow-hidden rounded-sm border shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-300 md:mx-0 md:aspect-auto md:min-h-[17.5rem] md:w-[min(42%,13.75rem)] md:max-w-none md:self-stretch">
                <Image
                  src={HOST_PHOTOS.jan}
                  alt={t("jan.imageAlt", { name: SHOW_HOST_NAMES[0] })}
                  fill
                  sizes="(max-width: 768px) 280px, 220px"
                  className="relative z-0 object-cover object-[66%_22%] transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  quality={92}
                />
              </div>

              <div className="host-card__content flex min-h-0 min-w-0 flex-1 flex-col">
                <HostRoleRail
                  variant="secondary"
                  primary={t("jan.rolePrimary")}
                  secondary={t("jan.roleSecondary")}
                  className="mb-6 md:mb-8"
                />

                <h3 className="font-display text-primary mb-2 text-4xl font-bold md:text-5xl">
                  {t("jan.firstName")}
                </h3>
                <h3 className="font-display text-primary mb-5 text-4xl font-bold md:mb-6 md:text-5xl">
                  {t("jan.lastName")}
                </h3>

                <p className="text-muted min-h-0 flex-1 leading-[1.8]">{t("jan.bio")}</p>

                <div className="border-edge mt-auto flex flex-col gap-3 border-t pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted font-mono text-xs tracking-widest">
                      {t("specialty")}
                    </span>
                    <span className="text-edge mx-1">·</span>
                    <span className="text-secondary font-mono text-xs">
                      {t("jan.specialtyTopics")}
                    </span>
                  </div>
                  <HostSocialsStrip
                    label={t("socials")}
                    variant="secondary"
                    xHref={HOST_SOCIAL_X_HREF.jan}
                    xAriaLabel={t("xProfileAria", { name: SHOW_HOST_NAMES[0] })}
                    xLabel={t("xLinkLabel")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="host-card group bg-bg border-edge hover:border-accent/50 scroll-reveal relative flex h-full flex-col overflow-hidden rounded-sm border transition-colors duration-300">
            <div className="host-card__rail host-card__rail--right bg-accent absolute top-0 right-0 left-0 z-10 h-0.5" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 sm:p-8 md:flex-row-reverse md:gap-8 md:p-10">
              <div className="host-card__photo host-photo-shell host-photo-shell--tint-accent border-edge/70 bg-surface group-hover:border-accent/45 relative mx-auto aspect-[3/4] w-full max-w-[min(100%,17.5rem)] shrink-0 overflow-hidden rounded-sm border shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-300 md:mx-0 md:aspect-auto md:min-h-[17.5rem] md:w-[min(42%,13.75rem)] md:max-w-none md:self-stretch">
                <Image
                  src={HOST_PHOTOS.martin}
                  alt={t("martin.imageAlt", { name: SHOW_HOST_NAMES[1] })}
                  fill
                  sizes="(max-width: 768px) 280px, 220px"
                  className="relative z-0 origin-center scale-[1.08] object-cover object-[69%_22%] transition-transform duration-700 ease-out group-hover:scale-[1.11]"
                  quality={92}
                />
              </div>

              <div className="host-card__content flex min-h-0 min-w-0 flex-1 flex-col">
                <HostRoleRail
                  variant="accent"
                  primary={t("martin.rolePrimary")}
                  secondary={t("martin.roleSecondary")}
                  className="mb-6 md:mb-8"
                />

                <h3 className="font-display text-primary mb-2 text-4xl font-bold md:text-5xl">
                  {t("martin.firstName")}
                </h3>
                <h3 className="font-display text-primary mb-5 text-4xl font-bold md:mb-6 md:text-5xl">
                  {t("martin.lastName")}
                </h3>

                <p className="text-muted min-h-0 flex-1 leading-[1.8]">{t("martin.bio")}</p>

                <div className="border-edge mt-auto flex flex-col gap-3 border-t pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted font-mono text-xs tracking-widest">
                      {t("specialty")}
                    </span>
                    <span className="text-edge mx-1">·</span>
                    <span className="text-accent-text font-mono text-xs">
                      {t("martin.specialtyTopics")}
                    </span>
                  </div>
                  <HostSocialsStrip
                    label={t("socials")}
                    variant="accent"
                    xHref={HOST_SOCIAL_X_HREF.martin}
                    xAriaLabel={t("xProfileAria", { name: SHOW_HOST_NAMES[1] })}
                    xLabel={t("xLinkLabel")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
