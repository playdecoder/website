#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Create a YouTube-ready MP4 from episode audio and a static keyart frame.

Usage:
  create-youtube-video.sh [options] <mp3>

Options:
  -o, --output PATH      Output MP4 path (default: output/<ep>/youtube/<ep>-<theme>.mp4)
      --keyart PATH      Static frame image (PNG/JPG)
      --logo PATH        Alias for --keyart (legacy)
      --episode ID       Resolve keyart + default output from episode id
      --theme THEME      dark | light (default: dark)
      --size WxH         Video size (default: 1920x1080)
      --square           Shortcut for 1080x1080 output
      --background HEX   Letterbox/pillarbox color without # (default: 0B0F14)
      --audio-bitrate N  AAC bitrate, e.g. 192k (default: 192k)
  -y, --force            Overwrite output file if it exists
  -h, --help             Show this help

Generate keyart first:
  node scripts/generate-social-post.mjs --episode EP02 --layout youtube-keyart

The keyart is shown as a static frame for the full audio duration.
When the image matches the target video size, it is used without scaling.

Output:
  output/<ep>/youtube/<ep>-<theme>.mp4   e.g. output/ep02/youtube/ep02-light.mp4

Examples:
  ./scripts/create-youtube-video.sh --episode EP02 --theme light public/data/episodes/ep02.mp3
  ./scripts/create-youtube-video.sh --keyart output/ep02/social/youtube-keyart-dark.png ep02.mp3
  ./scripts/create-youtube-video.sh -o out/ep02-youtube.mp4 --episode EP02 ep02.mp3
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

resolve_episode_path() {
  local episode_id="$1"
  local theme="$2"
  local kind="$3"
  node --input-type=module -e "
    import { keyartOutputPath, youtubeVideoOutputPath } from './scripts/lib/episode-output.mjs';
    const repoRoot = '${REPO_ROOT}';
    const id = '${episode_id}'.toUpperCase();
    const theme = '${theme}';
    if ('${kind}' === 'keyart') {
      process.stdout.write(keyartOutputPath(repoRoot, id, theme));
    } else {
      process.stdout.write(youtubeVideoOutputPath(repoRoot, id, theme));
    }
  "
}

infer_episode_from_mp3_stem() {
  local stem="$1"
  node -e "
    const stem = '${stem}'.toLowerCase();
    if (/^ep[0-9]+\$/.test(stem)) {
      process.stdout.write(stem.toUpperCase());
    }
  "
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FALLBACK_KEYART="$REPO_ROOT/public/logo/square-podcast-cover.jpg"

OUTPUT=""
KEYART=""
EPISODE=""
THEME="dark"
WIDTH=1920
HEIGHT=1080
BACKGROUND="0B0F14"
AUDIO_BITRATE="192k"
FORCE=0
MP3=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o | --output)
      OUTPUT="$2"
      shift 2
      ;;
    --keyart | --logo)
      KEYART="$2"
      shift 2
      ;;
    --episode)
      EPISODE="$2"
      shift 2
      ;;
    --theme)
      THEME="$2"
      shift 2
      ;;
    --size)
      if [[ "$2" != *x* ]]; then
        echo "Invalid --size (expected WxH): $2" >&2
        exit 1
      fi
      WIDTH="${2%x*}"
      HEIGHT="${2#*x}"
      shift 2
      ;;
    --square)
      WIDTH=1080
      HEIGHT=1080
      shift
      ;;
    --background)
      BACKGROUND="${2//#/}"
      shift 2
      ;;
    --audio-bitrate)
      AUDIO_BITRATE="$2"
      shift 2
      ;;
    -y | --force)
      FORCE=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "$MP3" ]]; then
        echo "Unexpected extra argument: $1" >&2
        usage >&2
        exit 1
      fi
      MP3="$1"
      shift
      ;;
  esac
done

if [[ -z "$MP3" ]]; then
  echo "Missing required MP3 path." >&2
  usage >&2
  exit 1
fi

require_cmd ffmpeg
require_cmd ffprobe
require_cmd node

