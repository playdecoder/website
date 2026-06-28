/** Max topic pills on episode cards (homepage + archive grid). */
export const EPISODE_CARD_TAG_LIMIT = 3;

export function splitEpisodeCardTags(tags: readonly string[], limit = EPISODE_CARD_TAG_LIMIT) {
  const visible = tags.slice(0, limit);
  return {
    visible,
    overflowCount: Math.max(0, tags.length - visible.length),
  };
}
