import { createParser } from "nuqs";

export const LISTEN_AUTOPLAY_QUERY_KEY = "play";
export const LISTEN_AUTOPLAY_SERIALIZED = "1";

export const parseAsListenAutoplay = createParser({
  parse: (value) => (value === "1" || value === "true" ? true : null),
  serialize: () => LISTEN_AUTOPLAY_SERIALIZED,
}).withOptions({ history: "replace" });
