import type { ReactNode } from "react";

import { parseEpisodeDescriptionMarkup } from "./episode-description-markup";

function renderRich(text: string, keyPrefix: string): ReactNode[] {
  return parseEpisodeDescriptionMarkup(text).map((seg, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (seg.kind === "text") {
      return <span key={key}>{seg.text}</span>;
    }
    const Tag = seg.kind === "bold" ? "strong" : "em";
    const childKey = seg.kind === "bold" ? `${key}-b` : `${key}-i`;
    return <Tag key={key}>{renderRich(seg.text, childKey)}</Tag>;
  });
}

/** Renders allowed inline markup for on-site episode blurbs only. */
export function EpisodeDescriptionRich({ text }: { text: string }): ReactNode {
  return renderRich(text, "ep-desc");
}
