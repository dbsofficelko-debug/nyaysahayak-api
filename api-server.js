import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Load knowledge base from JSON
let knowledge = [
  {"type": "अध्याय", "num": "16", "topic": "अनुशासन एवं दण्ड", "filename": "sv_16", "book": "Seva Vidhi", "chapter": "अध्याय-16", "keywords": "discipline penalty punishment", "content": "350 सेवा विधि अध्याय-5\nअनुशासन एवं दण्ड के प्रावधान"},
  {"type": "अध्याय", "num": "31", "topic": "विविध प्रावधान", "filename": "sv_31", "book": "Seva Vidhi", "chapter": "अध्याय-31", "keywords": "miscellaneous provisions general", "content": "050 सेवा विधि\nविविध प्रावधान"},
  {"type": "अध्याय", "num": "19", "topic": "सेवानिवृत्ति एवं पेंशन", "filename": "sv_19", "book": "Seva Vidhi", "chapter": "अध्याय-19", "keywords": "retirement pension gratuity", "content": "650 सेवा विधि [अध्याय-19]\nसेवानिवृत्ति एवं पेंशन"},
  {"type": "अध्याय", "num": "27", "topic": "पेंशन नियम", "filename": "sv_27", "book": "Seva Vidhi", "chapter": "अध्याय-27", "keywords": "pension rules retirement gratuity", "content": "750 सेवा विधि [अध्याय-27]\nपेंशन नियम"},
  {"type": "अध्याय", "num": "28", "topic": "पारिवारिक पेंशन", "filename": "sv_28", "book": "Seva Vidhi", "chapter": "अध्याय-28", "keywords": "family pension death retirement", "content": "850 सेवा विधि [अध्याय-27]\nपारिवारिक पेंशन"},
  {"type": "अध्याय", "num": "29", "topic": "सेवा समाप्ति", "filename": "sv_29", "book": "Seva Vidhi", "chapter": "अध्याय-29", "keywords": "termination service end removal dismissal", "content": "950\n(7) इस बात की सा"},
  {"type": "अध्याय", "num": "4", "topic": "सेवा शर्तें", "filename": "sv_4", "book": "Seva Vidhi", "chapter": "अध्याय-4", "keywords": "service conditions terms employment", "content": "350 सेवा विधि सिहा. नियम 52-"},
  {"type": "अध्याय", "num": "30", "topic": "सहायक नियम", "filename": "sv_30", "book": "Seva Vidhi", "chapter": "अध्याय-30", "keywords": "subsidiary rules supplementary", "content": "250 सेवा विधि (शासनादेश"}
];

try {
  const jsonPath = path.join(__dirname, 'knowledge.json');
  knowledge = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  console.log(`✅ Loaded ${knowledge.length} entries from knowledge.json`);
} catch(e) {
  console.error('❌ Could not load knowledge.json:', e.message);
}

// ── Routes ──────────────────────────────────────────────────────

app.get('/', (req, res) => res.json({
  status: 'Nyaysahayak API Live!',
  entries: knowledge.length
}));

// Search endpoint (GET + POST)
const handleSearch = async (req, res) => {
  const query = req.body?.query || req.query?.q || '';
  const bookFilter = req.query?.book || '';
  const limitParam = parseInt(req.query?.limit) || 8;

  if (!query.trim()) return res.status(400).json({ error: 'Query required' });

  try {
    const q = query.toLowerCase();
    let pool = knowledge;

    // Filter by book if provided
    if (bookFilter) {
      const bf = bookFilter.toLowerCase();
      pool = knowledge.filter(r =>
        (r.book && r.book.toLowerCase().includes(bf)) ||
        (r.filename && r.filename.toLowerCase().includes(bf))
      );
    }

    const results = pool.filter(r =>
      (r.content && r.content.toLowerCase().includes(q)) ||
      (r.chapter && r.chapter.toLowerCase().includes(q)) ||
      (r.book && r.book.toLowerCase().includes(q)) ||
      (r.keywords && r.keywords.toLowerCase().includes(q)) ||
      (r.topic && r.topic.toLowerCase().includes(q))
    ).slice(0, limitParam);

    // Return results directly (for RAG use by bot)
    if (req.method === 'GET' || req.query?.raw) {
      return res.json({ results, total: results.length });
    }

    // AI-enhanced response (POST)
    const context = results.length > 0
      ? results.map(r => `[${r.book} — ${r.chapter}]\n${r.content}`).join('\n\n')
      : '';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system: `You are Nyaysahayak, a legal assistant for UP government employees. Answer in Hindi using the provided context.`,
      messages: [{ role: 'user', content: context ? `Context:\n${context}\n\nPrashna: ${query}` : query }]
    });

    res.json({
      answer: response.content[0].text,
      sources: results.map(r => ({ book: r.book, chapter: r.chapter }))
    });
  } catch(e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
};

