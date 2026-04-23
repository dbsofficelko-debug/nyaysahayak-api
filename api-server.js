import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: '50mb' }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Load knowledge base ──────────────────────────────────────────
let knowledge = [];
const KNOWLEDGE_PATH = path.join(__dirname, 'knowledge.json');

function loadKnowledge() {
  try {
    knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf-8'));
    console.log(`✅ Loaded ${knowledge.length} entries from knowledge.json`);
  } catch(e) {
    console.error('❌ Could not load knowledge.json:', e.message);
    knowledge = [];
  }
}
loadKnowledge();

// ── Transliteration map — Hinglish → Hindi search ───────────────
const TRANSLIT = {
  'anukampa':   ['अनुकम्पा', 'अनुकंपा'],
  'niyukti':    ['नियुक्ति'],
  'pension':    ['पेंशन', 'पेन्शन'],
  'transfer':   ['स्थानांतरण', 'तबादला'],
  'suspension': ['निलंबन'],
  'enquiry':    ['जाँच', 'जांच', 'तहकीकात'],
  'salary':     ['वेतन'],
  'leave':      ['अवकाश', 'छुट्टी'],
  'promotion':  ['पदोन्नति'],
  'retirement': ['सेवानिवृत्ति', 'सेवानिवृति'],
  'dismissal':  ['बर्खास्तगी', 'पदच्युति'],
  'appeal':     ['अपील'],
  'appointment':['नियुक्ति'],
  'exgratia':   ['अनुग्रह', 'ex-gratia', 'अनुग्रह राशि'],
  'compassion': ['अनुकम्पा', 'करुणा'],
  'farji':      ['फर्जी', 'जाली'],
  'niyam':      ['नियम', 'नियमावली'],
  'shiksha':    ['शिक्षा'],
  'vibhag':     ['विभाग'],
  'adhyay':     ['अध्याय'],
  'prastar':    ['प्रस्तर'],
  'sthanantaran':['स्थानांतरण'],
  'seva':       ['सेवा'],
  'vidhi':      ['विधि'],
  'shhasanadesh':['शासनादेश'],
  'go':         ['शासनादेश', 'GO'],
  'court':      ['न्यायालय', 'कोर्ट'],
  'writ':       ['रिट'],
  'judgment':   ['निर्णय', 'judgement'],
  'order':      ['आदेश'],
  'gratuity':   ['उपदान', 'ग्रेच्युटी'],
  'inquiry':    ['जाँच', 'जांच'],
  'chargesheet':['आरोप पत्र', 'चार्जशीट'],
  'deputation': ['प्रतिनियुक्ति'],
  'seniority':  ['वरिष्ठता'],
  'increment':  ['वेतनवृद्धि'],
  'allowance':  ['भत्ता', 'भत्ते'],
  'hra':        ['मकान किराया भत्ता', 'HRA'],
  'da':         ['महँगाई भत्ता', 'DA'],
  'ta':         ['यात्रा भत्ता', 'TA'],
};

function expandQuery(q) {
  const terms = [q.toLowerCase()];
  const words = q.toLowerCase().split(/\s+/);
  words.forEach(w => {
    if (TRANSLIT[w]) terms.push(...TRANSLIT[w].map(t => t.toLowerCase()));
    // Also try reverse — if Hindi word matches a key's value, add the key
    Object.entries(TRANSLIT).forEach(([eng, hindiArr]) => {
      hindiArr.forEach(h => {
        if (q.includes(h)) terms.push(eng, ...hindiArr.map(x => x.toLowerCase()));
      });
    });
  });
  return [...new Set(terms)];
}

