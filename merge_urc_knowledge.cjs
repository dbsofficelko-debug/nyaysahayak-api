// merge_urc_knowledge.cjs
// Bot KB merge: urc_cards.json (245) -> knowledge.json
// Convention follows kzp/prj precedent: cards appended verbatim (Devanagari, same schema).
// Idempotent: strips any existing urc_* entries first, then appends the canonical 245.
const fs = require('fs');

const KN = 'knowledge.json';
const CARDS = 'urc_cards.json';

const kn = JSON.parse(fs.readFileSync(KN, 'utf8'));
const cards = JSON.parse(fs.readFileSync(CARDS, 'utf8'));

if (!Array.isArray(kn) || !Array.isArray(cards)) {
  console.error('FATAL: expected arrays'); process.exit(1);
}

const before = kn.length;
const urcBefore = kn.filter(e => e && e.id && String(e.id).startsWith('urc_')).length;

// 1) drop existing urc_* entries (avoid stale copies)
const cleaned = kn.filter(e => !(e && e.id && String(e.id).startsWith('urc_')));

// 2) append canonical cards
const merged = cleaned.concat(cards);

// 3) integrity checks — only fail on urc-related collisions; pre-existing
//    non-urc dups (e.g. fhb2_*) are an out-of-scope data issue, just warned.
const ids = merged.map(e => e.id);
const dupSet = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
const urcDups = dupSet.filter(d => String(d).startsWith('urc_'));
if (urcDups.length) {
  console.error('FATAL: urc duplicate ids after merge:', urcDups.slice(0, 10));
  process.exit(1);
}
// ensure no urc id collides with a non-urc id
const nonUrcIds = new Set(cleaned.map(e => e.id));
const collisions = cards.map(c => c.id).filter(id => nonUrcIds.has(id));
if (collisions.length) {
  console.error('FATAL: urc id collides with existing non-urc id:', collisions.slice(0, 10));
  process.exit(1);
}
const preExistingNonUrcDups = dupSet.filter(d => !String(d).startsWith('urc_'));
if (preExistingNonUrcDups.length) {
  console.warn('WARN: ' + preExistingNonUrcDups.length +
    ' pre-existing non-urc duplicate ids in knowledge.json (out of scope, untouched). e.g. ' +
    preExistingNonUrcDups.slice(0, 5).join(', '));
}
const urcAfter = merged.filter(e => e.id && String(e.id).startsWith('urc_')).length;
if (urcAfter !== 245) {
  console.error('FATAL: expected 245 urc entries, got', urcAfter);
  process.exit(1);
}

fs.writeFileSync(KN, JSON.stringify(merged, null, 1), 'utf8');

console.log('knowledge.json merge OK');
console.log('  before total :', before, '(urc_* =', urcBefore + ')');
console.log('  removed urc  :', urcBefore);
console.log('  added cards  :', cards.length);
console.log('  after total  :', merged.length, '(urc_* =', urcAfter + ')');
