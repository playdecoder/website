import { splitEpisodeCardTags } from "@/lib/episode/card-tags";
import { cn } from "@/lib/ui/cn";

import { TopicLinkChip } from "./topic-link-chip";

interface EpisodeCardTopicChipsProps {
  tags: readonly string[];
  locale: string;
  limit?: number;
  chipClassName?: string;
  overflowClassName?: string;
}

export function EpisodeCardTopicChips({
  tags,
  locale,
  limit,
  chipClassName,
  overflowClassName,
}: EpisodeCardTopicChipsProps) {
  const { visible, overflowCount } = splitEpisodeCardTags(tags, limit);

  return (
    <>
      {visible.map((tag) => (
        <TopicLinkChip key={tag} tag={tag} locale={locale} className={chipClassName} />
      ))}
      {overflowCount > 0 ? (
        <span
          className={cn("tag-pill shrink-0", overflowClassName)}
          title={`+${overflowCount}`}
          aria-hidden
        >
          +{overflowCount}
        </span>
      ) : null}
    </>
  );
}
