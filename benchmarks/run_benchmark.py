#!/usr/bin/env python3
"""Run the three-topic Ghitty benchmark and save reproducible JSON."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import repo_finder  # noqa: E402

TOPICS = ("image generation", "llm agent orchestration", "splunk/cribl pipeline tooling")
EVIDENCE_PATH = Path(__file__).with_name("grep_evidence.json")
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "benchmark-results"


def main() -> int:
    if not (os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")):
        print("error: export OPENAI_API_KEY or OPENROUTER_API_KEY before running the benchmark", file=sys.stderr)
        return 1

    report = {"created_at": datetime.now(timezone.utc).isoformat(), "topics": []}
    for topic in TOPICS:
        print(f"\n=== {topic} ===", file=sys.stderr)
        baseline = repo_finder.github_search(topic, 25, os.environ.get("GITHUB_TOKEN"))
        expanded = repo_finder.run(topic, 25, 10, os.environ.get("REPO_FINDER_MODEL"), EVIDENCE_PATH)
        baseline_names = {candidate.full_name.casefold() for candidate in baseline}
        expanded_names = {pick["full_name"].casefold() for pick in expanded["picks"]}
        report["topics"].append(
            {
                "topic": topic,
                "literal_candidate_count": len(baseline),
                "expanded_candidate_count": expanded["candidate_count"],
                "top_picks_not_in_literal_top_25": sorted(expanded_names - baseline_names),
                "result": expanded,
            }
        )

    OUTPUT_DIR.mkdir(exist_ok=True)
    path = OUTPUT_DIR / f"benchmark-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved {path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
