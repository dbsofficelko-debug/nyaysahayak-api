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

app.listen(process.env.PORT || 3001, () => console.log('✅ Nyaysahayak API Server running on port 3001'));
