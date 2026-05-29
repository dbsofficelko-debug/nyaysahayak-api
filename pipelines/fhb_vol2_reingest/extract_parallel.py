#!/usr/bin/env python3
"""
Parallel batch wrapper for extract.py — processes chapters concurrently
to fit within sandbox per-command timeouts.
"""
import json
import os
import sys
import time
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).parent))
from extract import (
    load_chapters,
    extract_chapter,
    SKIP_CHAPTER_INDICES,
    EXTRACTION_DIR,
)
import anthropic


def process(client, idx, ch, model):
    """Worker: extract one chapter, write output, return summary."""
    out_file = EXTRACTION_DIR / f"{idx:02d}.json"
    if out_file.exists():
        return (idx, "skip", 0, 0)
    t0 = time.time()
    try:
        cards, err = extract_chapter(client, idx, ch, model=model)
    except Exception as e:
        return (idx, f"err: {e}", 0, time.time() - t0)
    dt = time.time() - t0
    if err:
        return (idx, f"err: {err[:100]}", 0, dt)
    out_file.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding='utf-8')
    return (idx, "ok", len(cards), dt)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--workers", type=int, default=5)
    p.add_argument("--start-from", type=int, default=0)
    p.add_argument("--end-at", type=int, default=91)
    p.add_argument("--model", default="claude-sonnet-4-20250514")
    args = p.parse_args()

    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        sys.exit("ANTHROPIC_API_KEY not set")
    client = anthropic.Anthropic(api_key=key)

    chapters = load_chapters()
    targets = []
    for idx, ch in enumerate(chapters):
        if idx < args.start_from or idx > args.end_at:
            continue
        if idx in SKIP_CHAPTER_INDICES:
            continue
        out = EXTRACTION_DIR / f"{idx:02d}.json"
        if out.exists():
            continue
        targets.append((idx, ch))

    print(f"Workers: {args.workers}, chapters: {len(targets)} (idx {args.start_from}-{args.end_at})")
    if not targets:
        print("Nothing to do")
        return

    ok = err = 0
    total_cards = 0
    start = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(process, client, idx, ch, args.model) for idx, ch in targets]
        for fu in as_completed(futs):
            idx, status, cards, dt = fu.result()
            if status == "ok":
                ok += 1
                total_cards += cards
                print(f"  ✓ [{idx:>2}] {cards} cards in {dt:.0f}s")
            elif status == "skip":
                print(f"  - [{idx:>2}] already done")
            else:
                err += 1
                print(f"  ✗ [{idx:>2}] {status}")

    elapsed = time.time() - start
    print(f"\n=== BATCH SUMMARY ===")
    print(f"ok: {ok}, err: {err}, total cards: {total_cards}, wall time: {elapsed:.0f}s")


if __name__ == "__main__":
    main()
