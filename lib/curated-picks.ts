import { episodes, type CuratedPickKey, type Episode } from "@/lib/episode-catalog";

const CURATED_PICK_ORDER: CuratedPickKey[] = ["founders", "designers", "builders"];

export interface CuratedPick {
  key: CuratedPickKey;
  episode: Episode;
}

export function getCuratedPicks(): CuratedPick[] {
  return CURATED_PICK_ORDER.map((key) => {
    const episode = episodes.find((candidate) => candidate.curatedAs?.includes(key));
    return episode ? { key, episode } : null;
  }).filter((pick): pick is CuratedPick => pick !== null);
}

export function hasCuratedPicks(): boolean {
  return getCuratedPicks().length === CURATED_PICK_ORDER.length;
}

export function curatedPickTopics() {
  return getCuratedPicks().flatMap((pick) => pick.episode.tags);
}
