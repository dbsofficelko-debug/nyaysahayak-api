import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DB path — try multiple locations
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
  const { query } = req.body;
  try {
    let results = [];
    if (existsSync(DB_PATH)) {
      const db = new Database(DB_PATH, { readonly: true });
      results = db.prepare(
        `SELECT book, chapter, content FROM knowledge_base 
         WHERE content LIKE '%' || ? || '%' 
         OR chapter LIKE '%' || ? || '%'
         LIMIT 8`
      ).all(query, query);
      db.close();
    }

    let context = results.length > 0 
      ? results.map(r => `[${r.book} — ${r.chapter}]\n${r.content}`).join('\n\n')
      : '';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `Aap Nyaysahayak hain — UP Government departments ka Legal AI Assistant. Aapke database mein ye documents hain: UP Financial Handbook (FHB Vol-2), UP Procurement Manual (MSME), SAD Manual (Secretariat Manual), Seva Vidhi (Service Rules), Indian Penal Code (IPC), CrPC, Indian Evidence Act, Constitution of India. Database sections ke aadhar par seedha aur useful answer dein. Answer Hindi mein dein, structured format mein. Sources cite karen. Ant mein website link: https://nyaysahayak.co.in`,
      messages: [{
        role: 'user',
        content: context 
          ? `Database se mila:\n${context}\n\nSawal: ${query}`
          : `Sawal: ${query}\n(Database mein relevant content nahi mila)`
      }]
    });

    res.json({ 
      answer: response.content[0].text,
      sources: results.map(r => `${r.book} — ${r.chapter}`)
    });
  } catch(e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3001, () => 
  console.log('✅ Nyaysahayak API Server running!')
);
