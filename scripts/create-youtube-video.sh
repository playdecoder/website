#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Create a YouTube-ready MP4 from episode audio and the square Dekodér logo.

Usage:
  create-youtube-video.sh [options] <mp3>

Options:
  -o, --output PATH      Output MP4 path (default: <mp3-dir>/<basename>.mp4)
      --logo PATH        Logo image (default: public/logo/square-podcast-cover.jpg)
      --size WxH         Video size (default: 1920x1080)
      --square           Shortcut for 1080x1080 output
      --background HEX   Letterbox/pillarbox color without # (default: 0B0F14)
      --audio-bitrate N  AAC bitrate, e.g. 192k (default: 192k)
  -y, --force            Overwrite output file if it exists
  -h, --help             Show this help

The logo is centered on a static frame for the full audio duration.

Examples:
  ./scripts/create-youtube-video.sh public/data/episodes/ep02.mp3
  ./scripts/create-youtube-video.sh -o out/ep02-youtube.mp4 public/data/episodes/ep02.mp3
  ./scripts/create-youtube-video.sh --square public/data/episodes/ep02.mp3
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_LOGO="$REPO_ROOT/public/logo/square-podcast-cover.jpg"

OUTPUT=""
LOGO="$DEFAULT_LOGO"
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
    --logo)
      LOGO="$2"
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

if [[ ! -f "$MP3" ]]; then
  echo "MP3 not found: $MP3" >&2
  exit 1
fi

if [[ ! -f "$LOGO" ]]; then
  echo "Logo not found: $LOGO" >&2
  echo "Generate it with: node scripts/generate-fallback-episode-cover.mjs" >&2
  exit 1
fi

MP3_ABS="$(cd "$(dirname "$MP3")" && pwd)/$(basename "$MP3")"
MP3_BASENAME="$(basename "$MP3_ABS")"
MP3_STEM="${MP3_BASENAME%.mp3}"

if [[ "$MP3_BASENAME" == "$MP3_STEM" ]]; then
  echo "Expected an .mp3 file: $MP3" >&2
  exit 1
fi

if [[ -z "$OUTPUT" ]]; then
  OUTPUT="$(dirname "$MP3_ABS")/${MP3_STEM}.mp4"
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

# Fit the square logo inside the frame, then pad to the target canvas.
VF="scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x${BACKGROUND},format=yuv420p"

FFMPEG_ARGS=(
  -hide_banner
  -loglevel error
  -stats
  -y
  -loop 1
  -framerate 1
  -i "$LOGO"
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
echo "Logo:       $LOGO"
echo "Output:     $OUTPUT"
echo "Video:      ${WIDTH}x${HEIGHT}"
echo "Background: #${BACKGROUND}"
echo "Duration:   ${DURATION_INT}s (~$(( DURATION_INT / 60 ))m)"
echo
echo "Encoding..."

ffmpeg "${FFMPEG_ARGS[@]}"

echo
echo "Done: $OUTPUT"
