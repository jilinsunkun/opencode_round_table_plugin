#!/usr/bin/env python3
"""Copy the current repository's .opencode directory into a target project.

This utility is intentionally small and portable:
- default behavior fully replaces the target .opencode directory
- common transient directories/files are skipped by default
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


SKIP_PATTERNS = (
    "node_modules",
    "__pycache__",
    "*.pyc",
    "*.pyo",
    "*.log",
    ".DS_Store",
    "Thumbs.db",
)


def repo_root_from_script(script_path: Path) -> Path:
    # .opencode/skills/sync-opencode/scripts/copy_opencode.py -> repo root
    return script_path.resolve().parents[4]


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy this repository's .opencode directory to a target project."
    )
    parser.add_argument(
        "target_project",
        help="Target project root directory (the script writes target/.opencode)",
    )
    parser.add_argument(
        "--source",
        default=None,
        help="Optional source .opencode directory. Defaults to the current repo's .opencode.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Kept for compatibility; overwrite is now always full replacement.",
    )
    return parser.parse_args(argv)


def copy_opencode(source: Path, target_project: Path, clean: bool) -> Path:
    if not source.exists() or not source.is_dir():
        raise FileNotFoundError(f"Source .opencode not found: {source}")

    target_opencode = target_project / ".opencode"
    target_opencode.parent.mkdir(parents=True, exist_ok=True)

    if target_opencode.exists():
        shutil.rmtree(target_opencode)

    shutil.copytree(
        source,
        target_opencode,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns(*SKIP_PATTERNS),
    )
    return target_opencode


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    script_path = Path(__file__)
    repo_root = repo_root_from_script(script_path)
    source = Path(args.source).expanduser().resolve() if args.source else (repo_root / ".opencode")
    target_project = Path(args.target_project).expanduser().resolve()

    if not target_project.exists() or not target_project.is_dir():
        print(f"Target project directory does not exist: {target_project}", file=sys.stderr)
        return 2

    try:
        target_opencode = copy_opencode(source, target_project, args.clean)
    except Exception as exc:  # noqa: BLE001
        print(f"Copy failed: {exc}", file=sys.stderr)
        return 1

    print("Copy complete")
    print(f"Source: {source}")
    print(f"Target: {target_opencode}")
    print("Skipped patterns: " + ", ".join(SKIP_PATTERNS))
    print("Mode: full replace (existing target .opencode is removed first)")
    print("If opencode.json changed, restart opencode to load the new config.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
