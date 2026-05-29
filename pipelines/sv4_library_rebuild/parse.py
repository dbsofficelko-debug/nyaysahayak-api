#!/usr/bin/env python3
"""
Rebuild sv_index.json (Seva Vidhi Vol 4 library data) from clean MD source.

Replaces OCR-garbled current sv_index.json with structured Devanagari chapters
extracted from SevaVidhi_Vol4_Nivritti.md.

Strategy: pure parser (no LLM needed)
  1. Strip [cite_start] and [cite: N] markers
  2. Split content by ## H2 headings (chapter boundaries)
  3. Each chapter: {id, chapter, topic, filename, content, type}

Library frontend expects entries with: chapter, topic, filename
API /sv endpoint also returns the full content per /sv/:filename.
"""

import json
import re
import argparse
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
REPO_DIR = SCRIPT_DIR.parent.parent
SOURCE_MD = REPO_DIR / "SevaVidhi_Vol4_Nivritti.md"
TARGET_JSON = REPO_DIR / "sv_index.json"
BACKUP_JSON = REPO_DIR / "sv_index.json.backup_garbled"


def strip_cite_markers(text):
    """Remove all [cite_start] and [cite: N] / [cite: N, M] markers."""
    text = re.sub(r'\[cite_start\]', '', text)
    text = re.sub(r'\[cite:\s*\d+(?:\s*,\s*\d+)*\s*\]', '', text)
    # Collapse multiple spaces but preserve newlines
    text = re.sub(r'[ \t]+', ' ', text)
    # Trim each line
    text = '\n'.join(line.strip() for line in text.split('\n'))
    # Collapse 3+ newlines to 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def parse_chapter_heading(line):
    """
    Parse cleaned heading like:
      '## अध्याय-1: सरकारी सेवा'   → (1, 'सरकारी सेवा')
      '## अध्याय 3'                  → (3, None)
      '## अध्याय-5'                  → (5, None)
      '## विषय-सूची ...'              → (None, 'विषय-सूची ...')
    Returns (chapter_num_or_None, topic_or_None) or None if not a valid H2.
    """
    line = line.strip()
    if not line.startswith('## ') or line.startswith('### '):
        return None
    # Remove '## ' prefix
    rest = line[3:].strip()
    # Try: अध्याय (dash or space) N (colon TITLE)?
    m = re.match(r'^अध्याय\s*[-\s]\s*(\d+)\s*(?:[:：]\s*(.+))?$', rest)
    if m:
        chap = m.group(1)
        topic = (m.group(2) or '').strip() or None
        return (chap, topic)
    # Non-chapter H2 (preamble, vishay-soochi, etc.)
    return (None, rest)


def find_topic_from_h3(body_lines):
    """If chapter heading had no title, try the first H3 within the body."""
    for line in body_lines[:20]:  # check first 20 lines only
        line = line.strip()
        if line.startswith('### '):
            t = line[4:].strip()
            # Strip leading number like "1. " or "13. "
            t = re.sub(r'^\d+\.\s*', '', t)
            return t
    return None


