#!/usr/bin/env python3
"""
FHB Vol 2 re-ingestion pipeline — Phase 1 of bot KB quality rebuild.

Reads fhb_index.json (92 Devanagari chapters) and extracts structured
fact cards via Claude Sonnet. Output replaces the 2,267 English entries
currently in knowledge.json under source="Financial Handbook Vol 2".

USAGE:
    # Set API key (rotate after done)
    export ANTHROPIC_API_KEY=sk-ant-...

    # Dry run on first 2 real chapters (skips Index chapters)
    python3 extract.py --dry-run --limit 2

    # Full run with checkpointing (resumable)
    python3 extract.py

    # Resume after interruption
    python3 extract.py --resume

    # After extraction complete: integrate into knowledge.json
    python3 integrate.py

OUTPUT:
    extraction/<NN>.json  — one file per chapter (NN = chapter index, zero-padded)
    merged.json           — aggregated fact cards after full extraction
    STATS.md              — run report (cards per chapter, error count, etc.)

PROMPT DESIGN:
    System prompt instructs Sonnet to identify discrete legal units in each
    chapter — Rules, sub-rules, notes, GOs, court rulings, clarifications —
    and output structured Devanagari fact cards. Verbatim Devanagari
    preservation (no Romanization, no translation, no fabrication).

ESTIMATED:
    Total input: ~500K tokens across 90 real chapters
    Total output: ~250-400K tokens
    Cost at Sonnet rates: ~$5-10
    Wall time: 30-60 min (depends on API rate limits)
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("ERROR: anthropic SDK not installed. Run: pip3 install --break-system-packages anthropic")

SCRIPT_DIR = Path(__file__).parent
REPO_DIR = SCRIPT_DIR.parent.parent
FHB_INDEX = REPO_DIR / "fhb_index.json"
EXTRACTION_DIR = SCRIPT_DIR / "extraction"
EXTRACTION_DIR.mkdir(exist_ok=True)

SKIP_CHAPTER_INDICES = {0, 1}  # Index 1 and Index 2 — TOC chapters, no rules

SYSTEM_PROMPT = """तुम एक expert legal text extractor ho jo Uttar Pradesh government ke rule books par kaam kar rahe ho.

TASK: एक chapter padho वित्तीय हस्त-पुस्तिका खण्ड-2 (Financial Handbook Volume 2) ka. हर discrete legal unit identify karke structured JSON fact card mein extract karo.

DISCRETE LEGAL UNITS jo identify karne hain:
- नियम (Rule) aur उप-नियम (sub-rules) — e.g. मूल नियम 22, उप-नियम (बी)
- टिप्पणी (notes attached to rules)
- शासनादेश (Government Orders cited within chapter)
- न्यायालय आदेश / निर्णय (Court rulings cited)
- स्पष्टीकरण (Clarifications)
- संशोधन (Amendments)

OUTPUT: JSON array of fact cards. NO preamble, NO markdown fences, NO explanation. JSON starts with [ and ends with ].

SCHEMA per card:
{
  "id": "fhb2_<chap_num>_<unit_seq>",
  "department": "universal",
  "source": "Financial Handbook Vol 2",
  "type": "rule" | "sub_rule" | "note" | "go" | "court_ruling" | "clarification" | "amendment",
  "rule_number": "<e.g. 'मूल नियम 22-B' or 'उप-नियम (3)' or null>",
  "title": "<concise Devanagari heading, max 100 chars>",
  "summary": "<2-3 line Devanagari summary, max 300 chars>",
  "key_provisions": ["<verbatim Devanagari quote 1, max 200 chars>", "<quote 2>"],
  "file_number": "<GO file number if type=go, else null>",
  "date": "<DD-MM-YYYY if type=go, else null>",
  "issuing_authority": "<if type=go, else null>",
  "court_case": "<case citation if type=court_ruling, else null>",
  "page_range": "<chapter page range, e.g. P041-P050>",
  "chapter": "<chapter num and topic>",
  "applicable_to": ["UP Government Servants"],
  "tags": ["<Hindi keyword 1>", "<keyword 2>"]
}