case "$THEME" in
  dark | light) ;;
  *)
    echo "Invalid --theme (expected dark or light): $THEME" >&2
    exit 1
    ;;
esac

if [[ ! -f "$MP3" ]]; then
  echo "MP3 not found: $MP3" >&2
  exit 1
fi

MP3_ABS="$(cd "$(dirname "$MP3")" && pwd)/$(basename "$MP3")"
MP3_BASENAME="$(basename "$MP3_ABS")"
MP3_STEM="${MP3_BASENAME%.mp3}"

if [[ "$MP3_BASENAME" == "$MP3_STEM" ]]; then
  echo "Expected an .mp3 file: $MP3" >&2
  exit 1
fi

if [[ -z "$EPISODE" ]]; then
  EPISODE="$(infer_episode_from_mp3_stem "$MP3_STEM")"
fi

if [[ -z "$KEYART" && -n "$EPISODE" ]]; then
  KEYART="$(resolve_episode_path "$EPISODE" "$THEME" keyart)"
fi

if [[ -z "$KEYART" ]]; then
  KEYART="$FALLBACK_KEYART"
fi

if [[ ! -f "$KEYART" ]]; then
  echo "Keyart not found: $KEYART" >&2
  if [[ -n "$EPISODE" ]]; then
    echo "Generate it with: node scripts/generate-social-post.mjs --episode ${EPISODE} --layout youtube-keyart --theme ${THEME}" >&2
  else
    echo "Generate it with: node scripts/generate-social-post.mjs --episode EP02 --layout youtube-keyart" >&2
  fi
  exit 1
fi

if [[ -z "$OUTPUT" ]]; then
  if [[ -n "$EPISODE" ]]; then
    OUTPUT="$(resolve_episode_path "$EPISODE" "$THEME" output)"
  else
    OUTPUT="$(dirname "$MP3_ABS")/${MP3_STEM}.mp4"
  fi
else
  if [[ -d "$OUTPUT" ]]; then
    OUTPUT="$(cd "$OUTPUT" && pwd)/${MP3_STEM}.mp4"
  else
    OUTPUT="$(cd "$(dirname "$OUTPUT")" && pwd)/$(basename "$OUTPUT")"
    if [[ "$(basename "$OUTPUT")" != *.mp4 ]]; then
      OUTPUT="${OUTPUT}.mp4"
    fi
  fi
fi

mkdir -p "$(dirname "$OUTPUT")"

if [[ -f "$OUTPUT" && "$FORCE" -ne 1 ]]; then
  echo "Output already exists: $OUTPUT" >&2
  echo "Use -y to overwrite." >&2
  exit 1
fi

DURATION="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MP3_ABS")"
DURATION_INT="${DURATION%.*}"

KEYART_W="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$KEYART")"
KEYART_H="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$KEYART")"

if [[ "$KEYART_W" == "$WIDTH" && "$KEYART_H" == "$HEIGHT" ]]; then
  VF="format=yuv420p"
else
  VF="scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x${BACKGROUND},format=yuv420p"
fi

FFMPEG_ARGS=(
  -hide_banner
  -loglevel error
  -stats
  -y
  -loop 1
  -framerate 1
  -i "$KEYART"
  -i "$MP3_ABS"
  -vf "$VF"
  -c:v libx264
  -preset medium
  -tune stillimage
  -crf 18
  -c:a aac
  -b:a "$AUDIO_BITRATE"
  -movflags +faststart
  -shortest
  "$OUTPUT"
)

echo "Input:      $MP3_ABS"
echo "Keyart:     $KEYART (${KEYART_W}x${KEYART_H})"
echo "Output:     $OUTPUT"
echo "Video:      ${WIDTH}x${HEIGHT}"
echo "Background: #${BACKGROUND}"
echo "Duration:   ${DURATION_INT}s (~$(( DURATION_INT / 60 ))m)"
echo
echo "Encoding..."

ffmpeg "${FFMPEG_ARGS[@]}"

echo
echo "Done: $OUTPUT"