def parse_source():
    content = SOURCE_MD.read_text(encoding='utf-8')
    content = strip_cite_markers(content)

    # Split by H2 lines
    lines = content.split('\n')
    sections = []  # list of {heading_line_idx, chapter, topic}

    for i, line in enumerate(lines):
        parsed = parse_chapter_heading(line)
        if parsed is not None and line.startswith('## ') and not line.startswith('### '):
            sections.append({'idx': i, 'chapter': parsed[0], 'topic': parsed[1]})

    print(f"Found {len(sections)} H2 sections")
    print(f"  Numbered chapters: {sum(1 for s in sections if s['chapter'])}")
    print(f"  Other H2: {sum(1 for s in sections if not s['chapter'])}")

    # Pre-pass: merge chapter heading that has empty body with following non-chapter section.
    # Example: H2[4]="अध्याय 4" (no title) immediately followed by H2[5]="तदर्थ नियुक्ति एवं विनियमितीकरण"
    # → treat as one: chapter=4, topic="तदर्थ नियुक्ति एवं विनियमितीकरण"
    merged_sections = []
    skip_next = False
    for i, sec in enumerate(sections):
        if skip_next:
            skip_next = False
            continue
        if sec['chapter'] and not sec['topic'] and i + 1 < len(sections):
            next_sec = sections[i + 1]
            # Body between this heading and next heading
            gap_body = '\n'.join(lines[sec['idx']+1:next_sec['idx']]).strip()
            # If empty gap AND next is non-chapter, merge
            if not gap_body and not next_sec['chapter']:
                merged_sections.append({
                    'idx': next_sec['idx'],  # use next section's idx (body source)
                    'chapter': sec['chapter'],
                    'topic': next_sec['topic'],
                })
                skip_next = True
                continue
        merged_sections.append(sec)
    sections = merged_sections
    print(f"After merge: {len(sections)} sections")

    # OCR-garbage section names — used as body boundaries but excluded from output
    OCR_GARBAGE_TOPICS = ['भाग 2: OCR से (पृष्ठ 350 आगे)']

    # OCR H3 line pattern — page-by-page OCR txt files inside body
    OCR_H3_PATTERN = re.compile(r'^###\s+\d{3,}.*Page\.pdf.*$', re.MULTILINE)

    # Build entries — each section's body runs to next section's start
    entries = []
    for i, sec in enumerate(sections):
        # Skip OCR-garbage sections entirely (but they still serve as body boundaries for prior)
        if sec['topic'] in OCR_GARBAGE_TOPICS:
            continue

        start = sec['idx'] + 1  # skip the heading itself
        end = sections[i+1]['idx'] if i + 1 < len(sections) else len(lines)
        body_lines = lines[start:end]
        body = '\n'.join(body_lines).strip()
        if not body:
            continue

        # Truncate body at first OCR H3 marker if present (page-by-page OCR appended to chapter)
        ocr_match = OCR_H3_PATTERN.search(body)
        if ocr_match:
            body = body[:ocr_match.start()].rstrip()

        # Build entry
        if sec['chapter']:
            chap = sec['chapter']
            # Use heading topic, fall back to first H3 if missing
            topic = sec['topic'] or find_topic_from_h3(body_lines) or f'अध्याय {chap}'
            filename = f"ch{chap}_{i}"  # i suffix for uniqueness across duplicates
        else:
            # Preamble-type section: synthesize an id
            chap = '0'
            topic = sec['topic'] or 'सामान्य'
            filename = f"sec{i}"

        entries.append({
            "id": str(i + 1),
            "chapter": chap,
            "topic": topic,
            "filename": filename,
            "content": body,
            "type": "chapter",
            "source": "Seva Vidhi Vol 4 - Nivritti",
        })
    return entries


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    print(f"Source: {SOURCE_MD}")
    entries = parse_source()
    print(f"\nBuilt {len(entries)} chapter entries")

    # Stats
    sizes = [len(e['content']) for e in entries]
    print(f"Content size: min={min(sizes)} / median={sorted(sizes)[len(sizes)//2]} / max={max(sizes)} chars")
    total = sum(sizes)
    print(f"Total content: {total:,} chars ({total/1024:.1f} KB)")

    # Quality check
    import re
    garbage_patterns = [r'\[cite_start\]', r'\[cite:\s*\d', r'\|\=', r'इचुं<']
    issues = {}
    for pat in garbage_patterns:
        c = sum(1 for e in entries if re.search(pat, e['content']))
        issues[pat] = c
    print(f"\nResidual garbage in extracted content:")
    for pat, c in issues.items():
        print(f"  {pat}: {c} entries affected")

    # Preview first 3 entries
    print(f"\n--- Entry samples ---")
    for e in entries[:3]:
        print(f"\n[{e['filename']}] अध्याय {e['chapter']} — {e['topic']}")
        print(f"  Content ({len(e['content'])} chars): {e['content'][:200]}...")

    if args.dry_run:
        print("\nDRY RUN — sv_index.json NOT modified")
        return

    # Backup current file
    if TARGET_JSON.exists() and not BACKUP_JSON.exists():
        TARGET_JSON.rename(BACKUP_JSON)
        print(f"\n✓ Backed up old garbled file → {BACKUP_JSON.name}")

    with open(TARGET_JSON, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f"✓ Wrote {TARGET_JSON.name}: {len(entries)} entries")


if __name__ == "__main__":
    main()
