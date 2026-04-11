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
let knowledge = [];
try {
  const jsonPath = path.join(__dirname, 'knowledge.json');
  knowledge = JSON.parse(readFileSync(jsonPath, 'utf8'));
  console.log(`✅ Loaded ${knowledge.length} entries from knowledge.json`);
} catch(e) {
  console.error('❌ Could not load knowledge.json:', e.message);
}

app.get('/', (req, res) => res.json({ 
  status: 'Nyaysahayak API Live!', 
  entries: knowledge.length 
}));

app.post('/search', async (req, res) => {
  const query = req.body?.query || '';
  if (!query.trim()) return res.status(400).json({ error: 'Query required' });
  
  try {
    const q = query.toLowerCase();
    const results = knowledge.filter(r => 
      (r.content && r.content.toLowerCase().includes(q)) ||
      (r.chapter && r.chapter.toLowerCase().includes(q)) ||
      (r.book && r.book.toLowerCase().includes(q)) ||
      (r.keywords && r.keywords.toLowerCase().includes(q))
    ).slice(0, 8);

    const context = results.length > 0
      ? results.map(r => `[${r.book} — ${r.chapter}]\n${r.content}`).join('\n\n')
      : '';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system: `You are Nyaysahayak, a legal assistant for UP government employees. Answer in Hindi using the provided context. Be specific and cite rules/sections where possible.`,
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
});


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


// FHB Chapter-wise reader
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
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});


// SAD Manual reader
import { readFileSync as readSAD } from 'fs';
let sadData = [];
try {
  sadData = JSON.parse(readFileSync(path.join(__dirname, 'sad_index.json'), 'utf-8'));
  console.log('SAD loaded:', sadData.length, 'chapters');
} catch(e) { console.log('SAD load error:', e.message); }

app.get('/sad', (req, res) => {
  const index = sadData.map(({type, num, topic, filename}) => ({type, num, topic, filename}));
  res.json({ total: sadData.length, chapters: index });
});
app.get('/sad/:filename', (req, res) => {
  const ch = sadData.find(c => c.filename === req.params.filename);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  res.json(ch);
});

app.listen(process.env.PORT || 3001, () => console.log('✅ Nyaysahayak API Server running on port 3001'));
