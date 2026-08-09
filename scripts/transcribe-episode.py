#!/usr/bin/env python3
"""Transcribe a podcast episode MP3 with local Whisper (word timestamps)."""

from __future__ import annotations

import argparse
import json
import platform
import sys
from pathlib import Path


MLX_MODELS = {
    "tiny": "mlx-community/whisper-tiny",
    "base": "mlx-community/whisper-base",
    "small": "mlx-community/whisper-small",
    "medium": "mlx-community/whisper-medium",
    "large-v3": "mlx-community/whisper-large-v3-mlx",
    "large-v3-turbo": "mlx-community/whisper-large-v3-turbo",
    "turbo": "mlx-community/whisper-large-v3-turbo",
}


def default_backend() -> str:
    return "mlx" if platform.system() == "Darwin" and platform.machine() == "arm64" else "faster-whisper"


def default_model(backend: str) -> str:
    return "large-v3-turbo" if backend == "mlx" else "large-v3"


def resolve_mlx_model(model_name: str) -> str:
    if model_name.startswith("mlx-community/"):
        return model_name
    return MLX_MODELS.get(model_name, model_name)


def round_ts(value: float) -> float:
    return round(value, 2)


def format_word(text: str) -> str:
    return text if text.startswith(" ") else f" {text}"


def segment_text_from_words(words: list[dict[str, object]]) -> str:
    return "".join(str(word["text"]) for word in words).strip()


def build_payload(
    *,
    source: str,
    language: str,
    segments_out: list[dict[str, object]],
) -> dict[str, object]:
    return {
        "source": source,
        "language": language,
        "segments": segments_out,
    }


def write_payload(output_path: Path, payload: dict[str, object]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=1)
        handle.write("\n")


def transcribe_mlx(
    audio_path: Path,
    output_path: Path,
    *,
    source: str,
    language: str,
    model_name: str,
) -> None:
    try:
        import mlx_whisper
    except ImportError as exc:
        raise SystemExit(
            "Missing mlx-whisper. Install with:\n"
            "  python3 -m pip install mlx-whisper"
        ) from exc

    mlx_model = resolve_mlx_model(model_name)
    print(f"Loading MLX model {mlx_model!r} on Apple GPU...", flush=True)
    print(f"Transcribing {audio_path} (language={language})...", flush=True)

    # condition_on_previous_text=True often loops on the Dekodér jingle
    # ("Dekodér" × N) and drops the real spoken intro. initial_prompt steers
    # the first window toward the shared tagline without forcing later text.
    result = mlx_whisper.transcribe(
        str(audio_path),
        path_or_hf_repo=mlx_model,
        language=language,
        word_timestamps=True,
        verbose=False,
        condition_on_previous_text=False,
        initial_prompt="Dekodér. Hry, technologie, zákulisí.",
    )

    segments_out: list[dict[str, object]] = []
    for index, segment in enumerate(result.get("segments", []), start=1):
        words_out: list[dict[str, object]] = []
        for word in segment.get("words") or []:
            words_out.append(
                {
                    "start": round_ts(float(word["start"])),
                    "end": round_ts(float(word["end"])),
                    "text": format_word(str(word["word"])),
                }
            )

        text = segment_text_from_words(words_out) if words_out else str(segment.get("text", "")).strip()
        segments_out.append(
            {
                "start": round_ts(float(segment["start"])),
                "end": round_ts(float(segment["end"])),
                "text": text,
                "words": words_out,
            }
        )

        if index % 100 == 0:
            print(f"  {index} segments ({round_ts(float(segment['end']))}s)", flush=True)

    payload = build_payload(
        source=source,
        language=str(result.get("language") or language),
        segments_out=segments_out,
    )
    write_payload(output_path, payload)
    print(
        f"Wrote {output_path} ({len(segments_out)} segments, language={payload['language']})",
        flush=True,
    )


def transcribe_faster_whisper(
    audio_path: Path,
    output_path: Path,
    *,
    source: str,
    language: str,
    model_name: str,
    device: str,
    compute_type: str,
) -> None:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise SystemExit(
            "Missing faster-whisper. Install with:\n"
            "  python3 -m pip install faster-whisper"
        ) from exc

    print(f"Loading model {model_name!r} ({device}, {compute_type})...", flush=True)
    model = WhisperModel(model_name, device=device, compute_type=compute_type)

    print(f"Transcribing {audio_path} (language={language})...", flush=True)
    segments_iter, info = model.transcribe(
        str(audio_path),
        language=language,
        word_timestamps=True,
        vad_filter=True,
        condition_on_previous_text=False,
        initial_prompt="Dekodér. Hry, technologie, zákulisí.",
    )

    segments_out: list[dict[str, object]] = []
    for index, segment in enumerate(segments_iter, start=1):
        words_out: list[dict[str, object]] = []
        if segment.words:
            for word in segment.words:
                words_out.append(
                    {
                        "start": round_ts(word.start),
                        "end": round_ts(word.end),
                        "text": format_word(word.word),
                    }
                )

        text = segment_text_from_words(words_out) if words_out else segment.text.strip()
        segments_out.append(
            {
                "start": round_ts(segment.start),
                "end": round_ts(segment.end),
                "text": text,
                "words": words_out,
            }
        )

        if index % 100 == 0:
            print(f"  {index} segments ({round_ts(segment.end)}s)", flush=True)

    payload = build_payload(
        source=source,
        language=info.language or language,
        segments_out=segments_out,
    )
    write_payload(output_path, payload)
    print(
        f"Wrote {output_path} ({len(segments_out)} segments, language={payload['language']})",
        flush=True,
    )


def main() -> None:
    backend = default_backend()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path, help="Input MP3 path")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output JSON path (default: <audio>.transcript.json)",
    )
    parser.add_argument("-l", "--language", default="cs", help="Language code")
    parser.add_argument(
        "--source",
        help="Value for the JSON source field (default: public/data/episodes/<filename>)",
    )
    parser.add_argument(
        "-m",
        "--model",
        default=None,
        help="Whisper model name (default: large-v3-turbo on MLX, large-v3 on CPU)",
    )
    parser.add_argument(
        "--backend",
        default=backend,
        choices=("mlx", "faster-whisper"),
        help=f"Inference backend (default: {backend})",
    )
    parser.add_argument(
        "--device",
        default="cpu",
        choices=("cpu", "cuda", "auto"),
        help="Device for faster-whisper only",
    )
    parser.add_argument(
        "--compute-type",
        default="int8",
        help="Compute type for faster-whisper only (e.g. int8, float16, default)",
    )
    args = parser.parse_args()

    model_name = args.model or default_model(args.backend)

    audio_path = args.audio.expanduser().resolve()
    if not audio_path.is_file():
        raise SystemExit(f"Audio file not found: {audio_path}")

    output_path = (
        args.output.expanduser().resolve()
        if args.output
        else audio_path.with_name(f"{audio_path.stem}.transcript.json")
    )
    source = args.source or f"public/data/episodes/{audio_path.name}"

    if args.backend == "mlx":
        transcribe_mlx(
            audio_path,
            output_path,
            source=source,
            language=args.language,
            model_name=model_name,
        )
        return

    transcribe_faster_whisper(
        audio_path,
        output_path,
        source=source,
        language=args.language,
        model_name=model_name,
        device=args.device,
        compute_type=args.compute_type,
    )


if __name__ == "__main__":
    main()
