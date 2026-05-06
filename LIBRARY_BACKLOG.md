# 📚 Nyaysahayak Library — Backlog & Status

> **Purpose:** Library pustakon ki permanent tracking file. Har session ke shuru mein ye padhi jaaye. Tum aur Claude dono ke liye single source of truth.
>
> **Last updated:** 06-May-2026 (evening — book acquisition lists finalized)
>
> **Scanner:** CZUR ET24 — being shipped from Delhi (director arranging)
>
> **Architecture:** Library = 3 categories
> 1. UP Universal (cross-cutting books)
> 2. लेखापरीक्षा एवं लेखा (AG/Audit specific)
> 3. विभाग-वार (10 departments — PWD + Health included)

---

## 🚦 NEXT SESSION — Where to start

**Resume from: Stage 3A — `library.html` design mockup**

Stage 1 (Content audit) ✅ done
Stage 2 (Backend cleanup + index files) ✅ done — Tier 1 live with 6 books
Stage 3A (Frontend design mockup) ⏳ NEXT
Stage 3B (Frontend full build) — after 3A approval
Stage 4 (Reader UI universal) — after 3B
Stage 5 (Cross-book search results) — after 4
Stage 6 (Polish + mobile + citation copy) — final

**Stage 3A scope:**
- Hero search bar (prominent top)
- 8 use-case tiles (वित्तीय मामले, अनुशासन, वरिष्ठता, शिक्षक भेद, नियुक्ति, निलंबन, अवकाश, पेंशन)
- 3 category sections: UP Universal · लेखापरीक्षा · विभाग-वार (10 dept cards)
- Book cards with gradient covers + actual Hindi cover names from this file
- Maroon (#8B2000) / Gold (#9a7000) / Cream (#faf6ec) theme
- Bureaucratic + sundar feel — IAS/AG demo grade

**Visual reference:** "FHB reader ka model — left sidebar TOC, right content, prev/next, sundar typography" (Shoonya's earlier feedback)

**Demo target:** Senior IAS / AG officers — 5-min screen demo (informal usage, word-of-mouth marketing)

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
