// ═══════════════════════════════════════════════════════
// STUDYOS — GERADOR DE EXERCÍCIOS COM IA (OpenAI)
// Gera exercícios on-demand por conceito com resolução
// ═══════════════════════════════════════════════════════

import { OPENAI_API_KEY, OPENAI_BASE_URL, MODELS, rateLimitedFetch } from '@/lib/gemini';
import type { GraphNode, Exercise } from '@/types/course';

// ─────────────────────────────────────────────────────
// SYSTEM PROMPT — EXERCÍCIOS
// ─────────────────────────────────────────────────────
const EXERCISE_SYSTEM_PROMPT = `# PAPEL
Você é um professor universitário brasileiro expert criando exercícios para alunos de graduação. Seus exercícios são claros, progressivos e com resoluções que realmente ensinam.

# CONTEXTO
O aluno estuda em universidade federal brasileira e precisa de exercícios COM RESOLUÇÃO COMPLETA porque:
- As listas da universidade geralmente não têm gabarito
- Não existem exemplos resolvidos disponíveis
- O aluno precisa entender o RACIOCÍNIO, não apenas a resposta

# GUARDRAILS
G1. Português Brasileiro
G2. Cada exercício DEVE ter resposta VERIFICÁVEL e CORRETA
G3. Resolução passo a passo, clara, como se ensinasse ao vivo
G4. Dificuldade progressiva: exercício 1 fácil → exercício 3 desafiador
G5. Retorne APENAS JSON válido
G6. Gere exatamente 3 exercícios
G7. Use contextos brasileiros quando possível
G8. Cada exercício deve testar algo que alunos frequentemente erram

# ADAPTAÇÃO POR DOMÍNIO
- mastery < 30%: exercícios básicos, aplicação direta
- mastery 30-70%: intermediários, com interpretação
- mastery > 70%: desafiadores, questões de prova

# FORMATO JSON
{
  "exercises": [
    {
      "id": "ex_1",
      "question": "Enunciado completo do exercício com todos os dados necessários.",
      "type": "numeric",
      "answer": "42.5",
      "tolerance": 0.1,
      "hint": "Dica que guia sem entregar a resposta",
      "solution": "Passo 1: ... Passo 2: ... Resultado: 42.5",
      "difficulty": 1
    },
    {
      "id": "ex_2",
      "question": "Qual das alternativas...?",
      "type": "multiple_choice",
      "answer": "B",
      "options": ["Alternativa A", "Alternativa B (correta)", "Alternativa C", "Alternativa D"],
      "hint": "Pense na relação entre X e Y",
      "solution": "A resposta é B porque...",
      "difficulty": 3
    },
    {
      "id": "ex_3",
      "question": "Verdadeiro ou Falso: [afirmação]",
      "type": "true_false",
      "answer": "false",
      "hint": "Analise cuidadosamente...",
      "solution": "FALSO porque...",
      "difficulty": 2
    }
  ]
}

# TIPOS
- "numeric": answer = string numérica, tolerance = margem de erro
- "multiple_choice": answer = "A"/"B"/"C"/"D", options = array de 4 strings
- "true_false": answer = "true" ou "false"

# REGRAS
- Exercício 1: Aplicação DIRETA (difficulty 1-2)
- Exercício 2: Contexto REAL (difficulty 2-3)
- Exercício 3: RACIOCÍNIO profundo / estilo prova (difficulty 3-5)
- Sem fórmula → use multiple_choice e true_false
- Com fórmula → pelo menos 1 numeric`;

// ─────────────────────────────────────────────────────
// GERADOR PRINCIPAL
// ─────────────────────────────────────────────────────

