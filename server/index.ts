import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── PERSONALIDADE FORJA ────────────────────────────────────────────────────
const PERSONALIDADE_FORJA = `Você é o FORJA, um treinador profissional de voleibol de alto nível.
Seja técnico, direto e focado em evolução progressiva.
Nunca gere respostas genéricas.
Sempre estruture treinos em blocos com tempo e objetivo.
Funções possíveis: TREINADOR, ANALISTA, ADAPTADOR.`;

// ─── FUNÇÃO CENTRAL chamarIA ────────────────────────────────────────────────
async function chamarIA(funcao: string, dados: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  const prompt = `${PERSONALIDADE_FORJA}\n\nFunção atual: ${funcao}\n\n${dados}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini error — status:', response.status, 'body:', errorText);
    if (response.status === 429) {
      throw new Error('Limite de requisições do Gemini atingido. Aguarde alguns minutos ou verifique sua cota em https://ai.dev/rate-limit');
    }
    if (response.status === 403) {
      throw new Error('Chave GEMINI_API_KEY inválida ou sem permissão. Verifique em https://aistudio.google.com/apikey');
    }
    throw new Error(`Gemini retornou status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Erro ao gerar resposta';
}

// ─── ROTA AI COACH ──────────────────────────────────────────────────────────
app.post('/api/ai-coach', async (req, res) => {
  const { messages, context } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  // Build the full conversation as a single prompt for Gemini
  let conversationText = '';
  if (context) {
    conversationText += `Dados do sistema disponíveis:\n${JSON.stringify(context, null, 2)}\n\n`;
  }
  if (messages && messages.length > 0) {
    for (const msg of messages) {
      const role = msg.role === 'user' ? 'Treinador' : 'FORJA';
      conversationText += `${role}: ${msg.content}\n`;
    }
    conversationText += 'FORJA:';
  }

  try {
    const text = await chamarIA('TREINADOR', conversationText);
    return res.json({ text });
  } catch (e) {
    console.error('ai-coach error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro desconhecido' });
  }
});

// ─── ROTA BACKUP (Supabase proxy) ───────────────────────────────────────────
app.post('/api/backup/save', async (req, res) => {
  const { data, name, supabaseUrl, supabaseKey } = req.body;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Credenciais Supabase ausentes.' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ data, name, created_at: new Date().toISOString() }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase backup error:', response.status, err);
      return res.status(500).json({ error: 'Erro ao salvar backup na nuvem.' });
    }

    const result = await response.json();
    return res.json({ success: true, backup: result[0] });
  } catch (e) {
    console.error('backup/save error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro desconhecido' });
  }
});

app.get('/api/backup/list', async (req, res) => {
  const supabaseUrl = req.query.supabaseUrl as string;
  const supabaseKey = req.query.supabaseKey as string;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Credenciais Supabase ausentes.' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/backups?select=id,name,created_at&order=created_at.desc&limit=20`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase list error:', response.status, err);
      return res.status(500).json({ error: 'Erro ao listar backups.' });
    }

    const result = await response.json();
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro desconhecido' });
  }
});

app.get('/api/backup/load/:id', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = req.query.supabaseUrl as string;
  const supabaseKey = req.query.supabaseKey as string;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Credenciais Supabase ausentes.' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/backups?id=eq.${id}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Erro ao carregar backup.' });
    }

    const result = await response.json();
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Backup não encontrado.' });
    }

    return res.json(result[0]);
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erro desconhecido' });
  }
});

// ─── EXEMPLO DE USO: chamarIA ───────────────────────────────────────────────
// chamarIA("TREINADOR", "criar treino de saque e passe 120 minutos")

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
  console.log(`[FORJA] Servidor rodando na porta ${PORT}`);
});
