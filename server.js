import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
app.use(express.json({ limit: '32kb' }));

app.post('/api/assistant', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY がサーバーに設定されていません。' });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 2000) return res.status(400).json({ error: 'メッセージは1〜2000文字で入力してください。' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          { role: 'system', content: 'あなたはSkyline Build 2.0の建築アシスタントです。日本語で簡潔に、Three.jsの建築ゲームで実現できる建築アイデアや手順を提案してください。危険な内容やAPIキーなどの秘密情報を要求しないでください。' },
          { role: 'user', content: message }
        ]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'OpenAI APIへの接続に失敗しました。' });
    res.json({ answer: data.choices?.[0]?.message?.content || '回答を取得できませんでした。' });
  } catch (error) {
    console.error('GPT request failed:', error);
    res.status(502).json({ error: 'GPTアシスタントに接続できませんでした。' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
} else {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(port, () => console.log(`Skyline Build 2.0: http://localhost:${port}`));
