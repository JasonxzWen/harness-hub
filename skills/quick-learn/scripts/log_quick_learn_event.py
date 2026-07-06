#!/usr/bin/env python3
"""Log a quick-learn learning project event and update local state."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


EVENTS = {
    "contract",
    "source",
    "source-pack",
    "source-review",
    "diagnosis",
    "syllabus",
    "syllabus-review",
    "lesson",
    "question",
    "answer",
    "teach-back",
    "assessment",
    "stage-review",
    "review",
    "summary",
}

REVIEW_EVENTS = {"source-review", "syllabus-review", "stage-review", "review"}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    if slug:
        return slug
    digest = hashlib.sha1(value.strip().encode("utf-8")).hexdigest()[:8]
    return f"topic-{digest}"


def parse_metadata(values: list[str]) -> dict[str, str]:
    metadata: dict[str, str] = {}
    for value in values:
        if "=" not in value:
            raise SystemExit(f"metadata must be key=value, got: {value}")
        key, raw = value.split("=", 1)
        key = key.strip()
        if not key:
            raise SystemExit(f"metadata key cannot be empty: {value}")
        metadata[key] = raw.strip()
    return metadata


def read_json(path: Path, fallback: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def append_jsonl(path: Path, payload: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")


def update_project(path: Path, event: dict[str, Any]) -> dict[str, Any]:
    now = event["timestamp"]
    state = read_json(
        path,
        {
            "topic": event["topic"],
            "topic_slug": event["topic_slug"],
            "created_at": now,
            "updated_at": now,
            "level": None,
            "target": None,
            "current_module": None,
            "event_counts": {},
            "concepts": {},
            "last_summary": None,
        },
    )

    state["updated_at"] = now
    if event.get("level"):
        state["level"] = event["level"]
    if event.get("target"):
        state["target"] = event["target"]
    if event.get("module"):
        state["current_module"] = event["module"]

    counts = state.setdefault("event_counts", {})
    counts[event["event"]] = counts.get(event["event"], 0) + 1
    state["last_summary"] = event["summary"]

    concept = event.get("concept")
    if concept:
        concepts = state.setdefault("concepts", {})
        record = concepts.setdefault(
            concept,
            {
                "seen": 0,
                "last_seen": None,
                "last_event": None,
                "mastery": None,
                "module": None,
            },
        )
        record["seen"] += 1
        record["last_seen"] = now
        record["last_event"] = event["event"]
        if event.get("mastery") is not None:
            record["mastery"] = event["mastery"]
        if event.get("module"):
            record["module"] = event["module"]

    write_json(path, state)
    return state


def update_progress(path: Path, event: dict[str, Any]) -> dict[str, Any]:
    progress = read_json(
        path,
        {
            "modules": {},
            "weak_concepts": [],
            "review_queue": [],
            "last_event": None,
        },
    )

    module = event.get("module")
    if module:
        module_state = progress.setdefault("modules", {}).setdefault(module, {"events": 0, "concepts": {}})
        module_state["events"] += 1
        if event.get("concept"):
            module_state.setdefault("concepts", {})[event["concept"]] = {
                "last_event": event["event"],
                "mastery": event.get("mastery"),
            }

    concept = event.get("concept")
    mastery = event.get("mastery")
    if concept and mastery is not None and mastery < 4:
        weak = progress.setdefault("weak_concepts", [])
        if concept not in weak:
            weak.append(concept)
        queue = progress.setdefault("review_queue", [])
        if concept not in queue:
            queue.append(concept)

    progress["last_event"] = {
        "timestamp": event["timestamp"],
        "event": event["event"],
        "summary": event["summary"],
    }
    write_json(path, progress)
    return progress


def update_sources(path: Path, event: dict[str, Any]) -> dict[str, Any]:
    sources = read_json(path, {"sources": []})
    if event.get("source_title") or event.get("source_url"):
        sources.setdefault("sources", []).append(
            {
                "timestamp": event["timestamp"],
                "title": event.get("source_title"),
                "url": event.get("source_url"),
                "quality": event.get("quality"),
                "summary": event["summary"],
                "metadata": event.get("metadata", {}),
            }
        )
    write_json(path, sources)
    return sources


def update_notes(path: Path, event: dict[str, Any]) -> None:
    if not path.exists():
        path.write_text(f"# {event['topic']} - Quick Learn Notes\n\n", encoding="utf-8")

    lines = [
        f"## {event['timestamp']} - {event['event']}",
        "",
        f"- Summary: {event['summary']}",
    ]
    for key, label in [
        ("module", "Module"),
        ("concept", "Concept"),
        ("mastery", "Mastery"),
        ("source_title", "Source"),
        ("source_url", "Source URL"),
        ("quality", "Quality"),
        ("review_status", "Review status"),
    ]:
        if event.get(key) is not None:
            value = event[key]
            if key == "mastery":
                value = f"{value}/5"
            lines.append(f"- {label}: {value}")
    lines.append("")

    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write("\n".join(lines))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Log a quick-learn learning event.")
    parser.add_argument("--topic", required=True, help="Learning topic name.")
    parser.add_argument("--event", required=True, choices=sorted(EVENTS), help="Event type.")
    parser.add_argument("--summary", required=True, help="Short event summary.")
    parser.add_argument("--level", help="Current learner level.")
    parser.add_argument("--target", help="Target learning outcome.")
    parser.add_argument("--module", help="Current module or section.")
    parser.add_argument("--concept", help="Concept involved in this event.")
    parser.add_argument("--mastery", type=int, choices=range(1, 6), help="Mastery or teach-back score from 1 to 5.")
    parser.add_argument("--source-title", help="Source title.")
    parser.add_argument("--source-url", help="Source URL or local path.")
    parser.add_argument("--quality", choices=["A", "B", "C", "D"], help="Source quality grade.")
    parser.add_argument("--review-status", choices=["pass", "warn", "fail"], help="Stage review verdict.")
    parser.add_argument("--log-root", default=".quick-learn/projects", help="Directory for quick-learn project logs.")
    parser.add_argument("--metadata", action="append", default=[], help="Extra key=value metadata. Repeatable.")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    topic_slug = slugify(args.topic)
    topic_dir = Path(args.log_root) / topic_slug
    topic_dir.mkdir(parents=True, exist_ok=True)

    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "topic": args.topic,
        "topic_slug": topic_slug,
        "event": args.event,
        "summary": args.summary,
        "level": args.level,
        "target": args.target,
        "module": args.module,
        "concept": args.concept,
        "mastery": args.mastery,
        "source_title": args.source_title,
        "source_url": args.source_url,
        "quality": args.quality,
        "review_status": args.review_status,
        "metadata": parse_metadata(args.metadata),
    }

    events_path = topic_dir / "events.jsonl"
    project_path = topic_dir / "project.json"
    progress_path = topic_dir / "progress.json"
    sources_path = topic_dir / "sources.json"
    reviews_path = topic_dir / "reviews.jsonl"
    notes_path = topic_dir / "notes.md"

    append_jsonl(events_path, event)
    project = update_project(project_path, event)
    update_progress(progress_path, event)
    update_sources(sources_path, event)
    if event["event"] in REVIEW_EVENTS or event.get("review_status"):
        append_jsonl(reviews_path, event)
    elif not reviews_path.exists():
        reviews_path.write_text("", encoding="utf-8")
    update_notes(notes_path, event)

    print(
        json.dumps(
            {
                "status": "ok",
                "topic_slug": topic_slug,
                "event": args.event,
                "events_path": str(events_path),
                "project_path": str(project_path),
                "progress_path": str(progress_path),
                "sources_path": str(sources_path),
                "reviews_path": str(reviews_path),
                "notes_path": str(notes_path),
                "event_count": sum(project.get("event_counts", {}).values()),
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
