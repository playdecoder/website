import { debounce, parseAsBoolean, parseAsNativeArrayOf, parseAsString } from "nuqs";

export const episodesArchiveSearchParams = {
  q: parseAsString.withDefault("").withOptions({ limitUrlUpdates: debounce(320) }),
  st: parseAsBoolean.withDefault(true),
  sd: parseAsBoolean.withDefault(true),
  sc: parseAsBoolean.withDefault(true),
  tags: parseAsNativeArrayOf(parseAsString).withDefault([]),
};