// ── Smart search function ────────────────────────────────────────
function smartSearch(query, bookFilter, limit = 8) {
  const terms = expandQuery(query);
  let pool = knowledge;

  // Book filter
  if (bookFilter && bookFilter.trim()) {
    const bf = bookFilter.toLowerCase().trim();
    pool = knowledge.filter(r => {
      const dept = (r.dept || r.department || '').toLowerCase();
      const book = (r.book || r.filename || r.source || '').toLowerCase();
      // Universal entries (Level 1) sabhi depts ko milegi
      if (dept === 'universal') return true;
      return book.includes(bf) || dept.includes(bf);
    });
  }

  // Score each entry
  const scored = pool.map(r => {
    let score = 0;
    const fields = [
      r.content   || '',
      r.keywords  || '',
      r.topic     || '',
      r.chapter   || '',
      r.book      || '',
      r.heading   || '',
      r.title     || '',
      r.section   || '',
      r.text      || '',
    ].join(' ').toLowerCase();

    terms.forEach(term => {
      if (!term) return;
      // Exact match = higher score
      const exactCount = (fields.match(new RegExp(term, 'g')) || []).length;
      score += exactCount * 2;
      // Partial match
      if (fields.includes(term)) score += 1;
    });

    return { entry: r, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}

// ── Routes ──────────────────────────────────────────────────────

app.get('/', (req, res) => res.json({
  status: 'Nyaysahayak API Live!',
  entries: knowledge.length,
  endpoints: ['GET /search?q=&book=&limit=', 'POST /search', 'GET /browse', 'GET /browse/:book', 'POST /bulk-insert', 'GET /knowledge?page=&limit=&book=']
}));

// ── SEARCH (GET + POST) ─────────────────────────────────────────
const handleSearch = async (req, res) => {
  const query      = req.body?.query || req.body?.q || req.query?.q || req.query?.query || '';
  const bookFilter = req.body?.book  || req.query?.book  || '';
  const limitParam = parseInt(req.query?.limit || req.body?.limit) || 8;
  const rawMode    = req.method === 'GET' || req.query?.raw;

  if (!query.trim()) return res.status(400).json({ error: 'Query required — use ?q=yourquery' });

  try {
    const results = smartSearch(query, bookFilter, limitParam);

    // GET request or ?raw — return raw results (used by frontend)
    if (rawMode) {
      return res.json({ results, total: results.length });
    }

    // POST without raw — return AI answer
    const context = results.length > 0
      ? results.map(r => {
          const book    = r.book || r.source || '';
          const chapter = r.chapter || r.heading || r.topic || '';
          const content = r.content || r.text || '';
          return `[${book} — ${chapter}]\n${content}`;
        }).join('\n\n')
      : '';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `आप न्यायसहायक हैं — उत्तर प्रदेश शासन के विधिक सहायक।
नियम:
1. उत्तर केवल हिंदी में।
2. हर तथ्य के साथ नियम/धारा citation अनिवार्य — exact section number।
3. ज्ञान आधार में न हो तो: "उपलब्ध ज्ञान आधार में यह जानकारी नहीं है।"
4. अनुमान न लगाएं।
5. 150 शब्द से कम।`,
      messages: [{
        role: 'user',
        content: context
          ? `ज्ञान आधार:\n${context}\n\nप्रश्न: ${query}`
          : `प्रश्न: ${query}`
      }]
    });

    res.json({
      answer:  response.content[0].text,
      sources: results.map(r => ({ book: r.book || r.source, chapter: r.chapter || r.topic })),
      total:   results.length
    });

  } catch(e) {
    console.error('Search error:', e.message);
    res.status(500).json({ error: e.message });
  }
};

app.post('/search', handleSearch);
app.get('/search',  handleSearch);

// ── KNOWLEDGE BROWSE (new) ───────────────────────────────────────
// GET /knowledge?page=1&limit=20&book=Seva Vidhi
app.get('/knowledge', (req, res) => {
  const page      = parseInt(req.query.page)  || 1;
  const limit     = parseInt(req.query.limit) || 20;
  const bookFilter= req.query.book || '';
  const dept      = req.query.dept || '';

  let pool = knowledge;
  if (bookFilter) {
    const bf = bookFilter.toLowerCase();
    pool = knowledge.filter(r =>
      (r.book   && r.book.toLowerCase().includes(bf)) ||
      (r.source && r.source.toLowerCase().includes(bf))
    );
  }
  if (dept) {
    const d = dept.toLowerCase();
    pool = pool.filter(r =>
      (r.dept       && r.dept.toLowerCase().includes(d)) ||
      (r.department && r.department.toLowerCase().includes(d))
    );
  }

  const total = pool.length;
  const start = (page - 1) * limit;
  const entries = pool.slice(start, start + limit);

  res.json({ total, page, limit, total_pages: Math.ceil(total / limit), entries });
});

// ── BROWSE (book summary) ────────────────────────────────────────
app.get('/browse', (req, res) => {
  const grouped = {};
  knowledge.forEach(e => {
    const book = e.book || e.source || e.filename || 'Other';
    if (!grouped[book]) grouped[book] = { name: book, count: 0 };
    grouped[book].count++;
  });
  res.json({
    total_entries: knowledge.length,
    total_books: Object.keys(grouped).length,
    books: Object.values(grouped).sort((a, b) => b.count - a.count)
  });
});


// GET /gos?dept=madhyamik - dept specific + universal GOs
const UNIVERSAL_DEPTS = ['nyay', 'karmik', 'vitt'];
app.get('/gos', (req, res) => {
  const dept = req.query.dept || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filtered = knowledge.filter(e => {
    if (e.type !== 'GO') return false;
    if (!dept) return true;
    return e.dept === dept || UNIVERSAL_DEPTS.includes(e.dept);
  });
  const start = (page - 1) * limit;
  res.json({
    total: filtered.length,
    page,
    total_pages: Math.ceil(filtered.length / limit),
    entries: filtered.slice(start, start + limit)
  });
});

app.get('/browse/:book', (req, res) => {
  const book = decodeURIComponent(req.params.book);
  const page = parseInt(req.query.page) || 1;
  const filtered = knowledge.filter(e =>
    (e.book || e.source || e.filename || 'Other') === book
  );
  const start = (page - 1) * 30;
  res.json({
    book, total: filtered.length, page,
    total_pages: Math.ceil(filtered.length / 30),
    entries: filtered.slice(start, start + 30)
  });
});

// ── BULK INSERT (fixed — no SQLite) ─────────────────────────────
// POST /bulk-insert
// Body: array of entry objects
// Each entry should have: book, chapter/topic, content, keywords (optional), dept (optional)
app.post('/bulk-insert', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Array of entries expected' });
  if (entries.length === 0)    return res.status(400).json({ error: 'Empty array' });
  if (entries.length > 500)    return res.status(400).json({ error: 'Max 500 entries per request' });

  let inserted = 0;
  let skipped  = 0;

  entries.forEach(entry => {
    if (!entry.content && !entry.text) { skipped++; return; }
    // Normalize
    const normalized = {
      book:     entry.book     || entry.source  || 'Unknown',
      chapter:  entry.chapter  || entry.topic   || entry.heading || '',
      topic:    entry.topic    || entry.chapter  || entry.heading || '',
      heading:  entry.heading  || entry.topic    || '',
      filename: entry.filename || '',
      content:  entry.content  || entry.text    || '',
      keywords: entry.keywords || '',
      dept:     entry.dept     || entry.department || '',
      year:     entry.year     || '',
      ref:      entry.ref      || entry.go_number || '',
      type:     entry.type     || 'entry',
    };
    knowledge.push(normalized);
    inserted++;
  });

  // Save back to knowledge.json
  try {
    writeFileSync(KNOWLEDGE_PATH, JSON.stringify(knowledge, null, 2), 'utf-8');
    console.log(`✅ Bulk insert: ${inserted} added, ${skipped} skipped. Total: ${knowledge.length}`);
    res.json({
      success: true,
      inserted,
      skipped,
      total: knowledge.length
    });
  } catch(e) {
    console.error('Write error:', e.message);
    res.status(500).json({ error: 'Could not save knowledge.json: ' + e.message });
  }
});

