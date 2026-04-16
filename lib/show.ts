export const SHOW_HOST_NAMES = ["Jan Tomášik", "Martin Pernica"] as const;

export function showHostsEnglishAnd(): string {
  return `${SHOW_HOST_NAMES[0]} and ${SHOW_HOST_NAMES[1]}`;
}

export function showHostsAmpersand(): string {
  return `${SHOW_HOST_NAMES[0]} & ${SHOW_HOST_NAMES[1]}`;
}

export function showTaglineEn(): string {
  return `A podcast where game design meets technology. Honest conversations with ${showHostsEnglishAnd()} — once a month.`;
}

export function showTaglineCs(): string {
  return "Podcast, kde se herní design potkává s technologiemi. Upřímné rozhovory s Janem Tomášikem a Martinem Pernicou. Jednou měsíčně.";
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
