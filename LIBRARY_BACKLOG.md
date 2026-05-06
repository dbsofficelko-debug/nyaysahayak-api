# 📚 Nyaysahayak Library — Backlog & Status

> **Purpose:** Library pustakon ki permanent tracking file. Har session ke shuru mein ye padhi jaaye. Tum aur Claude dono ke liye single source of truth.
>
> **Last updated:** 06-May-2026
>
> **Architecture:** Library = 3 categories
> 1. UP Universal (cross-cutting books)
> 2. लेखापरीक्षा एवं लेखा (AG/Audit specific)
> 3. विभाग-वार (10 departments)

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

### Books to purchase (Alia Agency / Eastern Book Co.):
- [ ] वित्तीय हस्त-पुस्तिका, खण्ड-पाँच (FHB Vol 5)
- [ ] वित्तीय हस्त-पुस्तिका, खण्ड-छ: (FHB Vol 6 — full version, current PDFs empty/scanned)

### After scanner purchase (CZUR ET16 Plus planned):
- Existing scanned PDFs ko proper OCR through CZUR
- 10-department books scan karna

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
