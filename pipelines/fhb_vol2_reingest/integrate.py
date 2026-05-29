#!/usr/bin/env python3
"""
FHB Vol 2 integration — atomic swap of English entries with new Devanagari cards.

Reads all per-chapter JSON outputs from extraction/, validates schema, then:
  1. Backs up current knowledge.json
  2. Removes all entries with source="Financial Handbook Vol 2"
  3. Appends new Devanagari fact cards
  4. Writes updated knowledge.json

USAGE:
    python3 integrate.py              # Actually swap
    python3 integrate.py --dry-run    # Just validate + show stats
"""

import json
import argparse
from pathlib import Path
from collections import Counter

SCRIPT_DIR = Path(__file__).parent
REPO_DIR = SCRIPT_DIR.parent.parent
KB_PATH = REPO_DIR / "knowledge.json"
EXTRACTION_DIR = SCRIPT_DIR / "extraction"
MERGED_PATH = SCRIPT_DIR / "merged.json"

EXPECTED_KEYS = {"id", "source", "type", "title", "summary",
                 "key_provisions", "applicable_to", "tags"}


def load_extraction():
    """Load all per-chapter JSON files."""
    cards = []
    file_count = 0
    for f in sorted(EXTRACTION_DIR.glob("*.json")):
        try:
            chap_cards = json.loads(f.read_text(encoding='utf-8'))
            if isinstance(chap_cards, list):
                cards.extend(chap_cards)
                file_count += 1
            else:
                print(f"  ! {f.name}: not a list, skipped")
        except json.JSONDecodeError as e:
            print(f"  ! {f.name}: {e}")
    return cards, file_count


def validate_cards(cards):
    """Check schema + flag issues."""
    issues = []
    for i, c in enumerate(cards):
        if not isinstance(c, dict):
            issues.append(f"Card {i}: not a dict")
            continue
        missing = EXPECTED_KEYS - c.keys()
        if missing:
            issues.append(f"Card {i} (id={c.get('id','?')}): missing keys {missing}")
        if c.get("source") != "Financial Handbook Vol 2":
            issues.append(f"Card {i} (id={c.get('id','?')}): wrong source '{c.get('source')}'")
    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("Loading extraction outputs...")
    new_cards, file_count = load_extraction()
    print(f"  Files loaded: {file_count}")
    print(f"  Total new cards: {len(new_cards)}")

    types = Counter(c.get("type") for c in new_cards if isinstance(c, dict))
    print(f"  Card types: {dict(types)}")

    print("\nValidating schema...")
    issues = validate_cards(new_cards)
    if issues:
        print(f"  ! {len(issues)} issues found:")
        for issue in issues[:10]:
            print(f"    - {issue}")
        if len(issues) > 10:
            print(f"    ...and {len(issues)-10} more")
        if not args.dry_run:
            raise SystemExit("Aborting integration due to schema issues. Fix and retry.")
    else:
        print("  ✓ All cards valid")

    print("\nLoading current knowledge.json...")
    with open(KB_PATH, encoding='utf-8') as f:
        kb = json.load(f)
    print(f"  Current KB size: {len(kb)}")

    old_fhb = [e for e in kb if e.get("source") == "Financial Handbook Vol 2"]
    non_fhb = [e for e in kb if e.get("source") != "Financial Handbook Vol 2"]
    print(f"  Existing FHB Vol 2 entries (to be removed): {len(old_fhb)}")
    print(f"  Non-FHB entries (preserved): {len(non_fhb)}")

    new_kb = non_fhb + new_cards
    print(f"\nNew KB size will be: {len(new_kb)}")
    print(f"  Non-FHB: {len(non_fhb)} (preserved)")
    print(f"  FHB Vol 2 Devanagari: {len(new_cards)} (new)")
    print(f"  Net delta: {len(new_kb) - len(kb):+d} entries")

    if args.dry_run:
        print("\nDRY RUN — knowledge.json NOT modified")
        return

    # Write merged for reference
    MERGED_PATH.write_text(
        json.dumps(new_cards, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\nWrote merged: {MERGED_PATH}")

    # Atomic swap on knowledge.json
    with open(KB_PATH, 'w', encoding='utf-8') as f:
        json.dump(new_kb, f, ensure_ascii=False, indent=2)
    print(f"Wrote {KB_PATH}: {len(new_kb)} entries")

    print("\n✓ Integration complete. Verify, then commit + push.")


if __name__ == "__main__":
    main()
