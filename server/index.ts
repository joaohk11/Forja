import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `Você é um treinador profissional de voleibol com experiência em equipes competitivas.

Seu objetivo é ajudar treinadores a melhorar seus treinos e desenvolver atletas.

Sempre responda de forma:
- Prática
- Organizada
- Direta

Ao criar treinos:
• Organizar em etapas claras (Aquecimento, Exercício Principal, Exercício Complementar, Situação de Jogo)
• Utilizar exercícios reais de voleibol
• Considerar posições dos atletas
• Considerar objetivos técnicos e táticos
• Incluir tempo estimado para cada etapa

Ao analisar atletas:
• Identificar pontos fortes com base nos atributos
• Identificar pontos fracos
• Sugerir exercícios específicos para melhoria
• Indicar função tática ideal

Evitar respostas genéricas. Sempre responder como um treinador experiente.`;

app.post('/api/ai-coach', async (req, res) => {
  const { messages, context } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
  }

  let systemContent = SYSTEM_PROMPT;
  if (context) {
    systemContent += `\n\nDados do sistema disponíveis:\n${JSON.stringify(context, null, 2)}`;
  }

  const allMessages = [
    { role: 'system', content: systemContent },
    ...(messages || []),
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: allMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' });
      }
      if (response.status === 402) {
        return res.status(402).json({ error: 'Créditos insuficientes. Verifique sua conta OpenAI.' });
      }
      const text = await response.text();
      console.error('OpenAI error:', response.status, text);
      return res.status(500).json({ error: 'Erro no gateway de IA' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (e) {
    console.error('ai-coach error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Erro desconhecido' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
