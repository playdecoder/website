/** Decoder show hosts — single source for RSS, metadata, JSON-LD, and English taglines. */

export const SHOW_HOST_NAMES = ["Jan Tomášik", "Martin Pernica"] as const;

export function showHostsEnglishAnd(): string {
  return `${SHOW_HOST_NAMES[0]} and ${SHOW_HOST_NAMES[1]}`;
}

export function showHostsAmpersand(): string {
  return `${SHOW_HOST_NAMES[0]} & ${SHOW_HOST_NAMES[1]}`;
}

export function showTaglineEn(): string {
  return `A podcast where game design meets technology. Deep conversations with ${showHostsEnglishAnd()} — once a month.`;
}

export function showHostsForMetadata(): { name: string }[] {
  return SHOW_HOST_NAMES.map((name) => ({ name }));
}

export function showHostsForOpenGraphArticle(): string[] {
  return [...SHOW_HOST_NAMES];
}

export function showHostsSchemaPersons(): { "@type": "Person"; name: string }[] {
  return SHOW_HOST_NAMES.map((name) => ({ "@type": "Person" as const, name }));
}
