export type EpisodeDescriptionSegment =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string };

const DELIMITED_RULES: ReadonlyArray<readonly [delimiter: string, kind: "bold" | "italic"]> = [
  ["**", "bold"],
  ["__", "bold"],
  ["*", "italic"],
  ["_", "italic"],
];

function tryDelimitedRegion(
  source: string,
  i: number,
  delimiter: string,
): { inner: string; next: number } | null {
  if (!source.startsWith(delimiter, i)) {
    return null;
  }
  const close = source.indexOf(delimiter, i + delimiter.length);
  if (close === -1 || close <= i + delimiter.length) {
    return null;
  }
  return { inner: source.slice(i + delimiter.length, close), next: close + delimiter.length };
}

export function parseEpisodeDescriptionMarkup(source: string): EpisodeDescriptionSegment[] {
  const out: EpisodeDescriptionSegment[] = [];
  let i = 0;

  function pushText(chunk: string) {
    if (!chunk) {
      return;
    }
    const last = out[out.length - 1];
    if (last?.kind === "text") {
      last.text += chunk;
    } else {
      out.push({ kind: "text", text: chunk });
    }
  }

  while (i < source.length) {
    let matched: { kind: "bold" | "italic"; text: string; next: number } | null = null;
    for (const [delimiter, kind] of DELIMITED_RULES) {
      const hit = tryDelimitedRegion(source, i, delimiter);
      if (hit) {
        matched = { kind, text: hit.inner, next: hit.next };
        break;
      }
    }
    if (matched) {
      out.push({ kind: matched.kind, text: matched.text });
      i = matched.next;
      continue;
    }

    let j = i + 1;
    while (j < source.length) {
      const c = source[j];
      if (source.startsWith("**", j) || source.startsWith("__", j) || c === "*" || c === "_") {
        break;
      }
      j++;
    }
    pushText(source.slice(i, j));
    i = j;
  }

  return out;
}

function segmentPlain(seg: EpisodeDescriptionSegment): string {
  if (seg.kind === "text") {
    return seg.text;
  }
  return plainEpisodeDescription(seg.text);
}

export function plainEpisodeDescription(source: string): string {
  return parseEpisodeDescriptionMarkup(source).map(segmentPlain).join("");
}
