import { GEMINI_API_KEY } from '@/lib/gemini';
import type { GraphNode, GraphEdge } from '@/types/course';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Você é um especialista em pedagogia e mapeamento de conhecimento.
A partir do conteúdo acadêmico fornecido, gere um knowledge graph estruturado.

REGRAS:
1. Identifique os conceitos-chave do material (entre 8 e 25 nós).
2. Organize por nível de complexidade (level 0 = fundamentos, level 1 = intermediários, level 2+ = avançados).
3. Crie conexões (edges) entre conceitos que são pré-requisitos ou relacionados.
4. Para cada nó, forneça: título curto, descrição clara, uma explicação intuitiva (analogia), e fórmula se aplicável.
5. Distribua os nós espacialmente: x entre 100-900, y entre 80-780, evitando sobreposição.

Responda APENAS com JSON válido neste formato exato (sem markdown, sem código):
{
  "nodes": [
    {
      "id": "node_1",
      "title": "Nome do Conceito",
      "level": 0,
      "x": 500,
      "y": 100,
      "mastery": 0,
      "description": "Descrição clara do conceito",
      "intuition": "Analogia ou explicação intuitiva",
      "formula": "E = mc²"
    }
  ],
  "edges": [
    {
      "from": "node_1",
      "to": "node_2",
      "strength": 0.8
    }
  ]
}`;

function layoutNodes(nodes: GraphNode[]): GraphNode[] {
  const levels = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    const arr = levels.get(n.level) || [];
    arr.push(n);
    levels.set(n.level, arr);
  }

  const sortedLevels = [...levels.keys()].sort((a, b) => a - b);
  const totalLevels = sortedLevels.length;

  for (let li = 0; li < totalLevels; li++) {
    const level = sortedLevels[li];
    const group = levels.get(level)!;
    const yBase = 80 + (li / Math.max(totalLevels - 1, 1)) * 700;

    for (let ni = 0; ni < group.length; ni++) {
      const xBase = 100 + (ni / Math.max(group.length - 1, 1)) * 800;
      group[ni].x = group.length === 1 ? 500 : Math.round(xBase);
      group[ni].y = Math.round(yBase);
    }
  }

  return nodes;
}

export async function generateGraphFromContent(content: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const truncated = content.slice(0, 30000); // Gemini context limit safety

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `\n\nCONTEÚDO DA APOSTILA:\n\n${truncated}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Gemini API error:', err);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Resposta vazia da Gemini API');
  }

  // Extract JSON from response (handle possible markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON não encontrado na resposta');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('Formato inválido: nodes e edges são obrigatórios');
  }

  // Validate and normalize nodes
  const nodes: GraphNode[] = parsed.nodes.map((n: any, i: number) => ({
    id: n.id || `node_${i + 1}`,
    title: String(n.title || `Conceito ${i + 1}`),
    level: Number(n.level) || 0,
    x: Number(n.x) || 500,
    y: Number(n.y) || 100,
    mastery: 0,
    description: String(n.description || ''),
    intuition: String(n.intuition || ''),
    formula: n.formula ? String(n.formula) : null,
  }));

  const nodeIds = new Set(nodes.map(n => n.id));
  const edges: GraphEdge[] = parsed.edges
    .filter((e: any) => nodeIds.has(e.from) && nodeIds.has(e.to))
    .map((e: any) => ({
      from: String(e.from),
      to: String(e.to),
      strength: Math.min(1, Math.max(0, Number(e.strength) || 0.5)),
    }));

  return { nodes: layoutNodes(nodes), edges };
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}
