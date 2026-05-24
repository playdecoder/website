#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Transcribe a podcast MP3 to transcript JSON (Whisper, word timestamps).

Usage:
  transcribe-episode.sh [options] <mp3>

Options:
  -o, --output-dir DIR   Directory for the output JSON (default: same as input MP3)
  -l, --language CODE    Language code (default: cs)
  -m, --model MODEL      Whisper model (default: large-v3-turbo on Apple Silicon, large-v3 elsewhere)
      --backend NAME     mlx or faster-whisper (auto-detected on Apple Silicon)
      --source PATH      Value for the JSON "source" field (default: repo-relative MP3 path)
      --setup            Create/update the Python venv before transcribing
  -h, --help             Show this help

Output:
  <output-dir>/<basename>.transcript.json

Examples:
  ./scripts/transcribe-episode.sh public/data/episodes/ep03.mp3
  ./scripts/transcribe-episode.sh -o public/data/episodes ep03.mp3
  ./scripts/transcribe-episode.sh -l cs -m large-v3 path/to/episode.mp3
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv-transcribe"
PYTHON="$VENV_DIR/bin/python"
PIP="$VENV_DIR/bin/pip"
TRANSCRIBE_PY="$SCRIPT_DIR/transcribe-episode.py"

OUTPUT_DIR=""
LANGUAGE="cs"
MODEL=""
BACKEND=""
SOURCE=""
SETUP=0
MP3=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o | --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -l | --language)
      LANGUAGE="$2"
      shift 2
      ;;
    -m | --model)
      MODEL="$2"
      shift 2
      ;;
    --backend)
      BACKEND="$2"
      shift 2
      ;;
    --source)
      SOURCE="$2"
      shift 2
      ;;
    --setup)
      SETUP=1
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

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="$(dirname "$MP3_ABS")"
fi

mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR_ABS="$(cd "$OUTPUT_DIR" && pwd)"
OUTPUT_JSON="$OUTPUT_DIR_ABS/${MP3_STEM}.transcript.json"

if [[ -z "$SOURCE" ]]; then
  case "$MP3_ABS" in
    "$REPO_ROOT"/*)
      SOURCE="${MP3_ABS#$REPO_ROOT/}"
      ;;
    *)
      SOURCE="public/data/episodes/$MP3_BASENAME"
      ;;
  esac
fi

ensure_venv() {
  if [[ ! -x "$PYTHON" ]]; then
    echo "Creating transcription venv at $VENV_DIR ..."
    python3 -m venv "$VENV_DIR"
    SETUP=1
  fi

  if [[ "$SETUP" -eq 1 ]]; then
    echo "Installing transcription dependencies ..."
    "$PIP" install --upgrade pip
    "$PIP" install -r "$SCRIPT_DIR/requirements-transcribe.txt"
  fi
}

ensure_venv

CMD=(
  "$PYTHON" "$TRANSCRIBE_PY"
  "$MP3_ABS"
  -o "$OUTPUT_JSON"
  -l "$LANGUAGE"
  --source "$SOURCE"
)

if [[ -n "$MODEL" ]]; then
  CMD+=(-m "$MODEL")
fi

if [[ -n "$BACKEND" ]]; then
  CMD+=(--backend "$BACKEND")
fi

echo "Input:  $MP3_ABS"
echo "Output: $OUTPUT_JSON"
echo "Source: $SOURCE"
echo "Language: $LANGUAGE"
echo

"${CMD[@]}"

echo
echo "Done: $OUTPUT_JSON"
