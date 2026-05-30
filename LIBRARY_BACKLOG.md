# 📚 Nyaysahayak Library — Backlog & Status

> **Purpose:** Library pustakon ki permanent tracking file. Har session ke shuru mein ye padhi jaaye. Tum aur Claude dono ke liye single source of truth.
>
> **Last updated:** 30-May-2026 (**BATCH 2 IN PROGRESS** — `/res` enriched (full 79-entry OBC list + full creamy-layer + 2002 amendment detail); `/nyv` Urban Planning & Dev Act 1973 added (20 ch, dept=आवास विभाग, +20 KB → 1,554); department bot 'आवास विभाग' added; Nagar Nigam 1959/Municipalities 1916 → PURCHASE-pending; Panchayat Raj 1947 (145pp) + Kshetra/Zila 1961 (278pp) scanned → vision transcription pending multi-pass. | Earlier: **BATCH 1 DONE & PUSHED** — DA Rules 1999 +2022 GO, Reservation Act 1994, Basic Education Act 1972, RTE Act 2009; bot KB 1,434 → 1,534; **library now 9 books**; frontend cards live on library.html; next = Batch 2)
>
> **Scanner:** CZUR ET24 — being shipped from Delhi (director arranging)
>
> **Architecture:** Library = 3 categories
> 1. UP Universal (cross-cutting books)
> 2. लेखापरीक्षा एवं लेखा (AG/Audit specific)
> 3. विभाग-वार (10 departments — PWD + Health included)

---

## 🚦 NEXT SESSION — Where to start (Round 3 — 29-May-2026 onwards)

**Resume from: BATCH PROCESSING — Batch 1 DONE (9 books, KB 1,534). NEXT = BATCH 2 (Panchayat/Nagar laws + reservation rest). User must upload the 5 Batch-2 PDFs into the session before processing. Note: these Acts are clean Devanagari → transcribe from source directly, no Tesseract (OCR garbles faded scans).**

---

### 📅 DAY 2 — 10 May 2026 — CLOSED ✅ (partial)

**Acquired:** 1 book — `UP_Police_Regulations.pdf` (268pp Hindi, 22.6 MB, uppolice.gov.in official) → `05_UP_Depts/`

**Shifted to PURCHASE (consolidated source needed):**
- UP TA / GPF / Pension / Family Pension / Pay Revision / Medical Reimbursement — all scattered GOs, FHB Vol 1+5+6 + EBC + R.K. Sahay covers them
- UP Police Standing Orders — only individual DGP circulars exist; PURCHASE Phase 2 #22 (UP Police Manual Vol 1-3) covers
- UP Panchayat Sangathan Pustika — **SKIPPED entirely** (org chart, zero KB value, not even PURCHASE)
- UP Forest Manual (Vol 1/2/4) + DBT Pension Schemes — deferred to PURCHASE/later (low blocking value)

**Sessions 2.4 / 2.5 / 2.6 untouched** — buffer + audit + backup. Final Excel ledger pending. Will be folded into Round 3 pipeline phase.

**Cumulative acquisition after Day 1+2:** 31 books across 5 folders.

---

### 🔬 ROUND 3 — Hallucination Diagnostic (29-May-2026 onwards)

**Goal:** Diagnose actual hallucination source on live bot before any pipeline work. **Without diagnosis, pipeline build = blind fix.**

---

### ✅ PHASE 0 — Diagnostic + Cleanup (29-May-2026 — DONE)

**Diagnostic root cause (static analysis of `api-server.js` + `knowledge.json`):**

Bot KB was 88.6% non-Devanagari (mix of English statutory text from bilingual UP rule books + Roman Hindi transliteration). TRANSLIT map = only 48 English→Devanagari mappings. Devanagari user queries → most KB unreachable → Haiku fills gaps from training data → hallucination.

**Phase 0 cleanup executed:**

| Action | Detail | Commit |
|---|---|---|
| Bot KB: deleted 609 substandard entries | CSR (468) + FHB Vol 3 (89) + Budget Manual (52) — marked REMOVED in backlog but still live | `863ed3a` |
| Bot KB: deleted 108 wrong-script entries | UP Procurement Manual MSME (90) + Police Kalyan (12) + Allahabad HC (6) | `285ec4b` |
| Library: removed PM + Police Kalyan books | PM was English, Police Kalyan was Roman Hindi | `285ec4b` (API) + `7b5fe1e` (frontend) |
| Repo cleanup: legacy files | nyaysahayak.db (13.2 MB SQLite) + empty MDs + 3 scraper scripts | `285ec4b` |
| api-server.js: routes cleaned | Removed `/pm`, `/pm/:filename`, `/police-kalyan`, `/police-kalyan/:filename`, `pm:` from `LIBRARY_DATA` | `285ec4b` |
| Frontend `library-preview.html` | Removed PM + Police Kalyan book cards. Version bumped 7.0.0 → 7.1.0 | `7b5fe1e` |

**Post-Phase 0 state:**
- **Bot KB: 2,618 entries** (was 3,335 — 21% reduction)
  - FHB Vol 2: 2,267 (English) — **awaiting Devanagari re-ingestion**
  - Seva Vidhi Vol 4: 321 ✅ Devanagari
  - SAD Manual: 28 ✅ Devanagari
  - Seva Vidhi Vol 5: 2 ✅ Devanagari (to expand from 9.3 MB MD)
- **Library: 4 clean Devanagari books** (FHB, SAD, SV, PUVVNL)
- **Repo: clean** — no legacy SQLite, no empty MDs, no scraper scripts

---

### ✅ PHASE 1 — FHB Vol 2 re-ingestion (29-May-2026 — DONE)

**Pipeline built and executed:**
- `pipelines/fhb_vol2_reingest/extract.py` — Sonnet-based extraction with retry on 429
- `pipelines/fhb_vol2_reingest/extract_parallel.py` — ThreadPoolExecutor wrapper, workers=2 for Tier 1 rate limit
- `pipelines/fhb_vol2_reingest/integrate.py` — schema validate + atomic swap

**Execution:**
- 90 chapters extracted (idx 02-91, skipping TOC 0-1)
- 944 Devanagari fact cards produced
- Atomic swap: 2,267 English entries removed, 944 Devanagari added
- Total cost: ~$3-4 of ~$25 credits

