#!/usr/bin/env python3
"""
Vitt GO Court Relevant ingestion — no LLM needed, pure structural parser.

Source: Vitt_GO_Court_Relevant.md (106 GO entries, pre-structured)
Output: 106 Devanagari fact cards appended to knowledge.json

Each entry in source MD looks like:
    ## N. Section M
    **Keywords:** Vitt Vibhag GO

    <Devanagari GO title/subject>

Builds fact cards with type=go, source="Vitt GO Court Relevant".
"""

import json
import re
import argparse
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
REPO_DIR = SCRIPT_DIR.parent.parent
SOURCE_MD = REPO_DIR / "Vitt_GO_Court_Relevant.md"
KB_PATH = REPO_DIR / "knowledge.json"


def extract_tags_from_title(title):
    """Extract topical tags from GO title — Devanagari keyword patterns."""
    tags = ["शासनादेश", "वित्त विभाग"]
    patterns = {
        "पेंशन": "pension",
        "वेतन": "salary",
        "वेतनमान": "pay_scale",
        "पुनरीक्षण": "revision",
        "अवकाश": "leave",
        "स्थानांतरण": "transfer",
        "पदोन्नति": "promotion",
        "नियुक्ति": "appointment",
        "सेवा निवृत्ति": "retirement",
        "अनुदान": "grant",
        "महंगाई भत्ता": "DA",
        "मकान किराया": "HRA",
        "यात्रा भत्ता": "TA",
        "अनुग्रह": "ex_gratia",
        "अनुकम्पा": "compassion",
        "निलंबन": "suspension",
        "अनुशासन": "discipline",
        "वेतन मैट्रिक्स": "pay_matrix",
        "वेतन समिति": "pay_committee",
        "स्वीकृति": "sanction",
        "व्यय": "expenditure",
        "गोपनीय": "secret_service",
        "पारिवारिक पेंशन": "family_pension",
        "ग्रेच्युटी": "gratuity",
        "उपदान": "gratuity",
    }
    for hindi_term, _ in patterns.items():
        if hindi_term in title:
            tags.append(hindi_term)
    return tags


def parse_source():
    """Parse the MD file into structured cards."""
    content = SOURCE_MD.read_text(encoding='utf-8')
    # Each entry separated by --- (after split, first chunk is header)
    sections = re.split(r'\n---\n', content)

    cards = []
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        m = re.match(r'^##\s+(\d+)\.\s+Section\s+(\d+)\s*\n\*\*Keywords:\*\*\s*(.+?)\n\n(.+)$',
                     sec, re.DOTALL)
        if not m:
            continue
        entry_num = m.group(1)
        section_num = m.group(2)
        # keywords field is currently unused metadata — preserved in source
        body = m.group(4).strip()
        body = re.sub(r'\n+', ' ', body).strip()

        if not body or len(body) < 20:
            continue

        title = body[:200] + ("…" if len(body) > 200 else "")
        # Card
        card = {
            "id": f"vitt_go_court_{entry_num.zfill(3)}",
            "department": "vitt",
            "source": "Vitt GO Court Relevant",
            "type": "go",
            "rule_number": None,
            "title": title,
            "summary": body[:400] + ("…" if len(body) > 400 else ""),
            "key_provisions": [body[:500]] if len(body) <= 500 else [body[:500] + "…"],
            "file_number": None,
            "date": None,
            "issuing_authority": "उत्तर प्रदेश शासन — वित्त विभाग",
            "court_case": None,
            "page_range": None,
            "chapter": f"Section {section_num}",
            "applicable_to": ["UP Government Servants"],
            "tags": extract_tags_from_title(body),
        }
        cards.append(card)
    return cards


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    print("Parsing source...")
    cards = parse_source()
    print(f"  Cards parsed: {len(cards)}")

    if cards:
        print("\nFirst card preview:")
        print(json.dumps(cards[0], ensure_ascii=False, indent=2)[:600])

    with open(KB_PATH, encoding='utf-8') as f:
        kb = json.load(f)
    print(f"\nCurrent KB size: {len(kb)}")

    # Check no duplicate source
    existing = [e for e in kb if e.get("source") == "Vitt GO Court Relevant"]
    if existing:
        print(f"  ⚠ {len(existing)} entries already exist with this source — will be replaced")
        kb = [e for e in kb if e.get("source") != "Vitt GO Court Relevant"]

    new_kb = kb + cards
    print(f"New KB size: {len(new_kb)} (+{len(new_kb)-len(kb)+len(existing)})")

    if args.dry_run:
        print("\nDRY RUN — knowledge.json NOT modified")
        return

    with open(KB_PATH, 'w', encoding='utf-8') as f:
        json.dump(new_kb, f, ensure_ascii=False, indent=2)
    print(f"\n✓ knowledge.json updated: {len(new_kb)} entries")


if __name__ == "__main__":
    main()
