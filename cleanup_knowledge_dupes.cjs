// cleanup_knowledge_dupes.cjs
// Goal: make every knowledge.json entry have a UNIQUE id, with ZERO content loss.
//   Pass 1 — remove rows whose FULL JSON is byte-identical to an earlier row (true redundant copy).
//   Pass 2 — for remaining rows, if an id repeats with DIFFERENT content, keep the first and
//            append a deterministic disambiguator (_x2, _x3 ...) to later ones. Only the `id`
//            field is touched; every other field is preserved verbatim.
const fs = require('fs');
const KN = 'knowledge.json';

const kn = JSON.parse(fs.readFileSync(KN, 'utf8'));
if (!Array.isArray(kn)) { console.error('FATAL: not an array'); process.exit(1); }

const before = kn.length;

// Pass 1: drop exact full-row duplicates (keep first occurrence)
const seenFull = new Set();
const deduped = [];
let exactRemoved = 0;
for (const e of kn) {
  const sig = JSON.stringify(e);
  if (seenFull.has(sig)) { exactRemoved++; continue; }
  seenFull.add(sig);
  deduped.push(e);
}

// Pass 2: ensure unique ids (content-preserving disambiguation)
const usedIds = new Set();
let reIded = 0;
const reIdLog = [];
for (const e of deduped) {
  const orig = e.id;
  if (!usedIds.has(orig)) { usedIds.add(orig); continue; }
  let n = 2, cand;
  do { cand = orig + '_x' + n; n++; } while (usedIds.has(cand));
  e.id = cand;
  usedIds.add(cand);
  reIded++;
  if (reIdLog.length < 50) reIdLog.push(orig + ' -> ' + cand);
}

// Validate
const ids = deduped.map(e => e.id);
const dupAfter = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
if (dupAfter.length) { console.error('FATAL: duplicate ids remain:', dupAfter.slice(0, 10)); process.exit(1); }
const urc = deduped.filter(e => String(e.id).startsWith('urc_')).length;
if (urc !== 245) { console.error('FATAL: urc count changed:', urc); process.exit(1); }
// no content lost: every original row must still be present as content (minus exact dups)
const origContent = kn.map(e => { const c = { ...e }; delete c.id; return JSON.stringify(c); });
const newContent = deduped.map(e => { const c = { ...e }; delete c.id; return JSON.stringify(c); });
const origCounts = {}; origContent.forEach(s => origCounts[s] = (origCounts[s] || 0) + 1);
const newCounts = {}; newContent.forEach(s => newCounts[s] = (newCounts[s] || 0) + 1);
// every distinct content present in new at least once
let lostContent = 0;
for (const s of Object.keys(origCounts)) { if (!newCounts[s]) lostContent++; }
if (lostContent) { console.error('FATAL: lost', lostContent, 'distinct content rows'); process.exit(1); }

fs.writeFileSync(KN, JSON.stringify(deduped, null, 1), 'utf8');

console.log('cleanup OK');
console.log('  before total      :', before);
console.log('  exact dups removed :', exactRemoved);
console.log('  ids disambiguated  :', reIded);
console.log('  after total        :', deduped.length, '(= before - exactRemoved)');
console.log('  urc_* preserved    :', urc);
console.log('  duplicate ids now  :', dupAfter.length);
console.log('  distinct content lost:', lostContent);
if (reIdLog.length) { console.log('  re-id sample:'); reIdLog.forEach(l => console.log('    ' + l)); }