// ── Department-wise GOs insert ───────────────────────────────────
// POST /insert-go
// Single GO entry with department tag
app.post('/insert-go', (req, res) => {
  const { title, content, dept, year, ref, court, book } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const entry = {
    book:     book  || 'शासनादेश',
    chapter:  title || ref || '',
    topic:    title || '',
    heading:  title || '',
    filename: ref   || '',
    content:  content,
    keywords: `${dept || ''} ${year || ''} ${title || ''} GO शासनादेश`.trim(),
    dept:     dept  || '',
    year:     year  || '',
    ref:      ref   || '',
    type:     'GO',
    court:    court || '',
  };

  knowledge.push(entry);
  try {
    writeFileSync(KNOWLEDGE_PATH, JSON.stringify(knowledge, null, 2), 'utf-8');
    res.json({ success: true, total: knowledge.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Stats endpoint ───────────────────────────────────────────────
app.get('/stats', (req, res) => {
  const byBook = {};
  const byDept = {};
  const byType = {};

  knowledge.forEach(e => {
    const book = e.book || 'Other';
    const dept = e.dept || 'General';
    const type = e.type || 'entry';
    byBook[book] = (byBook[book] || 0) + 1;
    byDept[dept] = (byDept[dept] || 0) + 1;
    byType[type] = (byType[type] || 0) + 1;
  });

  res.json({
    total: knowledge.length,
    by_book: byBook,
    by_dept: byDept,
    by_type: byType,
  });
});

// ── Reader endpoints (existing — unchanged) ──────────────────────
let fhbData = [];
try {
  fhbData = JSON.parse(readFileSync(path.join(__dirname, 'fhb_index.json'), 'utf-8'));
  console.log('FHB loaded:', fhbData.length, 'chapters');
} catch(e) { console.log('FHB not found:', e.message); }

app.get('/fhb', (req, res) => {
  res.json({ total: fhbData.length, chapters: fhbData.map(({pages,topic,filename}) => ({pages,topic,filename})) });
});
app.get('/fhb/:filename', (req, res) => {
  const ch = fhbData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

let sadData = [];
try {
  sadData = JSON.parse(readFileSync(path.join(__dirname, 'sad_index.json'), 'utf-8'));
  console.log('SAD loaded:', sadData.length, 'chapters');
} catch(e) { console.log('SAD not found:', e.message); }

app.get('/sad', (req, res) => {
  res.json({ total: sadData.length, chapters: sadData.map(({prastar,topic,filename}) => ({prastar,topic,filename})) });
});
app.get('/sad/:filename', (req, res) => {
  const ch = sadData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

let svData = [];
try {
  svData = JSON.parse(readFileSync(path.join(__dirname, 'sv_index.json'), 'utf-8'));
  console.log('SV loaded:', svData.length, 'chapters');
} catch(e) { console.log('SV not found:', e.message); }

app.get('/sv', (req, res) => {
  res.json({ total: svData.length, chapters: svData.map(({chapter,topic,filename}) => ({chapter,topic,filename})) });
});
app.get('/sv/:filename', (req, res) => {
  const ch = svData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

let pmData = [];
try {
  pmData = JSON.parse(readFileSync(path.join(__dirname, 'pm_index.json'), 'utf-8'));
  console.log('PM loaded:', pmData.length, 'chapters');
} catch(e) { console.log('PM not found:', e.message); }

app.get('/pm', (req, res) => {
  res.json({ total: pmData.length, chapters: pmData.map(({chapter,topic,filename}) => ({chapter,topic,filename})) });
});
app.get('/pm/:filename', (req, res) => {
  const ch = pmData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

let puvvnlData = [];
try {
  puvvnlData = JSON.parse(readFileSync(path.join(__dirname, 'puvvnl_index.json'), 'utf-8'));
  console.log('PUVVNL loaded:', puvvnlData.length, 'entries');
} catch(e) { console.log('PUVVNL not found:', e.message); }

app.get('/puvvnl', (req, res) => {
  res.json({ total: puvvnlData.length, chapters: puvvnlData.map(({num,topic,filename,book,chapter}) => ({num,topic,filename,book,chapter})) });
});
app.get('/puvvnl/:filename', (req, res) => {
  const ch = puvvnlData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

// ── DocGen endpoint ──────────────────────────────────────────────
app.post('/docgen', async (req, res) => {
  const { prompt, department } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const systemPrompt = `आप न्यायसहायक हैं — उत्तर प्रदेश शासन के विधिक दस्तावेज़ सहायक।
विभाग: ${department || 'सामान्य'}

पैरावार टिप्पणी का प्रारूप:
| पैरा सं० | पैरे का सार (1-2 वाक्य) | विधिक टिप्पणी (नियम/धारा सहित) |
|----------|--------------------------|----------------------------------|

नियम:
1. citation अनिवार्य — exact section number।
2. भाषा: शुद्ध सरकारी हिंदी।
3. तथ्यात्मक पैरे पर: "तथ्यात्मक — टिप्पणी अपेक्षित नहीं"
4. अंत में "पैरवी बिंदु" — 3-5 मुख्य तर्क।`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json(response);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nyaysahayak API on port ${PORT}`);
  console.log(`📚 Knowledge entries: ${knowledge.length}`);
});
