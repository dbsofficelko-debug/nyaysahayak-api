#!/usr/bin/env python3
"""
OCR + Parse pipeline for Krutidev/legacy-font encoded UP govt PDFs.

Problem this solves:
  Old UP govt PDFs (1950s-2010s) use legacy fonts (Krutidev/Mangal/etc.)
  that visually render Devanagari correctly but encode text as wrong
  Unicode codepoints. Direct pypdf extraction produces garbled output:
    "उत्तर प्रदेश" → "उत्तय प्रदेश" (र → य substitution etc.)

Solution: bypass the text layer entirely by re-OCRing the rendered pages
with Tesseract Hindi.

First applied: UP_Conduct_Rules_1956.pdf (29-May-2026).
Re-usable for: most pre-2015 UP govt publications, AG audit reports,
older Karmik/Vitt rule books.

Prerequisites (Ubuntu):
  apt-get install tesseract-ocr-hin poppler-utils
  pip install pdf2image pillow

Usage:
  python3 ocr_pipeline.py <input.pdf> --source-name "Book Name 1956" \\
    --output-prefix bookcode

  Produces:
    bookcode_ocr.txt       — raw OCR output
    bookcode_cards.json    — bot KB cards (append to knowledge.json)
    bookcode_index.json    — library chapter index
"""

import argparse
import json
import re
import subprocess
import time
from pathlib import Path


def render_and_ocr(pdf_path: Path, dpi: int = 300) -> str:
    """Render every PDF page at given DPI then OCR with tesseract Hindi."""
    from pdf2image import convert_from_path

    print(f"Rendering {pdf_path.name} at {dpi} DPI...")
    images = convert_from_path(str(pdf_path), dpi=dpi)
    print(f"  Pages: {len(images)}")

    all_text = []
    start = time.time()
    for i, img in enumerate(images, 1):
        tmp = f"/tmp/_page_{i:03d}.png"
        img.save(tmp)
        r = subprocess.run(
            ["tesseract", tmp, "-", "-l", "hin", "--psm", "6"],
            capture_output=True, text=True, timeout=120
        )
        all_text.append(r.stdout)
        dev = len(re.findall(r'[\u0900-\u097F]', r.stdout))
        total = max(1, len(r.stdout))
        print(f"  page {i:3d}: {len(r.stdout):5d} chars, {dev*100/total:.0f}% Devanagari")
    print(f"  elapsed: {time.time()-start:.0f}s")
    return "\n\n".join(all_text)


# Standard OCR error fixes (extend per book as needed)
COMMON_OCR_FIXES = [
    (r'\b956\b', '1956'), (r'\b4956\b', '1956'), (r'\b9956\b', '1956'),
    (r'दिवाल्रियापन', 'दिवालियापन'),
    (r'वाल्रा', 'वाला'),
    (r'षरीद', 'खरीद'),
    (r'सम्मित्रित', 'सम्मिलित'),
    (r'किइ', 'किए'),
    (r'मतर्चन', 'मतर्थन'),
]


def apply_fixes(text: str, extra_fixes=None) -> str:
    fixes = list(COMMON_OCR_FIXES) + (extra_fixes or [])
    for pat, repl in fixes:
        text = re.sub(pat, repl, text)
    return text


def parse_rules(text: str, marker_word: str = "नियम") -> list:
    """Split text by `<marker_word> N -` patterns. Returns list of dicts."""
    pattern = re.compile(rf'{marker_word}\s*(\d+(?:[-–\s][क-ज])?)\s*[-—–]\s*([^\n]+)', re.MULTILINE)
    matches = list(pattern.finditer(text))
    print(f"Detected {len(matches)} rule markers")

    seen = set()
    entries = []
    for i, m in enumerate(matches):
        rn = re.sub(r'\s+', ' ', m.group(1).strip())
        key = f'{marker_word} {rn}'
        if key in seen:
            continue
        seen.add(key)
        title = re.sub(r'-+\s*$', '', m.group(2).strip()).strip()
        start = m.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        body = re.sub(r'[ \t]+', ' ', text[start:end]).strip()
        body = re.sub(r'\n{3,}', '\n\n', body)
        if len(body) < 30 and i + 1 < len(matches):
            continue
        entries.append({'rule_number': key, 'title': title, 'body': body})
    return entries


def build_outputs(entries: list, source_name: str, prefix: str):
    """Build bot KB cards + library index. Returns (cards, library)."""
    cards = []
    library = []
    for i, e in enumerate(entries, 1):
        sentences = re.split(r'(?<=[।.!?])\s+', e['body'])
        summary = ' '.join(sentences[:2])[:300]
        parts = re.split(r'\n(?=\([क-य]\)|\(\d+\)|उदाहरण|स्पष्टीकरण|किन्तु)', e['body'])
        provisions = [p.strip() for p in parts if 50 <= len(p.strip()) <= 800]
        if not provisions:
            provisions = [e['body'][:1500]]
        cards.append({
            'id': f'{prefix}_{e["rule_number"].replace(" ", "_")}',
            'source': source_name,
            'type': 'rule',
            'rule_number': e['rule_number'],
            'title': f'{e["rule_number"]} — {e["title"]}',
            'summary': summary,
            'key_provisions': provisions[:6],
            'tags': [],
            'chapter': e['rule_number'],
        })
        library.append({
            'id': str(i),
            'chapter': e['rule_number'].split(' ', 1)[1],
            'topic': e['title'],
            'filename': f'rule_{e["rule_number"].replace(" ", "_")}',
            'content': f'# {e["rule_number"]} — {e["title"]}\n\n{e["body"]}',
            'type': 'chapter',
            'source': source_name,
        })
    return cards, library


def main():
    p = argparse.ArgumentParser()
    p.add_argument("pdf", type=Path)
    p.add_argument("--source-name", required=True, help='e.g. "UP Aacharan Niyamavali 1956"')
    p.add_argument("--output-prefix", required=True, help='e.g. "aacharan"')
    p.add_argument("--marker-word", default="नियम", help='Default: नियम')
    p.add_argument("--dpi", type=int, default=300)
    p.add_argument("--ocr-only", action="store_true", help="Stop after OCR step")
    args = p.parse_args()

    out_dir = Path(".")
    raw_text = render_and_ocr(args.pdf, args.dpi)
    raw_path = out_dir / f"{args.output_prefix}_ocr.txt"
    raw_path.write_text(raw_text, encoding="utf-8")
    print(f"\n✓ Saved raw OCR: {raw_path}")

    if args.ocr_only:
        print("(stopping after OCR per --ocr-only)")
        return

    fixed = apply_fixes(raw_text)
    entries = parse_rules(fixed, args.marker_word)
    print(f"Parsed {len(entries)} unique rule entries")

    cards, library = build_outputs(entries, args.source_name, args.output_prefix)
    (out_dir / f"{args.output_prefix}_cards.json").write_text(
        json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out_dir / f"{args.output_prefix}_index.json").write_text(
        json.dumps(library, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✓ Saved {args.output_prefix}_cards.json ({len(cards)} cards)")
    print(f"✓ Saved {args.output_prefix}_index.json ({len(library)} library chapters)")


if __name__ == "__main__":
    main()
