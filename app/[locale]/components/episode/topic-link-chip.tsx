import { Link } from "@/i18n/navigation";
import { topicSlug } from "@/lib/episode-topics";
import { linkLocale } from "@/lib/link-locale";
import { topicPath } from "@/lib/routes";

interface TopicLinkChipProps {
  tag: string;
  locale: string;
  className?: string;
}

export function TopicLinkChip({ tag, locale, className }: TopicLinkChipProps) {
  return (
    <Link
      href={topicPath(topicSlug(tag))}
      locale={linkLocale(locale)}
      className={
        className ?? "tag-pill hover:border-secondary/45 hover:text-primary transition-colors"
      }
    >
      {tag}
    </Link>
  );
}
