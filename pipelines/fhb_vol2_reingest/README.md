# FHB Vol 2 Re-Ingestion Pipeline

Replace 2,267 English FHB Vol 2 fact cards in `knowledge.json` with ~2,000 Devanagari fact cards extracted from `fhb_index.json`'s 92 clean Devanagari chapters.

## Why

Current bot KB has FHB Vol 2 content in English (extracted from the English side of the bilingual rule book). Library has the same book in Devanagari. Bot serves Devanagari users → must translate English on-the-fly → hallucination source. Solution: replace bot KB FHB Vol 2 with Devanagari extracted from the library version.

## Files

- `extract.py` — main extraction script (Sonnet API → per-chapter JSON)
- `integrate.py` — atomic swap of FHB Vol 2 entries in `knowledge.json`
- `extraction/` — per-chapter outputs (NN.json)
- `merged.json` — aggregated cards (written after integrate.py)
- `STATS.md` — append-only run report

## Run

```bash
# 1. Install SDK (one time)
pip3 install --break-system-packages anthropic

# 2. Set API key (rotate after pipeline done)
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Dry run on 2 chapters (validate prompt + schema)
python3 extract.py --dry-run --limit 2
python3 extract.py --limit 2          # Actual run

# 4. Inspect output
ls extraction/
cat extraction/02.json | head -50

# 5. Full run (~30-60 min, ~$5-10 in API)
python3 extract.py --resume           # Picks up where left off

# 6. Validate + atomic swap
python3 integrate.py --dry-run        # Check first
python3 integrate.py                  # Actually swap

# 7. Commit
cd ../..
git add knowledge.json pipelines/fhb_vol2_reingest/
git commit -m "FHB Vol 2 re-ingested from Devanagari source (~2000 cards)"
git push
```

## Estimate

- Total content: ~1.45 MB Devanagari (90 real chapters, skipping 2 TOC chapters)
- Input tokens: ~500K
- Output tokens: ~250-400K
- Cost: ~$5-10 at Sonnet rates
- Wall time: 30-60 min depending on rate limits

## Resume / Failure handling

`extract.py --resume` checks `extraction/` and skips chapters already done. Safe to interrupt and restart.

`integrate.py` validates schema before swap. If issues found, integration aborts — fix the bad chapter's JSON file manually and retry.

Current `knowledge.json` is preserved in git history (revert via `git checkout HEAD~1 -- knowledge.json` if needed).
