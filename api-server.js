import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const env = readFileSync(path.join(__dirname, '.env'), 'utf8');
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
});

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'nyaysahayak.db');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/search', async (req, res) => {
  const { query } = req.body;
  try {
    // Search DB first
    const db = new Database(DB_PATH, { readonly: true });
    const results = db.prepare(
      `SELECT book, chapter, content FROM knowledge_base 
       WHERE content LIKE '%' || ? || '%' 
       OR chapter LIKE '%' || ? || '%'
       LIMIT 8`
    ).all(query, query);
    db.close();

    // Build context from DB
    let context = '';
    if (results.length > 0) {
      context = results.map(r => 
        `[${r.book} — ${r.chapter}]\n${r.content}`
      ).join('\n\n');
    }

    // Claude answer
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `Aap Nyaysahayak hain — UP Govt ka legal AI assistant. 
Neeche diye gaye database sections ke aadhar par seedha aur useful answer dein.
Answer Hindi mein dein. 3-4 lines mein concise answer dein.
Agar database mein nahi hai toh honestly batayein.
Ant mein website link: https://nyaysahayak.co.in`,
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
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log('✅ Nyaysahayak API Server running on port 3001'));