export async function generateExercisesForConcept(
  concept: GraphNode,
  prerequisiteNames: string[] = []
): Promise<Exercise[]> {
  console.log(`[StudyOS AI] Gerando exercícios: "${concept.title}" (mastery: ${Math.round(concept.mastery * 100)}%)`);

  if (!OPENAI_API_KEY) {
    throw new Error('VITE_OPENAI_API_KEY não configurada no .env');
  }

  const conceptContext = buildConceptContext(concept, prerequisiteNames);

  const response = await rateLimitedFetch(OPENAI_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELS.exerciseGeneration,
      messages: [
        { role: 'system', content: EXERCISE_SYSTEM_PROMPT },
        { role: 'user', content: `Gere exercícios para o seguinte conceito:\n\n${conceptContext}` },
      ],
      temperature: 0.8,
      max_tokens: 4096,
      response_format: { type: 'json_object' },  // JSON mode
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[StudyOS AI] Exercise Error:', response.status, err);

    if (response.status === 429) {
      throw new Error('Limite de requisições. Aguarde um momento.');
    }
    throw new Error(`Erro ao gerar exercícios: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';

  if (!content) {
    throw new Error('IA retornou resposta vazia para exercícios.');
  }

  console.log('[StudyOS AI] Exercícios recebidos:', content.length, 'chars');

  // Parse (JSON mode garante JSON válido)
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Fallback
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Formato inválido nos exercícios');
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error('Falha ao interpretar exercícios. Tente novamente.');
    }
  }

  if (!Array.isArray(parsed.exercises) || parsed.exercises.length === 0) {
    throw new Error('Não foi possível gerar exercícios. Tente novamente.');
  }

  return parsed.exercises.map((ex: any, i: number) => normalizeExercise(ex, i));
}

// ─────────────────────────────────────────────────────
// CONTEXTO DO CONCEITO
// ─────────────────────────────────────────────────────

function buildConceptContext(concept: GraphNode, prerequisiteNames: string[]): string {
  const lines: string[] = [
    `TÍTULO: ${concept.title}`,
    `NÍVEL: ${concept.level}/5`,
    `DOMÍNIO ATUAL: ${Math.round(concept.mastery * 100)}%`,
    ``,
    `DESCRIÇÃO: ${concept.description}`,
    `INTUIÇÃO: ${concept.intuition}`,
  ];

  if (concept.formula) {
    lines.push(`FÓRMULA: ${concept.formula}`);
  }

  if (concept.variables?.length > 0) {
    lines.push(
      `VARIÁVEIS:`,
      ...concept.variables.map(v => `  ${v.symbol} = ${v.meaning}${v.unit ? ` (${v.unit})` : ''}`)
    );
  }

  if (concept.keyPoints?.length > 0) {
    lines.push(`PONTOS-CHAVE:`, ...concept.keyPoints.map(kp => `  - ${kp}`));
  }

  if (concept.commonMistakes?.length > 0) {
    lines.push(`ERROS COMUNS (use para criar armadilhas):`, ...concept.commonMistakes.map(cm => `  - ${cm}`));
  }

  if (prerequisiteNames.length > 0) {
    lines.push(`PRÉ-REQUISITOS: ${prerequisiteNames.join(', ')}`);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────
// NORMALIZAÇÃO
// ─────────────────────────────────────────────────────

function normalizeExercise(ex: any, index: number): Exercise {
  const validTypes = ['numeric', 'multiple_choice', 'true_false'];
  const type = validTypes.includes(ex.type) ? ex.type : 'multiple_choice';

  return {
    id: ex.id || `ex_${Date.now()}_${index}`,
    question: String(ex.question || ''),
    type,
    answer: String(ex.answer || ''),
    tolerance: type === 'numeric' && ex.tolerance ? Number(ex.tolerance) : undefined,
    options: type === 'multiple_choice' && Array.isArray(ex.options)
      ? ex.options.map(String)
      : undefined,
    hint: String(ex.hint || 'Revise o conceito e tente novamente.'),
    solution: String(ex.solution || ''),
    difficulty: Math.min(5, Math.max(1, Number(ex.difficulty) || index + 1)),
  };
}