CRITICAL RULES:
1. Devanagari text EXACTLY preserve karo — Roman/English mein translate MAT karo
2. Source mein jo content NAHI hai usse FABRICATE MAT karo
3. Agar unit mein multiple GOs/rulings hain to har ek ke liye separate card
4. key_provisions = verbatim Devanagari short quotes (max 200 chars each)
5. summary = apne shabdon mein Devanagari restatement
6. Return ONLY the JSON array. NO ```json fences, NO preamble.
"""

USER_TEMPLATE = """Chapter {chap_idx} — {topic}
Page range: {pages}
Rules covered: {rules}

Content:
{content}
"""


def load_chapters():
    with open(FHB_INDEX, encoding='utf-8') as f:
        return json.load(f)


def extract_chapter(client, chap_idx, chapter, model="claude-sonnet-4-20250514", max_retries=4):
    """Call Sonnet to extract fact cards from one chapter, with retry on 429."""
    user_msg = USER_TEMPLATE.format(
        chap_idx=chap_idx,
        topic=chapter.get('topic', ''),
        pages=chapter.get('pages', ''),
        rules=chapter.get('key_rules_covered', ''),
        content=chapter.get('content', '')
    )

    last_err = None
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=16000,
                temperature=0,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}]
            )
            break
        except anthropic.RateLimitError as e:
            wait = 30 + attempt * 30  # 30s, 60s, 90s, 120s
            print(f"    [429 rate limit, waiting {wait}s, attempt {attempt+1}/{max_retries}]", flush=True)
            time.sleep(wait)
            last_err = e
        except anthropic.APIStatusError as e:
            if e.status_code == 429:
                wait = 30 + attempt * 30
                print(f"    [429 rate limit, waiting {wait}s, attempt {attempt+1}/{max_retries}]", flush=True)
                time.sleep(wait)
                last_err = e
                continue
            raise
    else:
        return None, f"Rate-limited after {max_retries} attempts: {last_err}"

    raw = response.content[0].text.strip()
    # Defensive: strip markdown fences if model added them
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        if raw.startswith("json\n"):
            raw = raw[5:]
    if not raw.startswith("["):
        # Try to find first [
        bracket_idx = raw.find("[")
        if bracket_idx >= 0:
            raw = raw[bracket_idx:]

    try:
        cards = json.loads(raw)
    except json.JSONDecodeError as e:
        return None, f"JSON parse error: {e}\nRaw output:\n{raw[:500]}"

    if not isinstance(cards, list):
        return None, f"Expected list, got {type(cards).__name__}"

    return cards, None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print stats only, don't write files")
    parser.add_argument("--limit", type=int, help="Process only first N chapters (for testing)")
    parser.add_argument("--resume", action="store_true", help="Skip chapters already extracted")
    parser.add_argument("--model", default="claude-sonnet-4-6")
    parser.add_argument("--start-from", type=int, default=0, help="Start from chapter index N")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ERROR: ANTHROPIC_API_KEY env var not set")

    client = anthropic.Anthropic(api_key=api_key)
    chapters = load_chapters()
    print(f"Loaded {len(chapters)} chapters from fhb_index.json")

    targets = []
    for idx, ch in enumerate(chapters):
        if idx < args.start_from:
            continue
        if idx in SKIP_CHAPTER_INDICES:
            print(f"  [{idx:>2}] SKIP (TOC): {ch.get('topic')}")
            continue
        out_file = EXTRACTION_DIR / f"{idx:02d}.json"
        if args.resume and out_file.exists():
            print(f"  [{idx:>2}] RESUME-SKIP: already extracted to {out_file.name}")
            continue
        targets.append((idx, ch))

    if args.limit:
        targets = targets[:args.limit]

    print(f"\nTarget chapters: {len(targets)}")
    if args.dry_run:
        for idx, ch in targets:
            print(f"  Would extract [{idx:>2}] {ch.get('topic')} ({len(ch.get('content',''))} chars)")
        return

    total_cards = 0
    errors = []
    for n, (idx, ch) in enumerate(targets, 1):
        print(f"\n[{n}/{len(targets)}] Chapter {idx}: {ch.get('topic')} ({len(ch.get('content',''))} chars)")
        t0 = time.time()
        try:
            cards, err = extract_chapter(client, idx, ch, model=args.model)
        except Exception as e:
            cards, err = None, f"API error: {e}"
        dt = time.time() - t0

        if err:
            print(f"  ✗ ERROR ({dt:.1f}s): {err}")
            errors.append((idx, err))
            continue

        out_file = EXTRACTION_DIR / f"{idx:02d}.json"
        out_file.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"  ✓ {len(cards)} cards extracted in {dt:.1f}s -> {out_file.name}")
        total_cards += len(cards)

    # Summary
    stats = SCRIPT_DIR / "STATS.md"
    with stats.open("a", encoding='utf-8') as f:
        f.write(f"\n## Run {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"- Chapters processed: {len(targets) - len(errors)}/{len(targets)}\n")
        f.write(f"- Total cards: {total_cards}\n")
        if errors:
            f.write(f"- Errors: {len(errors)}\n")
            for idx, e in errors:
                f.write(f"  - Chapter {idx}: {e[:100]}\n")
    print(f"\n=== SUMMARY ===")
    print(f"Chapters: {len(targets) - len(errors)}/{len(targets)} ok")
    print(f"Total cards extracted: {total_cards}")
    print(f"Stats: {stats}")


if __name__ == "__main__":
    main()
