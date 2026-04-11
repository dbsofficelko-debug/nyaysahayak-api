import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const possiblePaths = [
  path.join(__dirname, 'nyaysahayak.db'),
  '/app/nyaysahayak.db',
  path.join(process.cwd(), 'nyaysahayak.db')
];
const DB_PATH = possiblePaths.find(p => existsSync(p)) || possiblePaths[0];
console.log('DB Path:', DB_PATH, 'Exists:', existsSync(DB_PATH));

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.get('/', (req, res) => res.json({ status: 'Nyaysahayak API Live!', db: DB_PATH, exists: existsSync(DB_PATH) }));

app.post('/search', async (req, res) => {
  const query = req.body?.query || '';
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query required' });
  }
  try {
    let results = [];
    if (existsSync(DB_PATH)) {
      const db = new Database(DB_PATH, { readonly: true });
      results = db.prepare(
        `SELECT book, chapter, content FROM knowledge_base
         WHERE content LIKE '%' || ? || '%'
         OR chapter LIKE '%' || ? || '%'
         OR book LIKE '%' || ? || '%'
         LIMIT 8`
      ).all(query, query, query);
      db.close();
    }

    let context = results.length > 0
      ? results.map(r => `[${r.book} — ${r.chapter}]\n${r.content}`).join('\n\n')
      : '';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system: `You are Nyaysahayak, a legal assistant for UP government employees. Answer in Hindi using the provided context. If context is empty, answer from general knowledge about UP service rules.`,
      messages: [
        { role: 'user', content: context ? `Context:\n${context}\n\nQuestion: ${query}` : query }
      ]
    });

    res.json({
      answer: response.content[0].text,
      sources: results.map(r => ({ book: r.book, chapter: r.chapter }))
    });
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log('✅ Nyaysahayak API Server running on port 3001'));
