import { GEMINI_API_KEY } from '@/lib/gemini';

const SYSTEM_PROMPT = `Você é um especialista em análise de conteúdo acadêmico e criação de grafos de conhecimento pedagógicos.

REGRAS:
1. Extraia entre 12 e 20 conceitos
2. Organize níveis 1 a 5
3. Cada conceito deve ter descrição, intuição e fórmula se existir
4. Dependências devem ser lógicas
5. Distribua x entre 100-900, y entre 80-780, evitando sobreposição
6. Cada conceito precisa de id único (ex: "node_1", "node_2")

Retorne APENAS JSON válido:
{
  "subject_name": "Nome da matéria detectado",
  "concepts": [
    {
      "id": "node_1",
      "title": "Nome do Conceito",
      "level": 1,
      "x": 500,
      "y": 100,
      "description": "Descrição clara",
      "intuition": "Analogia intuitiva",
      "formula": "E = mc² ou null"
    }
  ],
  "dependencies": [
    { "from": "node_1", "to": "node_2", "strength": 0.8 }
  ]
}`;

export async function generateGraphFromText(text: string) {
  console.log('STEP 1: texto recebido, length =', text.length);

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não definida em src/lib/gemini.ts');
  }

  console.log('STEP 2: chamando Gemini API...');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nAnalise o conteúdo abaixo e gere o grafo:\n\n${text}`
          }]
        }]
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('Gemini API error:', response.status, err);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  console.log('STEP 3: resposta IA recebida, length =', rawText.length);

  // Strip markdown code fences
  const stripped = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('RAW IA RESPONSE:', rawText);
    throw new Error('IA não retornou JSON válido');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    console.error('JSON parse falhou, tentando reparar...', parseErr);
    try {
      const repaired = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x1F\x7F]/g, '');
      parsed = JSON.parse(repaired);
    } catch (repairErr) {
      console.error('ERRO DETALHADO IA:', repairErr);
      console.error('RAW JSON:', jsonMatch[0]);
      throw new Error('Falha ao interpretar resposta da IA');
    }
  }

  if (!Array.isArray(parsed.concepts) || !Array.isArray(parsed.dependencies)) {
    throw new Error('Formato inválido: concepts e dependencies são obrigatórios');
  }

  const concepts = parsed.concepts.map((c: any, i: number) => ({
    id: c.id || `node_${i + 1}`,
    title: String(c.title || `Conceito ${i + 1}`),
    level: Number(c.level) || 1,
    x: Number(c.x) || 500,
    y: Number(c.y) || 100,
    mastery: 0,
    description: String(c.description || ''),
    intuition: String(c.intuition || ''),
    formula: c.formula ? String(c.formula) : null,
  }));

  const nodeIds = new Set(concepts.map((n: any) => n.id));
  const edges = parsed.dependencies
    .filter((d: any) => nodeIds.has(d.from) && nodeIds.has(d.to))
    .map((d: any) => ({
      from: String(d.from),
      to: String(d.to),
      strength: Math.min(1, Math.max(0, Number(d.strength) || 0.5)),
    }));

  return {
    subjectName: parsed.subject_name || '',
    concepts,
    edges,
  };
}
