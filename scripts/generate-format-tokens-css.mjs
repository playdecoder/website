#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokensPath = join(repoRoot, "lib/brand/format-tokens.json");
const outputPath = join(repoRoot, "app/format-tokens.generated.css");

const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
const formats = Object.keys(tokens);

function themeVars(format, theme) {
  const entry = tokens[format][theme];
  return [
    `  --format-${format}: ${entry.color.toLowerCase()};`,
    `  --format-${format}-text: ${entry.text.toLowerCase()};`,
    `  --format-${format}-glow: ${entry.glow};`,
  ];
}

function legacyAliases(format) {
  return [
    `  --${format}: var(--format-${format});`,
    `  --${format}-text: var(--format-${format}-text);`,
    `  --${format}-glow: var(--format-${format}-glow);`,
  ];
}

const lines = [
  "/* AUTO-GENERATED from lib/brand/format-tokens.json — do not edit */",
  "/* Regenerate: bun run generate:format-tokens-css */",
  "",
  ":root {",
  ...formats.flatMap((format) => themeVars(format, "light")),
  ...formats.flatMap((format) => legacyAliases(format)),
  "}",
  "",
  ".dark {",
  ...formats.flatMap((format) => themeVars(format, "dark")),
  "}",
  "",
];

for (const format of formats) {
  lines.push(
    `[data-episode-format="${format}"],`,
    `.episode-format-badge--${format},`,
    `.episode-format-rail--${format} {`,
    `  --format-color: var(--format-${format});`,
    `  --format-text: var(--format-${format}-text);`,
    `  --format-glow: var(--format-${format}-glow);`,
    "}",
    "",
  );
}

lines.push(
  "[data-episode-format] {",
  "  --accent: var(--format-color);",
  "  --accent-text: color-mix(in srgb, var(--format-color) 88%, var(--primary));",
  "  --secondary: color-mix(in srgb, var(--format-color) 34%, var(--brand-primary));",
  "  --waveform-secondary: var(--format-color);",
  "  --waveform-accent: color-mix(in srgb, var(--format-color) 92%, var(--primary));",
  "  --waveform-accent-glow: var(--format-glow);",
  "}",
  "",
  ".episode-format-badge[class*=\"episode-format-badge--\"] {",
  "  background: color-mix(in srgb, var(--format-color) 14%, transparent);",
  "  color: color-mix(in srgb, var(--format-color) 88%, var(--primary));",
  "  border-color: color-mix(in srgb, var(--format-color) 32%, transparent);",
  "}",
  "",
  ".episode-format-rail[class*=\"episode-format-rail--\"] {",
  "  background-color: var(--format-color);",
  "}",
  "",
);

writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log("Wrote", outputPath);
