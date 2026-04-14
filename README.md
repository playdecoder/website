# Play Decoder — website

Marketing and listening experience for **Play Decoder**, a podcast about game design and technology (hosts: Jan Tomášik & Martin Pernica). Built with **Next.js** (App Router), **React 19**, **Tailwind CSS v4**, and **next-intl** for **Czech** (default) and **English** (`localePrefix: as-needed`).

Episode metadata and links live in [`data/episodes.json`](data/episodes.json). The site exposes RSS (`/rss.xml`), sitemap, and per-episode listen pages under `/listen/[episodeId]`.

## Requirements

- [Bun](https://bun.sh) (lockfile: `bun.lock`)

## Commands

```bash
bun install
bun dev      # Next.js dev server (Turbopack)
bun build && bun start   # production
bun lint
```

## Configuration

- **`NEXT_PUBLIC_SITE_URL`** — public site origin (defaults to `https://play-decoder.com` in code). Use your dev or preview URL locally if you care about absolute links in metadata or feeds.

Deployment uses Next **`output: "standalone"`** for container-friendly builds.