**Card type breakdown:**
| Type | Count |
|---|---|
| rule | 470 |
| go | 362 |
| sub_rule | 28 |
| note | 47 |
| clarification | 27 |
| amendment | 17 |
| court_ruling | 5 |

**Bot KB final state: 1,295 entries — 100% Devanagari**

| Source | Entries | Script |
|---|---|---|
| FHB Vol 2 | 944 | ✅ Devanagari (new) |
| Seva Vidhi Vol 4 | 321 | ✅ Devanagari |
| SAD Manual | 28 | ✅ Devanagari |
| Seva Vidhi Vol 5 | 2 | ✅ Devanagari |

**From 88.6% non-Devanagari at Phase 0 start → 100% Devanagari at Phase 1 end.**

---

### ✅ PHASE 2a — Vitt GO Court Relevant ingested (29-May-2026 — DONE)

**Source:** `Vitt_GO_Court_Relevant.md` (29 KB, 62% Devanagari, pre-structured 106 GO entries)
**Method:** Pure structural parser — no LLM needed, zero API cost
**Pipeline:** `pipelines/vitt_go_ingest/parse.py`
**Result:** +106 Devanagari fact cards, department=`vitt`, type=`go`

**Bot KB state after Phase 2a: 1,401 entries — still 100% Devanagari**

| Source | Entries |
|---|---|
| Financial Handbook Vol 2 | 944 |
| Seva Vidhi Vol 4 | 321 |
| **Vitt GO Court Relevant** | **106 (new)** |
| SAD Manual | 28 |
| Seva Vidhi Vol 5 | 2 |

---

### ❌ PHASE 2b — BLOCKED on scanner + purchase

User principle locked: **"garbled kuch bhi mat enter karo jo best ho wahi"** — only world-class quality sources.

Sources assessed and **SKIPPED** (until clean alternatives available):

| Source | Issue | Resolution path |
|---|---|---|
| SV Vol 5 Shashnadesh (9.3 MB MD) | OCR garbage — page-by-page txt files concatenated with column-wrap issues, broken char sequences (`8 है इचुं<8 4 |e S2t`) | CZUR ET24 scanner re-OCR required |
| UP Budget Manual COMBINED (81 KB MD) | 99% English (0.1% Devanagari) | Need Devanagari edition — Govt Press purchase |
| UP Elementary Education Teacher Service Rules 2025 (13 KB) | 100% English | Need Hindi notification — defer |

---

### ✅ TIER 1 — Zero-hallucination bot (29-May-2026 — DONE)

**T1.4 — Bot prompt overhaul (commit e2aa484):**
- Added Rule 1 KB-ONLY (supreme) — refuse if KB doesn't have it
- Added ANTI-HALLUCINATION CHECKLIST + multi-script tolerance
- DELETED Rule 5A "CONFIRMED facts" (was hardcoding GPF Rule 8.7, pension 50%, gratuity formula, Anukampa GO 155/48-2018-14 — model was citing these without source)
- Cleaned dept-specific prompts (Grih: removed hardcoded GO numbers + amounts; Basic: removed "CONFIRMED facts" list)
- Updated KB inventory: 16,000+ entries → actual 1,401

**T1.1 — TRANSLIT expansion (commit 0e91211):**
- 40 → 561 entries covering pension/leave/discipline/allowances/court/documents/dept terms
- All 3 scripts supported: Hinglish/Hindi/English → Devanagari

**T1.3 — smartSearch overhaul (commits e2a8bbe + 349590b):**
- CRITICAL BUG FIX: scoring was using fields (`r.content`, `r.text`, `r.heading`, `r.keywords`) that DON'T exist in Phase-1 cards — 70% of search context was empty
- POST endpoint context construction had same bug
- Frontend buildCtx had same bug
- All fixed to use Phase-1 schema: title/summary/key_provisions[]/tags[]/chapter/rule_number
- Added IDF weighting (rare terms boost), field weights (title=5, rule_number=4, tags=3), phrase match bonus (+50), regex escape, top-K 8→12

**T1.5 — Live Haiku verification (cost: $0.02):**
- 4 test queries: Devanagari + Hinglish + English + Out-of-KB
- All passed: bot retrieves grounded answers with citations OR refuses cleanly
- No hallucination on any test
- Sample citation rendered: `[Financial Handbook Vol-2, Important GOs 50, 72]`
- SUGGESTIONS format intact on all responses

---

### ✅ TIER 2 — Library quality (29-May-2026 — DONE)

**T2.1 — SV Vol 4 library re-ingest (commit 985fa64):**
- Replaced OCR-garbled `sv_index.json` (20.8 MB with `[cite_start]`, `|=`, `* 050 सेवा विधि` fragments)
- Built `pipelines/sv4_library_rebuild/parse.py` — pure parser, zero API cost
- 18 clean entries covering विषय-सूची + अध्याय 1-15 (with sub-volumes for ch9, ch10)
- 867 KB of clean Devanagari content, all entries verified ✓ CLEAN
- Stripped: 594 [cite_start] markers, all [cite: N] closures, OCR-page H3 markers
- Merged orphan H2 "अध्याय 4" with its title-only H2 "तदर्थ नियुक्ति एवं विनियमितीकरण"

**T2.2 — Library frontend dead code cleanup (commit 08409f8):**
- Removed all PM (Procurement Manual) + Police Kalyan JS routing
- BOOKS endpoint config, BOOK_NAMES citation map, 4× currentBookCode() variants, 2× police search guards — all purged
- Library now references exactly 4 books: FHB, SAD, SV, PUVVNL

**T2.3 — 3-mode library search verification:**
- Tested 10 queries × 4 books with new TRANSLIT
- 9/10 queries return relevant matches across 3+ books
- New clean SV Vol 4 returns Devanagari content snippets correctly
- Only gap: "character" → चरित्र पंजी missing in TRANSLIT (minor; future improvement)

**T2.4 — Bot KB cleanup + search ranking critical fixes (post-live-test):**

Five live test rounds revealed cumulative issues, each fixed in turn:

1. **Bot too conservative** — refused queries where KB had related content.
   Fix: Rule 1 → ternary scenarios (full / partial+gap / refuse). [Commit 46a342d]

