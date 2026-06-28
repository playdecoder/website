export type ArtFocalPoint = string | { x: number; y: number };

const SHARP_TO_CSS: Record<string, string> = {
  centre: "center",
  center: "center",
  top: "center top",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
  "left top": "left top",
  "right top": "right top",
  "left bottom": "left bottom",
  "right bottom": "right bottom",
  north: "center top",
  south: "center bottom",
  west: "left center",
  east: "right center",
  northwest: "left top",
  northeast: "right top",
  southwest: "left bottom",
  southeast: "right bottom",
};

/** Maps episode artFocalPoint to a CSS `object-position` value. Defaults to center. */
export function artFocalPointToObjectPosition(focal?: ArtFocalPoint): string {
  if (!focal) {
    return "center";
  }

  if (typeof focal === "string") {
    return SHARP_TO_CSS[focal.toLowerCase()] ?? "center";
  }

  const x = Math.min(1, Math.max(0, focal.x));
  const y = Math.min(1, Math.max(0, focal.y));
  return `${x * 100}% ${y * 100}%`;
}