app.post('/search', handleSearch);
app.get('/search', handleSearch);

// Browse endpoints
app.get('/browse', (req, res) => {
  const grouped = {};
  knowledge.forEach(e => {
    const book = e.book || e.source || e.filename || 'Other';
    if (!grouped[book]) grouped[book] = { name: book, count: 0 };
    grouped[book].count++;
  });
  res.json({ total_books: Object.keys(grouped).length, books: Object.values(grouped).sort((a,b) => b.count - a.count) });
});

app.get('/browse/:book', (req, res) => {
  const book = decodeURIComponent(req.params.book);
  const page = parseInt(req.query.page) || 1;
  const filtered = knowledge.filter(e => (e.book || e.source || e.filename || 'Other') === book);
  const start = (page-1)*30;
  res.json({ book, total: filtered.length, page, total_pages: Math.ceil(filtered.length/30), entries: filtered.slice(start, start+30) });
});


// ── FHB Chapter Reader ──────────────────────────────────────────
let fhbData = [];
try {
  fhbData = JSON.parse(readFileSync(path.join(__dirname, 'fhb_index.json'), 'utf-8'));
  console.log('FHB loaded:', fhbData.length, 'chapters');
} catch(e) { console.log('FHB load error:', e.message); }

app.get('/fhb', (req, res) => {
  const index = fhbData.map(({pages, topic, filename}) => ({pages, topic, filename}));
  res.json({ total: fhbData.length, chapters: index });
});

app.get('/fhb/:filename', (req, res) => {
  const ch = fhbData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Chapter not found' });
  res.json(ch);
});


// ── SAD Manual Reader ───────────────────────────────────────────
let sadData = [];
try {
  sadData = JSON.parse(readFileSync(path.join(__dirname, 'sad_index.json'), 'utf-8'));
  console.log('SAD loaded:', sadData.length, 'chapters');
} catch(e) { console.log('SAD load error:', e.message); }

app.get('/sad', (req, res) => {
  const ws = sadData.reduce((a,b) => a + (b.wordCount||0), 0);
  res.json({ total: sadData.length, wordCount: ws, chapters: sadData.map(({prastar,topic,filename}) => ({prastar,topic,filename})) });
});

app.get('/sad/:filename', (req, res) => {
  const ch = sadData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Chapter not found' });
  res.json(ch);
});


// ── Seva Vidhi Reader ───────────────────────────────────────────
let svData = [];
try {
  svData = JSON.parse(readFileSync(path.join(__dirname, 'sv_index.json'), 'utf-8'));
  console.log('SV loaded:', svData.length, 'chapters');
} catch(e) { console.log('SV load error:', e.message); }

app.get('/sv', (req, res) => {
  res.json({ total: svData.length, chapters: svData.map(({chapter,topic,filename}) => ({chapter,topic,filename})) });
});

app.get('/sv/:filename', (req, res) => {
  const ch = svData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Chapter not found' });
  res.json(ch);
});


// ── Procurement Manual Reader ───────────────────────────────────
let pmData = [];
try {
  pmData = JSON.parse(readFileSync(path.join(__dirname, 'pm_index.json'), 'utf-8'));
  console.log('PM loaded:', pmData.length, 'chapters');
} catch(e) { console.log('PM load error:', e.message); }

app.get('/pm', (req, res) => {
  res.json({ total: pmData.length, chapters: pmData.map(({chapter,topic,filename}) => ({chapter,topic,filename})) });
});

app.get('/pm/:filename', (req, res) => {
  const ch = pmData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Chapter not found' });
  res.json(ch);
});


// ── PUVVNL Reader ───────────────────────────────────────────────
let puvvnlData = [];
try {
  puvvnlData = JSON.parse(readFileSync(path.join(__dirname, 'puvvnl_index.json'), 'utf-8'));
  console.log('PUVVNL loaded:', puvvnlData.length, 'entries');
} catch(e) { console.log('PUVVNL load error:', e.message); }

app.get('/puvvnl', (req, res) => {
  res.json({
    total: puvvnlData.length,
    chapters: puvvnlData.map(({num, topic, filename, book, chapter}) => ({num, topic, filename, book, chapter}))
  });
});

app.get('/puvvnl/:filename', (req, res) => {
  const ch = puvvnlData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Entry not found' });
  res.json(ch);
});


// ── Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nyaysahayak API running on port ${PORT}`);
  console.log(`📚 Total knowledge entries: ${knowledge.length}`);
  console.log(`⚡ PUVVNL entries: ${puvvnlData.length}`);
});