2. **Citation showed "Universal KB"** instead of actual source.
   Fix: searchKB _book fallback uses e.source. [Commit 46a342d]

3. **SV4 bot KB had [cite_start] markers** leaking into responses.
   Fix: stripped 905 markers from 151 SV4 entries in knowledge.json. [Commit 4a00c71]

4. **CRITICAL — rule-number-specific queries (e.g. "मूल नियम 22-बी") still
   returned tangentially-relevant SV4 cards in top 5 even after limits 6→12
   and letter algorithmic expansion.

   Root cause: expandQuery split query into words but NEVER added the
   individual words to terms list. Only the full query string and TRANSLIT
   lookups became terms. For "मूल नियम 22-बी", the term "22-बी" was completely
   absent from terms — bonus checks couldn't fire, scoring couldn't reward
   targeted rule_number matches. SV4 cards with huge bodies of common terms
   ("नियम", "मूल" appearing 50+ times) won by raw accumulation.

   Bundled fix in commit bb41920:
   - `terms.push(...words)` after split (the actual root-cause fix)
   - rule_number exact-match bonus +80 (digit-containing terms only)
   - file_number exact-match bonus +60
   - TF saturation cap=3 per field per term (prevents body-volume dominance)

   Final live test for "मूल नियम 22-बी का प्रावधान बताइए": bot answers with
   structured content from 3 FHB cards (वेतन निर्धारण विकल्प, वेतनवृद्धि की तारीख,
   ACP के अंतर्गत वेतन निर्धारण) with full citations including rule_number.

---

### ✅ NEW BOOK — UP Aacharan Niyamavali 1956 (30-May-2026 — DONE)

- **Source:** free-download PDF, Krutidev font encoded
- **Method:** Tesseract Hindi OCR @ 300 DPI — ZERO API cost
- **Pipeline (reusable):** `pipelines/krutidev_ocr/ocr_pipeline.py`
- **Bot KB:** 1,401 → 1,434 entries (33 rules added, source=`UP Aacharan Niyamavali 1956`)
- **Library:** 5th book card; `/aacharan` endpoint; `aacharan_index.json`

**Bot KB state: 1,434 entries — 100% Devanagari, 6 sources**

| Source | Entries |
|---|---|
| Financial Handbook Vol 2 | 944 |
| Seva Vidhi Vol 4 | 321 |
| Vitt GO Court Relevant | 106 |
| **UP Aacharan Niyamavali 1956** | **33 (new)** |
| SAD Manual | 28 |
| Seva Vidhi Vol 5 | 2 |

**Library: 5 books** — FHB, SAD, SV, PUVVNL, Aacharan.

Today's bundled fixes also in repo: search root-cause fix (commit bb41920, `terms.push(...words)` + rule_number/file_number bonuses + TF cap), Rule 1 ternary tuning (commit 46a342d, full / partial+gap / refuse), SV4 KB cleanup (commit 4a00c71, 905 `[cite_start]`/`[cite: N]` markers stripped from 151 entries). Live test: 5/5 categories pass (full / partial+gap / refuse / rule lookup / transfer policy).

---

### 🚦 NEXT TASK — Batch process 25 Desktop PDFs (Krutidev OCR, ZERO API cost)

**Classification locked:**
- **Tier A (Bot KB + Library):** 15 books with rule structure (Acts/Rules)
- **Tier B (Library only):** 10 books (Constitution, FC reports, AG audits, scheme guidelines)

**Per-upload process:** (1) Tesseract Hindi OCR @ 300 DPI → (2) quality check: Devanagari %, garbage markers, structure → (3) Tier A → bot KB cards + library chapters; Tier B → library only → (4) append to `knowledge.json` + `book_index.json` + endpoint + frontend card → (5) commit + push both repos.

**5 batches (5 PDFs each):**
- **Batch 1 (DONE ✅ pushed):** DA Rules 1999 (`/dar` 19ch, 2022 GO folded as Do's/Don'ts appendix) + Reservation Act 1994 (`/res` 18ch) + Basic Education Act 1972 (`/bea` 23ch) + RTE Act 2009 (`/rte` 40ch). +100 KB cards (1434→1534). Both repos pushed; frontend cards live. Builders: pipelines/krutidev_ocr/build_batch1_part1.py & part2.py
- **Batch 2 (IN PROGRESS):**
  - ✅ `/res` ENRICHED — अनुसूची-एक full 79-entry OBC list + अनुसूची-दो full creamy-layer criteria + धारा 3 अग्रनयन/रोस्टर detail (the 2 uploaded reservation PDFs were already in /res as thin summaries → completeness upgrade, no new route).
  - ✅ `/nyv` Urban Planning & Development Act 1973 — 20 ch, dept=आवास विभाग, +20 KB cards (1534→1554). Routes + LIBRARY_DATA + frontend card + 'आवास विभाग' department bot added.
  - ⏳ `/prj` UP Panchayat Raj Act 1947 (145pp scanned) — vision transcription pending (dept=पंचायती राज विभाग).
  - ⏳ `/kzp` UP Kshetra Panchayat & Zila Panchayat Act 1961 (278pp scanned) — vision transcription pending (dept=पंचायती राज विभाग).
  - 🛒 UP Municipalities 1916 / Nagar Nigam 1959 — NOT uploaded → PURCHASE (dept=नगर विकास विभाग).
  - ❓ reservation-rest (promotion/divyang) — NOT in uploaded files; uploaded reservation PDFs were base-Act amendment + creamy layer (folded into /res). Needs separate source if still wanted.
- **Batch 3:** UP_Police_Regulations + Civil_Accounts_Manual
- **Batch 4:** Vittiya Sakshyankan + CAG_DPC + GFR_2017
- **Batch 5:** All Tier B (Constitution, FC reports, AG audits, scheme guidelines)

---

### 🎯 NEXT: TIER 3 — Enhancements (deferred)

