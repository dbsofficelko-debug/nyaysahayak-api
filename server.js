import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

// Load .env manually
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");
try {
  const env = readFileSync(envPath, "utf8");
  env.split("\n").forEach(line => {
    const [key, ...val] = line.split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim();
  });
} catch(e) {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "nyaysahayak.db");

const server = new McpServer({
  name: "nyaysahayak-legal",
  version: "3.0.0",
});

// TOOL 1: Search database
server.tool(
  "search_nyaysahayak",
  "Nyaysahayak database mein search karo — FHB, SAD, Procurement",
  { query: z.string() },
  async ({ query }) => {
    try {
      const db = new Database(DB_PATH, { readonly: true });
      const results = db.prepare(
        `SELECT book, chapter, content FROM knowledge_base 
         WHERE content LIKE '%' || ? || '%' 
         OR chapter LIKE '%' || ? || '%'
         LIMIT 5`
      ).all(query, query);
      db.close();

      if (results.length === 0) {
        return { content: [{ type: "text", text: `"${query}" ke liye koi result nahi mila.` }] };
      }

      let response = `🔍 "${query}" ke liye ${results.length} result mile:\n\n`;
      results.forEach((r, i) => {
        response += `**${i+1}. ${r.book} — ${r.chapter}**\n`;
        response += `${r.content.substring(0, 300)}...\n\n`;
      });
      return { content: [{ type: "text", text: response }] };
    } catch(e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }
);

// TOOL 2: Database info
server.tool(
  "get_database_info",
  "Nyaysahayak database mein kya books hain",
  {},
  async () => {
    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare("SELECT book, COUNT(*) as c FROM knowledge_base GROUP BY book").all();
    db.close();
    let r = "📚 Nyaysahayak Knowledge Base v3.0\n\n";
    let t = 0;
    rows.forEach(row => { r += `✅ ${row.book}: ${row.c} sections\n`; t += row.c; });
    r += `\nTOTAL: ${t} sections`;
    return { content: [{ type: "text", text: r }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

// DocGen endpoint
app.post('/docgen', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
