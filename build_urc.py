# -*- coding: utf-8 -*-
"""
UP Revenue Code 2006 (राजस्व संहिता) — Library + Bot builder.
Incremental: ENTRIES grows each chat-chunk. Re-run dumps urc_index.json + urc_cards.json.
Source PDF: Uttar_Pradesh_Revenue_Code_2006.pdf (clean Devanagari, last amend 05-03-2021).
Faithful Devanagari transcription. Zero-hallucination: only what's in the PDF.
"""
import json, os

SRC_EN = "UP Revenue Code 2006"
SRC_HI = "उत्तर प्रदेश राजस्व संहिता, 2006"
DEPT   = "राजस्व विभाग"

# Each entry: sec_label, chapter_label, topic, filename, content_md, tags, applicable_to
ENTRIES = []

def add(filename, chapter, topic, content, tags, applicable_to=None, card_title=None):
    ENTRIES.append({
        "filename": filename, "chapter": chapter, "topic": topic,
        "content": content, "tags": tags,
        "applicable_to": applicable_to or ["उत्तर प्रदेश राजस्व प्रशासन"],
        "card_title": card_title or topic,
    })

# ───────────────────────── अध्याय 1 — प्रारम्भिक ─────────────────────────

add("sec_1", "अध्याय 1 · धारा 1", "संक्षिप्त नाम, विस्तार और प्रारम्भ",
"""# अध्याय 1 — प्रारम्भिक : संक्षिप्त नाम, विस्तार और प्रारम्भ

**धारा 1 — संक्षिप्त नाम, विस्तार और प्रारम्भ**

(1) यह अधिनियम उत्तर प्रदेश राजस्व संहिता, 2006 कहा जाएगा।

(2) इसका विस्तार सम्पूर्ण उत्तर प्रदेश में होगा।

(3) यह ऐसे दिनांक को प्रवृत्त होगा जैसा राज्य सरकार, अधिसूचना द्वारा नियत करे; और विभिन्न क्षेत्रों के लिए या इस संहिता के विभिन्न उपबन्धों के लिए विभिन्न दिनांक नियत किये जा सकते हैं।

*टिप्पणी (अधिसूचना दिनांक 18.12.2015):* धाराएं 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 233 एवं 234 दिनांक 18.12.2015 से प्रवृत्त हुईं तथा अधिनियम के शेष उपबन्ध दिनांक 11.02.2016 से प्रवृत्त हुए।""",
["संक्षिप्त नाम", "विस्तार", "प्रारम्भ", "धारा 1", "राजस्व संहिता 2006", "प्रवर्तन दिनांक"])

add("sec_2", "अध्याय 1 · धारा 2", "संहिता का लागू होना",
"""# अध्याय 1 — प्रारम्भिक : संहिता का लागू होना

**धारा 2 — संहिता का लागू होना**

इस संहिता के उपबन्ध, अध्याय आठ और नौ को छोड़कर, संपूर्ण उत्तर प्रदेश में लागू होंगे, और अध्याय आठ और नौ ऐसे क्षेत्रों में लागू होंगे जिन पर प्रथम अनुसूची के क्रम संख्या 19 और 25 पर विनिर्दिष्ट कोई अधिनियम इस संहिता द्वारा उनके निरसन के ठीक पूर्ववर्ती दिनांक को लागू था।""",
["संहिता का लागू होना", "धारा 2", "अध्याय आठ नौ", "प्रथम अनुसूची", "क्रम संख्या 19 और 25"])

add("sec_3", "अध्याय 1 · धारा 3", "संहिता का नए क्षेत्रों में विस्तार",
"""# अध्याय 1 — प्रारम्भिक : संहिता का नए क्षेत्रों में विस्तार

**धारा 3 — संहिता का नए क्षेत्रों में विस्तार**

(1) जहाँ इस संहिता के प्रारम्भ होने के पश्चात उत्तर प्रदेश के राज्य क्षेत्र में कोई क्षेत्र सम्मिलित किया जाए, वहाँ राज्य सरकार अधिसूचना द्वारा ऐसे क्षेत्र में इस संहिता का संपूर्ण या कोई उपबन्ध विस्तारित कर सकती है।

(2) जहाँ उपधारा (1) के अधीन कोई अधिसूचना जारी की जाए, वहाँ उक्त उपधारा में विनिर्दिष्ट क्षेत्र में प्रवृत्त किसी अधिनियम, नियम या विनियम के उपबन्ध जो इस प्रकार लागू किए गये उपबन्धों से असंगत हों, निरसित हुए समझे जायेंगे।

(3) राज्य सरकार किसी पश्चातवर्ती अधिसूचना द्वारा उपधारा (1) के अधीन जारी किसी अधिसूचना में संशोधन, उपान्तरण या परिवर्तन कर सकती है।""",
["नए क्षेत्रों में विस्तार", "धारा 3", "अधिसूचना", "असंगत उपबन्ध निरसन"])

# ───────────────────────── DUMP ─────────────────────────

def build():
    index = []
    cards = []
    for i, e in enumerate(ENTRIES, start=1):
        sid = e["filename"]
        index.append({
            "id": str(i), "chapter": e["chapter"], "topic": e["topic"],
            "filename": sid, "content": e["content"], "type": "chapter", "source": SRC_EN,
        })
        # key_provisions: split content paragraphs (skip headings)
        kp = [ln.strip() for ln in e["content"].split("\n\n")
              if ln.strip() and not ln.strip().startswith("#")
              and not ln.strip().startswith("**धारा") and not ln.strip().startswith("*टिप्पणी")]
        summary = kp[0] if kp else e["topic"]
        cards.append({
            "id": "urc_" + sid,
            "department": DEPT,
            "source": SRC_HI,
            "type": "rule",
            "title": f"{SRC_HI} — {e['chapter'].split('·')[-1].strip()}: {e['card_title']}",
            "summary": summary,
            "key_provisions": kp,
            "applicable_to": e["applicable_to"],
            "tags": e["tags"],
        })
    with open("urc_index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    with open("urc_cards.json", "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print(f"urc_index.json: {len(index)} chapters | urc_cards.json: {len(cards)} cards")

if __name__ == "__main__":
    build()