1. SV Vol 4 library re-ingestion from clean MD (`SevaVidhi_Vol4_Nivritti.md` 2.2 MB) — replaces OCR-garbled `sv_vol4_index.json` + `sv_index.json`
2. SV Vol 5 Shashnadesh expansion (`SevaVidhi_Vol5_Shashnadesh.md` 9.3 MB) → ~1,000-2,000 new Devanagari KB entries (untapped goldmine)
3. Vitt GO Court Relevant ingest (`Vitt_GO_Court_Relevant.md` 65 KB) → ~50-100 KB entries
4. Day 1+2 PDFs OCR pipeline (30 PDFs) → multi-week project

---

---

### Resume command for new chat

> *"Library project resume — Round 3. Pehle GitHub se LIBRARY_BACKLOG.md padho — repo dbsofficelko-debug/nyaysahayak-api. Section '🔬 ROUND 3 — Hallucination Diagnostic' follow karo. Phase A se start (test case collection)."*

---

---

### 🎯 STRATEGIC PIVOT (09-May-2026)

**Launch dates dropped.** 5-July deadline aur officer seeding plan abhi ke liye hold par.

**Naya goal:** World-class state-of-art library + bot + PWA. Specifically — **Dastavej Nirmata (DocGen) ki RAG world-best ho.**

**Reasoning:**
- 2-year horizon hai — competitors AI tools ke saath aane lagenge tab tak
- Tab tak quality moat ready chahiye
- Monetization differentiator = zero hallucination
- 8 hrs/day commitment confirm

**Quality > speed always.** Substandard data delete karte hain. Padding nahi. Honest data quality issues flag karte hain.

#### 🔬 Post-Marathon Priorities (Round 3 onwards)

1. **Bot hallucination diagnostic** — 5-10 actual hallucinating queries ke samples lo, failure mode identify karo (font garbling / chunking / retrieval / prompt template). User confirm: UP Vitt/Karmik/Nyay/Anya GOs Kruti Dev mein hain (garbled). Lekin existing KB (FHB Vol 2 + SAD Manual) clean MD mein hain — to actual hallucination source aur kahin hai, diagnostic se confirm hoga.

2. **One-time targeted pipeline build** — Root cause ke clean fix par. If font issue → Kruti Dev/DevLys → Unicode converter + OCR fallback (Tesseract Hindi already installed). Architecture: PDF input → font detect → conversion path → Unicode .md output → library chapter version + bot RAG chunks. **One scan, two products** principle preserved.

3. **Existing 6 KB books validation** — FHB Vol 2, SAD Manual, PM, PUVVNL, SV-4, Police Kalyan — re-process through pipeline.

4. **Day 1-2 ke 30+ books processing** — pipeline ke through.

5. **Phase 2 content expansion** — 37 purchase books across 3 phases + remaining free downloads. **Sirf clean pipeline ke through.**

6. **Officer seeding (10 log)** — sirf jab bot production-quality ho. Pehle nahi. Until then: content-priority-feedback WhatsApp message use karenge — sirf list dikhao, bot expose nahi karo.

---

## 🗓 2-DAY DOWNLOAD MARATHON (09-10 May 2026) — historical reference

**Target:** 42 books in 20 hrs (Batch 1 ke 2 already done).
**Realistic:** 35-40 books mil jayenge — kuch UP portal pe broken/missing honge.

**Skip rule:** Har book par max 10 min. Na mile to "MISSING" log karo aur agla. Time waste nahi.
**Per book ka workflow:** Search → Download PDF → Rename per naming convention → Move to correct folder → Tick log.

**Folder structure:**
```
~/Desktop/UP_Govt_Knowledge_Base/00_Downloads/
├── 01_IndiaCode/      (UP Acts — 11 total target)
├── 02_UP_Vitt/        (Pension/LTC/TA/GPF/Pay — 6)
├── 03_UP_Karmik/      (Conduct/DA/Reservation — 3)
├── 04_Central/        (GFR/Constitution/Schemes — 10)
├── 05_UP_Depts/       (Police/Forest/Panchayat/SSPY — 5)
└── 06_AG_Audit/       (CAG/AG manuals — 4)
```

---

### 📅 DAY 1 — 09 May 2026 (10 hrs)

**Session 1.1 — IndiaCode UP Acts batch (1.5 hr) — 9 books**

URL: https://www.indiacode.nic.in
Save: `01_IndiaCode/`

| # | Search query | Save naam |
|---|---|---|
| 15 | `UP Panchayat Niwachan` | `UP_Panchayat_Niwachan.pdf` |
| 16 | `UP Revenue Code 2006` | `UP_Revenue_Code_2006.pdf` |
| 17 | `UP Stamp Act` | `UP_Stamp_Act.pdf` |
| 18 | `UP Intermediate Education Act 1921` | `UP_Intermediate_Education_Act_1921.pdf` |
| 19 | `UP Basic Education Act 1972` | `UP_Basic_Education_Act_1972.pdf` |
| 20 | `UP Municipalities Act 1916` | `UP_Municipalities_Act_1916.pdf` |
| 21 | `UP Nagar Nigam Adhiniyam 1959` | `UP_Nagar_Nigam_Adhiniyam_1959.pdf` |
| 22 | `UP Urban Planning Development Act 1973` | `UP_Urban_Planning_Act_1973.pdf` |
| 23 | `UP Apartment Act 2010` | `UP_Apartment_Act_2010.pdf` |
| 24 | `UP Industrial Area Development Act 1976` | `UP_Industrial_Area_Dev_Act_1976.pdf` |
| 25 | `UP Housing Development Act` | `UP_Housing_Dev_Act.pdf` |

---

**Session 1.2 — Constitution + GFR (1 hr) — 3 books**

| Source URL | Book | Save naam | Folder |
|---|---|---|---|
| https://legislative.gov.in/constitution-of-india/ | Constitution of India Hindi | `Constitution_of_India_Hindi.pdf` | `04_Central/` |
| https://doe.gov.in (search "GFR 2017") | GFR 2017 + 2024 amendments | `GFR_2017.pdf` | `04_Central/` |
| https://doe.gov.in (search "Government Accounts Format Rules 2017") | Govt Accounts Format Rules 2017 | `Govt_Accounts_Format_Rules_2017.pdf` | `06_AG_Audit/` |

---

**Session 1.3 — CAG + Education central (1.5 hr) — 4 books**

| Source | Book | Save naam | Folder |
|---|---|---|---|
| https://cag.gov.in (search "DPC Act 1971") | C&AG (DPC) Act 1971 | `CAG_DPC_Act_1971.pdf` | `06_AG_Audit/` |
| https://cag.gov.in (search "MSO Audit") | CAG Manual Standing Orders Audit | `CAG_MSO_Audit.pdf` | `06_AG_Audit/` |
| https://cag.gov.in (search "Receipt Audit Manual") | Receipt Audit Manual | `CAG_Receipt_Audit_Manual.pdf` | `06_AG_Audit/` |
| https://cag.gov.in/uttar-pradesh (Reports tab) | AG Audit Reports UP — recent 5 | `AG_UP_Reports_*.pdf` (multiple) | `06_AG_Audit/` |
| https://www.education.gov.in (search "RTE Act 2009") | RTE Act 2009 | `RTE_Act_2009.pdf` | `04_Central/` |

---

**Session 1.4 — Centrally Sponsored Schemes (1.5 hr) — 6 books**

| Source URL | Book | Save naam |
|---|---|---|
| https://nrega.nic.in | MGNREGA Operational Guidelines (Hindi) | `MGNREGA_Hindi_Guidelines.pdf` |
| https://pmayg.nic.in | PMAY-G Operational Manual | `PMAY_G_Operational_Manual.pdf` |
| https://www.pmuy.gov.in | PM Ujjwala Yojana guidelines | `PM_Ujjwala_Guidelines.pdf` |
| https://swachhbharatmission.gov.in | SBM Rural guidelines | `SBM_Rural_Guidelines.pdf` |
| https://fincomindia.nic.in | 14th + 15th Finance Commission grants | `Finance_Commission_14_15.pdf` |
| https://nhm.gov.in | NHM Operational Guidelines | `NHM_Operational_Guidelines.pdf` |

Save folder: `04_Central/`

---

**Session 1.5 — UP Karmik (1 hr) — 3 books**

URL: https://niyukti.up.gov.in (legitquest.com fallback)
Save: `03_UP_Karmik/`

| # | Book | Save naam |
|---|---|---|
| 1 | UP Conduct Rules 1956 | `UP_Conduct_Rules_1956.pdf` |
| 2 | UP Discipline & Appeal Rules 1999 | `UP_DA_Rules_1999.pdf` |
| 6 | UP Reservation Rules 1994 | `UP_Reservation_Rules_1994.pdf` |

---

**Session 1.6 — UP Vitt morning batch (2.5 hr) — 3 books**

URL: https://shasanadesh.up.gov.in (Vitt Vibhag filter) + https://upfin.up.gov.in
Save: `02_UP_Vitt/`

⚠ **Slowest segment** — Vitt Vibhag ke "Rules" alag-alag GO/notifications mein bikhre hote hain. Latest consolidated GO dhundo.

| # | Book | Save naam |
|---|---|---|
| 3 | Pay Revision Rules (5th/6th/7th CPC) — 3 separate consolidated GOs | `UP_Pay_Revision_5th.pdf`, `_6th.pdf`, `_7th.pdf` |
| 4 | UP Pension Rules notifications (consolidated) | `UP_Pension_Rules.pdf` |
| 5 | UP Family Pension Rules | `UP_Family_Pension_Rules.pdf` |

---

**Session 1.7 — Break + organize/verify (1 hr)**
- Sab folders mein PDFs check karo — kya saare ke saare proper khulte hain
- 0-page / corrupt PDFs delete karo, re-download
- MISSING ka log file banao: `00_Downloads/MISSING.txt`

**Day 1 total target: ~28 books**

---

### 📅 DAY 2 — 10 May 2026 (10 hrs)

**Session 2.1 — UP Vitt remaining (2 hr) — 3 books**

URL: https://shasanadesh.up.gov.in (Vitt) + https://upfin.up.gov.in
Save: `02_UP_Vitt/`

| # | Book | Save naam |
|---|---|---|
| 7 | UP LTC Rules | `UP_LTC_Rules.pdf` |
| 8 | UP TA Rules | `UP_TA_Rules.pdf` |
| 9 | GPF (UP) Rules | `UP_GPF_Rules.pdf` |

---

**Session 2.2 — UP Chikitsa (0.5 hr) — 1 book**

URL: UP Chikitsa Vibhag (https://chikitsashiksha.up.nic.in / DG Health UP)
Save: `02_UP_Vitt/` (or new `07_UP_Chikitsa/`)

| # | Book | Save naam |
|---|---|---|
| 10 | UP Medical Reimbursement Rules | `UP_Medical_Reimbursement_Rules.pdf` |

---

**Session 2.3 — UP Departments (2 hr) — 5 books**

Save: `05_UP_Depts/`

| # | Source URL | Book | Save naam |
|---|---|---|---|
| 40 | https://upprd.gov.in | Panchayat Vibhag Sangathan Pustika | `UP_Panchayat_Sangathan_Pustika.pdf` |
| 41 | https://uppolice.gov.in (Standing Orders section) | UP Police Standing Orders compilation | `UP_Police_Standing_Orders.pdf` |
| 42 | https://uppolice.gov.in (Regulations) | UP Police Regulations (older edition) | `UP_Police_Regulations.pdf` |
| 43 | https://upforest.gov.in | UP Forest Manual | `UP_Forest_Manual.pdf` |
| 44 | https://sspy-up.gov.in | DBT Pension Schemes (Vridh/Vidhwa/Divyang) | `UP_DBT_Pension_Schemes.pdf` |

---

**Session 2.4 — Buffer + re-search MISSING list (2.5 hr)**

`MISSING.txt` mein jo books hain unhe legitquest.com / lawmin.gov.in / archive.org alternative se try karo. Phir bhi na mile to bole "PURCHASE list mein move karo" — backlog update karenge.

---

**Session 2.5 — Quality audit + ledger (1.5 hr)**

- Sab folders ki ek master CSV banao (Excel mein):
  ```
  Book Name | Filename | Pages | File Size | Quality (Good/Searchable/Scanned) | OCR Needed (Y/N) | Notes
  ```
- 2 columns: ready-for-OCR vs needs-better-source

---

**Session 2.6 — Backup (1.5 hr)**
- Google Drive folder banao: "DBS / Nyaysahayak / Library Source PDFs"
- Pure `00_Downloads/` folder upload — auto-sync set karo
- GitHub mein backlog update push karo with MISSING + ACQUIRED lists

**Day 2 total target: 14 books + audit + backup**

---

## 📊 Cumulative Acquisition Target after 10-May

| Folder | Target | Effort |
|---|---|---|
| 01_IndiaCode | 13 books (2 done + 11 new) | Easy |
| 02_UP_Vitt | 6 books | Hard (scattered) |
| 03_UP_Karmik | 3 books | Medium |
| 04_Central | 10 books | Easy-Medium |
| 05_UP_Depts | 5 books | Medium |
| 06_AG_Audit | 5 books | Medium |
| **TOTAL** | **42 books** | — |

Realistic: 35-40 mil jayenge. 4-9 missing → Purchase list mein move ya next month re-attempt.

CZUR ET24 scanner aate hi → in PDFs ko OCR karke `*_index.json` banayenge → library mein add → bot KB mein chunks → live by 5 July 2026 launch.

---

### Frontend / Backend stages — ON HOLD until book downloads progress

Stage 1 (Content audit) ✅ done
Stage 2 (Backend cleanup + index files) ✅ done — Tier 1 live with 6 books
Stage 3A (Frontend design mockup) — DONE via library-preview.html
Stage 3B (Frontend full build) ✅ done 08-May (Block 3+4)
Stage 4 (Reader UI universal) ✅ done 08-May
Stage 5 (Cross-book search results) ⏳ future — currently per-book only via `/library/search`
Stage 6 (Polish + mobile + citation copy) ⏳ future
Police Kalyan `/police` endpoint ⏳ future (~30 min work after `pk_index.json` made)
Bot KB cleanup (FHB/PM bad entries) ⏳ low priority

---

---

## ✅ LIVE in Library (Quality verified — Tier 1)

| Book | Endpoint | Chapters | Category | Last Updated |
|---|---|---|---|---|
| वित्तीय हस्त-पुस्तिका, खण्ड-दो (FHB Vol 2) | `/fhb` | 92 | UP Universal | 06-May-2026 |
| उ.प्र. सचिवालय अनुदेश संग्रह (SAD Manual) | `/sad` | 28 | UP Universal | 06-May-2026 |
| उ.प्र. क्रय नियमावली (Procurement Manual MSME) | `/pm` | 49 | UP Universal | 06-May-2026 |
| विद्युत विभाग संग्रह (PUVVNL — 7 sub-books) | `/puvvnl` | 25 | विभाग | 06-May-2026 |
| उ.प्र. सेवा विधि, खण्ड-चार (Nivritti) | `/sv` | 14 | UP Universal | 06-May-2026 |
| पुलिस कल्याण हस्तपुस्तिका, 2012 | `/police-kalyan` | 12 | गृह विभाग | 06-May-2026 |

**Total live:** ~220 chapters + 12 GOs

### Known minor issues (fix backlog):
- [ ] FHB Vol 2 — 1 OCR garbage entry needs cleanup
- [ ] Procurement Manual — 2 bad chapter titles need fixing
- [ ] Police Kalyan — verify if any entries are actually Sevayojan/Grih (memory note: SEWAYOJAN_SAINIK_KALYAN_ANUBHAG.pdf is Grih, not Police Kalyan)

---

## 🟡 PENDING — Source available, processing needed

| Book | Source Location | Status | Action |
|---|---|---|---|
| उ.प्र. सेवा विधि, खण्ड-1 (Niyukti) | `~/Downloads/SevaVidhi_Part1.md` | MD ready | Split into chapters → push |
| उ.प्र. सेवा विधि, खण्ड-2 (Seva Sharti) | `~/Downloads/SevaVidhi_Part2.md` | MD ready | Split into chapters → push |
| उ.प्र. सेवा विधि, खण्ड-3 (Pronnati) | `~/Downloads/SevaVidhi_Part3.md` | MD ready | Split into chapters → push |
| वित्तीय हस्त-पुस्तिका, खण्ड-तीन (FHB Vol 3) | Source MD/PDF | Need source location | User needs to share |
| Civil Service Regulations (CSR) | Source MD/PDF | Need source location | User needs to share |
| उ.प्र. बजट मैनुअल (Full) | `~/Downloads/UP_Budget_Manual/` (chapters 1-19) | PDFs partial-readable | OCR + full process |
| GFR 2017 (with 2024 amendments) | `~/Downloads/PDFs/GFR2017.pdf`, `FInal_GFR_upto_31_07_2024.pdf` | PDFs scanned | OCR needed |
| उ.प्र. सैनिक स्कूल नियमावली, 1978 | `~/Downloads/UP Sainik School Rules 1978.pdf` | Scanned | OCR + process |
| उ.प्र. बेसिक विद्यालय (जू.हा.) नियमावली, 1978 | `~/Downloads/The U.P. Recognised Basic Schools...1978.pdf` | Scanned | OCR + process |
| उ.प्र. बेसिक शिक्षा (अध्यापक) नियमावली, 1981 | `~/Downloads/The U.P. Basic Education...1981.pdf` | Scanned | OCR + process |
| Karya Niyamavali 1975 | `~/Downloads/PDFs/karya niymavali 1975.pdf` | Scanned | OCR + process |

---

## 📦 ACQUIRE — Need to purchase / source

> **Two-list strategy lock (06-May-2026):**
> - **DOWNLOAD list:** Statutory texts available free on govt portals — process via CZUR ET24 scanner once received
> - **PURCHASE list:** Commentaries + UP-specific printed editions not available online — phased buy over 3-4 months, budget ~₹1.5-2 lakh

---

### 📥 DOWNLOAD LIST (Free — 44 books)

**A. UP State Statutory Rules (10)**

| # | Book | Source URL |
|---|---|---|
| 1 | UP Conduct Rules 1956 | legitquest.com / IndiaCode |
| 2 | UP Discipline & Appeal Rules 1999 | legitquest.com / niyukti.up.gov.in |
| 3 | UP Pay Revision Rules (5th/6th/7th CPC) | UP Vitt Vibhag website |
| 4 | UP Pension Rules notifications | UP Vitt Vibhag |
| 5 | UP Family Pension Rules | UP Vitt Vibhag |
| 6 | UP Reservation Rules 1994 | UP Karmik Vibhag |
| 7 | UP LTC Rules | UP Vitt notifications |
| 8 | UP TA Rules (notification) | UP Vitt |
| 9 | GPF (UP) Rules | UP Vitt |
| 10 | UP Medical Reimbursement Rules | UP Chikitsa Vibhag |

**B. UP Acts — Department-wise (15)**

| # | Book | Source |
|---|---|---|
| 11 | UP Panchayat Raj Act 1947 + amendments | upgov.nic.in / IndiaCode |
| 12 | UP Panchayat Raj Sanshodhan Act 1994 | IndiaCode |
| 13 | Kshetra Panchayat Adhiniyam 1961 | IndiaCode |
| 14 | Zila Panchayat Adhiniyam 1958 | IndiaCode |
| 15 | UP Panchayat Niwachan Niyam | UP Election Commission |
| 16 | UP Revenue Code 2006 | bor.up.nic.in |
| 17 | UP Stamp Act | UP Stamps & Registration |
| 18 | UP Intermediate Education Act 1921 | upmsp.edu.in |
| 19 | UP Basic Education Act 1972 | basicshikshaup.gov.in |
| 20 | UP Municipalities Act 1916 | UP Nagar Vikas |
| 21 | UP Nagar Nigam Adhiniyam 1959 | UP Nagar Vikas |
| 22 | UP Urban Planning & Development Act 1973 | UP Awas |
| 23 | UP Apartment Act 2010 | UP Awas |
| 24 | UP Industrial Area Development Act 1976 | UP Awas |
| 25 | UP Housing & Development Act | UP Awas |

**C. Central Govt — free (10)**

| # | Book | Source |
|---|---|---|
| 26 | GFR 2017 (with 2024 amendments) | doe.gov.in |
| 27 | C&AG (DPC) Act 1971 | cag.gov.in |
| 28 | RTE Act 2009 + UP rules | mhrd.gov.in |
| 29 | MGNREGA Operational Guidelines (Hindi) | nrega.nic.in |
| 30 | PMAY-G Operational Manual | pmayg.nic.in |
| 31 | PM Ujjwala Yojana guidelines | pmuy.gov.in |
| 32 | Swachh Bharat Mission Rural guidelines | swachhbharatmission.gov.in |
| 33 | 14th & 15th Finance Commission grants | fincomindia.nic.in |
| 34 | NHM Operational Guidelines | nhm.gov.in |
| 35 | Constitution of India (Bare Act) | indiacode.nic.in |

**D. AG/Audit — free (4)**

| # | Book | Source |
|---|---|---|
| 36 | CAG Manual of Standing Orders (Audit) | cag.gov.in |
| 37 | Government Accounts (Format) Rules 2017 | doe.gov.in |
| 38 | AG Audit Reports — UP (last 5 years) | cag.gov.in/uttar-pradesh |
| 39 | Receipt Audit Manual | cag.gov.in |

**E. Department Free Manuals (5)**

| # | Book | Source |
|---|---|---|
| 40 | UP Panchayat Vibhag Sangathan Pustika | upprd.gov.in |
| 41 | UP Police Standing Orders compilation | uppolice.gov.in |
| 42 | UP Police Regulations (older edition) | uppolice.gov.in |
| 43 | UP Forest Manual | upforest.gov.in |
| 44 | DBT Pension Schemes (Vridhavastha/Vidhwa/Divyang) | sspy-up.gov.in |

---

### 💰 PURCHASE LIST (~₹1.26 lakh + buffer — 37 books)

**Phase 1 — Foundation (Month 1, ~₹27,300)**

| # | Book | Author/Publisher | Approx ₹ |
|---|---|---|---|
| 1 | Disciplinary Proceedings | R.S. Kabra (Universal) | 3,500 |
| 2 | UP Service Rules (Hindi commentary) | G.S. Pandey | 2,500 |
| 3 | Service Jurisprudence | Justice R.B. Mehrotra | 4,000 |
| 4 | Civil Services Conduct Rules | Patwardhan | 2,500 |
| 5 | Pension Laws | R.K. Sahay (Universal) | 2,500 |
| 6 | FHB Vol 1 | Alia Agency | 1,500 |
| 7 | FHB Vol 5 (GPF/Funds) | Alia Agency | 1,800 |
| 8 | FHB Vol 6 (Pension printed) | Alia Agency | 2,000 |
| 9 | UP Karya Niyamavali 1975 (printed) | Alia Agency | 500 |
| 10 | UP TA Rules (Hindi annotated) | EBC | 500 |
| 11 | G.S. Pandey — Panchayat Raj Adhiniyam Tikatmak | Universal | 2,500 |
| 12 | R.D. Verma — Panchayat Adhiniyam | Universal | 2,000 |
| 13 | MGNREGA Practical Guide | Allahabad publisher | 1,500 |

**Phase 2 — Department + Court (Month 2-3, ~₹44,700)**

| # | Book | Author | Approx ₹ |
|---|---|---|---|
| 14 | Land Laws of UP | D.P. Singh | 3,500 |
| 15 | UP Revenue Code commentary | R.D. Saxena | 3,000 |
| 16 | UP Intermediate Education Act commentary | Saxena | 2,500 |
| 17 | Police Laws | K.D. Gaur | 2,500 |
| 18 | UP Educational Code | Mishra/Universal | 2,000 |
| 19 | UP Land Acquisition commentary | Kanaihiya | 3,000 |
| 20 | Aided College Service disputes — case digest | Allahabad publisher | 1,500 |
| 21 | UP PWD Manual (Vol 1, 2, 3) | Govt Press / Alia | 4,500 |
| 22 | UP Police Manual (Vol 1, 2, 3) | Govt Press / Alia | 4,500 |
| 23 | UP Medical Code (printed) | Govt Press | 1,500 |
| 24 | UP Stamp Manual (Hindi) | Govt Press | 2,000 |
| 25 | Patwari Manual | Alia | 1,500 |
| 26 | UP Tehsildar Manual | Alia | 1,200 |
| 27 | Code of Civil Procedure (annotated) | Sanjeev Row / EBC | 4,500 |
| 28 | Code of Criminal Procedure | R.V. Kelkar | 2,500 |
| 29 | Allahabad HC Rules | Allahabad Law Agency | 1,500 |
| 30 | GFR 2017 Annotated | Sumeet Malik / Ravi Puliani | 3,000 |

**Phase 3 — Premium Reference (Month 4, ~₹44,000)**

| # | Book | Author | Approx ₹ |
|---|---|---|---|
| 31 | Service Law in India (multi-vol set) | Justice S.K. Kaushik | 15,000 |
| 32 | Indian Constitutional Law | M.P. Jain | 4,500 |
| 33 | D.D. Basu — Shorter Constitution | LexisNexis | 8,000 |
| 34 | Halsbury's Laws of India — Service Law vol | LexisNexis | 6,000 |
| 35 | Employment Law | Sumeet Malik | 3,500 |
| 36 | Allahabad High Court Practice & Procedure | Allahabad Law Agency | 2,500 |
| 37 | Recent Supreme Court Service Law Digest (last 5 yrs) | Universal | 4,500 |

**Total purchase: ~₹1,26,000 + ~₹10,000 buffer = ₹1,36,000**

Budget ₹2 lakh — bachat ~₹64,000 for premium digests, AHC tribunal cases, backup copies.

---

### 🛒 Suppliers

| Supplier | Specialty | Mode |
|---|---|---|
| Alia Agency (Sales), Lucknow | FHB volumes, UP printed | Direct visit / phone |
| Eastern Book Co. (EBC), Lucknow | Sanjeev Row, commentaries | ebcwebstore.com |
| Universal Law Publishing, Delhi | Pension/Service rules, Kabra | universallaw.in |
| LexisNexis | D.D. Basu, Halsbury's, M.P. Jain | lexisnexis.in |
| Allahabad Law Agency | HC practice, compilations | Allahabad direct |

**Tip:** EBC + Universal often offer 20-30% bulk discount on orders >₹15K — combine purchases.

---

## 🛠 Scanning + Processing System (post CZUR ET24)

**Scanner:** CZUR ET24 — being shipped from Delhi (director). State-of-the-art for non-destructive book scanning, Hindi+English OCR built-in.

**Software stack:**
- CZUR Aura Plus desktop client (free)
- Adobe Acrobat Pro / Foxit (page management)
- Tesseract OCR with Hindi pack (already installed)
- ImageMagick (batch processing)

**Workflow (to be built):**
1. CZUR scan → output folder
2. Auto-OCR with Hindi+English
3. Chapter detection (auto-split)
4. Generate index JSON in consistent schema
5. Quality check (no garbage titles)
6. Auto-commit to GitHub
7. Auto-update LIBRARY_BACKLOG.md

**Twin-pipeline (Library + Bot):**
- Library pipeline → chapter-wise full content
- Bot RAG pipeline → small chunks with citations
- One scan, two products

---

## 📦 ACQUIRE — Legacy entries (now superseded by lists above)


---

## 🏛 DEPARTMENT-WISE EXPANSION (10 departments planned)

> Strategy: Har department ke liye 2-5 core rule books + GO compilations.

| # | Department | Status | Pending Books |
|---|---|---|---|
| 1 | गृह विभाग (Civil Police, PAC, Fire) | 🟡 Started (Police Kalyan live) | UP Police Regulations, Fire Service Rules, PAC Rules, Sewayojan-Sainik Kalyan section |
| 2 | राजस्व विभाग | ⚪ Not started | UP Revenue Code, Land Records Manual, Stamp Manual |
| 3 | सचिवालय प्रशासन विभाग | 🟢 Largely covered (SAD Manual live) | Recent SAD circulars |
| 4 | पंचायती राज विभाग | ⚪ Not started | UP Panchayat Raj Act, Gram Panchayat Rules, ZP Rules |
| 5 | माध्यमिक शिक्षा विभाग | ⚪ Not started | UP Intermediate Education Act, Aided College Service Rules |
| 6 | बेसिक शिक्षा विभाग | 🟡 Source PDFs available | Two teacher rules (1978 + 1981), Basic Shiksha Adhikari manual |
| 7 | नगर विकास विभाग | ⚪ Not started | UP Municipalities Act, Nagar Nigam Adhiniyam, Building Bye-laws |
| 8 | आवास एवं शहरी नियोजन | ⚪ Not started | UP Apartment Act, Land Acquisition rules, Town Planning Act |
| 9 | लोक निर्माण विभाग (PWD) | ⚪ Not started | PWD Manual, PWD Account Code, PWA Code |
| 10 | चिकित्सा एवं स्वास्थ्य विभाग | ⚪ Not started | UP Medical Code, Drug Procurement Rules, NHM Guidelines |

---

## 📊 लेखापरीक्षा एवं लेखा (Audit & Accounts) — AG Audience

| Book | Status |
|---|---|
| CAG Manual of Standing Orders (Audit) | ⚪ To acquire |
| Local Audit Manual (UP) | ⚪ To acquire |
| Government Accounts Manual | ⚪ To acquire |
| Recent AG Audit Reports (UP) | ⚪ To acquire |

---

## 🔄 Update Protocol

Jab bhi koi book add/remove/update ho:
1. Is file ko update karo
2. `Last updated` date change karo
3. Git commit message mein "Library backlog updated: <reason>" likho

---

## ❌ REMOVED (data quality issues — not library-grade)

| Book | Reason | Date |
|---|---|---|
| FHB Vol 3 (89 page-blocks) | No chapter structure, mid-page fragments | 06-May-2026 |
| CSR (468 mid-sentence fragments) | Bot-grade chunks, not readable as library | 06-May-2026 |
| Budget Manual partial (10 of 19 chapters) | Chapters I-IX missing — incomplete | 06-May-2026 |
| Seva Vidhi Vol 1 index (empty) | 0 entries | 06-May-2026 |
| Seva Vidhi Vol 2 index (3 entries) | Severely incomplete | 06-May-2026 |
| Seva Vidhi Vol 3 index (2 entries) | Severely incomplete | 06-May-2026 |

→ Removed books should NOT appear in library frontend until full quality data is restored.
