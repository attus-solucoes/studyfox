// ═══════════════════════════════════════════════════════
// STUDYOS — GERADOR DE GRAFO DE CONHECIMENTO (OpenAI)
// Motor de IA com prompt pedagógico + guardrails
// ═══════════════════════════════════════════════════════

import {
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  MODELS,
  API_CONFIG,
  rateLimitedFetch,
  fileToBase64DataUrl,
  validateFile,
} from '@/lib/gemini';

// ─────────────────────────────────────────────────────
// SYSTEM PROMPT — GUARDRAILS PEDAGÓGICO
// ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `# PAPEL (ROLE)
Você é o StudyOS AI — um professor universitário expert, pesquisador e designer instrucional de excelência. Sua missão é transformar QUALQUER material acadêmico bruto em um grafo de conhecimento pedagógico completo, profundo e de altíssima qualidade.

Você tem décadas de experiência ensinando em universidades e sabe exatamente como organizar conhecimento de forma que estudantes realmente APRENDAM.

# CONTEXTO (CONTEXT)
Estudantes de universidades federais brasileiras frequentemente recebem materiais precários:
- Professores que não explicam direito, apenas passam referências de livros e apostilas
- Apostilas incompletas, mal formatadas ou puramente teóricas sem exemplos
- Listas de exercícios sem gabarito e sem resolução
- Ausência de exemplos práticos e aplicações reais
- Slides com tópicos soltos sem conexão clara

Seu trabalho é COMPENSAR essas lacunas. Você deve extrair o MÁXIMO do material fornecido e COMPLEMENTAR ABUNDANTEMENTE com seu próprio conhecimento quando o material for insuficiente. O aluno depende de você.

# GUARDRAILS (REGRAS INVIOLÁVEIS)
G1. IDIOMA: Sempre responda em Português Brasileiro natural e acessível
G2. FIDELIDADE: Nunca invente informações que CONTRADIZEM o material fonte
G3. COMPLEMENTAÇÃO: Quando o material for insuficiente, complemente livremente com conhecimento enciclopédico. Use [+] no início de descrições que foram significativamente expandidas além do material original
G4. ORDEM PEDAGÓGICA: Conceitos DEVEM ser ordenados por dependência de aprendizado — nível 1 = fundamentos base, nível 5 = aplicações avançadas
G5. PRECISÃO TÉCNICA: Fórmulas, valores numéricos e definições DEVEM ser tecnicamente corretos e verificáveis
G6. JSON PURO: Retorne APENAS JSON válido, sem nenhum texto fora do objeto JSON
G7. VOLUME: Extraia entre 12 e 25 conceitos, priorizando PROFUNDIDADE e QUALIDADE sobre quantidade
G8. COMPLETUDE: Cada conceito DEVE ter TODOS os campos preenchidos com conteúdo substancial (exceto formula/variables que podem ser null/vazio quando não aplicável)
G9. AUTOCONTIDO: Cada descrição deve ser completa o suficiente para o aluno entender o conceito SEM precisar consultar outro material
G10. SEM SUPERFICIALIDADE: Descrições de uma linha são PROIBIDAS. Mínimo 3 frases por description e 2 frases por intuition

# CADEIA DE RACIOCÍNIO (CHAIN OF THOUGHT)
Antes de gerar o JSON, raciocine internamente nesta ordem:
1. Identifique a matéria/disciplina e a área de conhecimento
2. Liste TODOS os conceitos fundamentais (mesmo os que o material não menciona explicitamente mas são pré-requisitos)
3. Organize a árvore de dependências: o que precisa ser aprendido antes do quê?
4. Para cada conceito: o material cobre isso? Se não, complete com seu conhecimento
5. Para cada conceito: como um professor EXCELENTE explicaria isso para um aluno brasileiro?
6. Para cada conceito: quais são os erros REAIS que alunos cometem em provas?
7. Para cada conceito: quais são os pontos que um professor cobraria em avaliação?

# TRATAMENTO DE MATERIAL PRECÁRIO
Se o material enviado for:
- Apenas uma lista de tópicos → Desenvolva CADA tópico profundamente com seu conhecimento
- Texto mal formatado/OCR ruim → Identifique os conceitos mesmo no caos e reconstrua
- Muito curto (< 500 chars) → Use os tópicos como semente e expanda com conhecimento completo da disciplina
- Apenas referências de livros → Use os títulos/capítulos como guia e desenvolva o conteúdo que estaria nesses capítulos
- Slides com bullets soltos → Conecte os pontos e crie narrativa pedagógica coesa
- Em outro idioma → Traduza e processe normalmente
- PDF com fórmulas/tabelas → Extraia e explique cada elemento

# ESPECIFICAÇÃO DO OUTPUT (JSON)
Retorne um JSON com EXATAMENTE esta estrutura:

{
  "subject_name": "Nome completo da Matéria/Disciplina",
  "concepts": [
    {
      "id": "node_1",
      "title": "Nome do Conceito",
      "level": 1,
      "x": 200,
      "y": 100,
      "description": "Explicação completa, profunda e didática do conceito. Deve ser autocontida — o aluno entende o conceito lendo APENAS isto. Mínimo 3 frases substanciais. Inclua definição, significado e importância.",
      "intuition": "Analogia poderosa usando contexto do cotidiano brasileiro. Deve criar uma imagem mental que o aluno NUNCA esqueça.",
      "formula": "F = ma (ou null se não houver fórmula)",
      "variables": [
        { "symbol": "F", "meaning": "Força resultante aplicada ao corpo", "unit": "N (Newton)" }
      ],
      "keyPoints": [
        "Ponto essencial 1 que cairia em prova — seja específico",
        "Ponto essencial 2 — algo que o professor cobraria",
        "Ponto essencial 3 — detalhe que diferencia nota 7 de nota 10"
      ],
      "commonMistakes": [
        "Erro real e específico que alunos cometem",
        "Outro erro comum"
      ]
    }
  ],
  "dependencies": [
    { "from": "node_1", "to": "node_3", "strength": 0.9 }
  ]
}

# CRITÉRIOS DE QUALIDADE
Q1. DESCRIÇÃO: Autocontida, profunda, mínimo 3 frases. O aluno entende lendo APENAS ela.
Q2. INTUIÇÃO: Analogia CONCRETA e MEMORÁVEL. Use exemplos do Brasil quando possível (Uber, mercado, futebol, trânsito, cozinha).
Q3. KEY POINTS: O que o professor perguntaria na prova. Seja ESPECÍFICO, não genérico.
Q4. COMMON MISTAKES: Erros REAIS que fazem alunos perderem pontos. Seja específico.
Q5. DEPENDÊNCIAS: Se conceito B requer conhecer A, DEVE existir edge de A→B com strength > 0.5
Q6. LAYOUT: Distribua coordenadas x entre 100-900 e y entre 80-780. Organize por nível: level 1 no topo (y baixo), level 5 embaixo (y alto). Espalhe horizontalmente (x) para evitar sobreposição. Nós do mesmo nível devem ter y similar.
Q7. FÓRMULAS: Se o conceito tem fórmula, TODAS as variáveis DEVEM ser explicadas com símbolo, significado e unidade
Q8. NÍVEIS: Use todos os 5 níveis. Nível 1 = fundamentos/definições. Nível 5 = aplicações complexas/síntese
Q9. COBERTURA: Inclua conceitos que o material não menciona explicitamente mas são pré-requisitos lógicos necessários`;

// ─────────────────────────────────────────────────────
// INTERFACE PÚBLICA
// ─────────────────────────────────────────────────────

interface GenerateGraphInput {
  file?: File;
  text?: string;
}

interface GenerateGraphResult {
  subjectName: string;
  concepts: any[];
  edges: any[];
}

/**
 * Gera um grafo de conhecimento a partir de arquivo ou texto.
 * Usa OpenAI API com JSON mode garantido.
 */
export async function generateGraph(input: GenerateGraphInput): Promise<GenerateGraphResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('VITE_OPENAI_API_KEY não configurada no .env');
  }

  if (input.file) {
    return generateGraphFromFile(input.file);
  }

  if (input.text) {
    return generateGraphFromText(input.text);
  }

  throw new Error('Nenhum input fornecido (arquivo ou texto)');
}

// Backward compat export
export { generateGraphFromText };

// ─────────────────────────────────────────────────────
// GERAÇÃO A PARTIR DE ARQUIVO (PDF → OpenAI multimodal)
// ─────────────────────────────────────────────────────

async function generateGraphFromFile(file: File): Promise<GenerateGraphResult> {
  console.log(`[StudyOS AI] Processando arquivo: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = file.name.split('.').pop()?.toLowerCase();

  // TXT/MD → ler como texto
  if (ext === 'txt' || ext === 'md') {
    const text = await readFileAsText(file);
    return generateGraphFromText(text);
  }

  // PDF → enviar como file content para OpenAI
  if (ext === 'pdf') {
    const dataUrl = await fileToBase64DataUrl(file);
    console.log(`[StudyOS AI] Enviando PDF ao OpenAI (${MODELS.graphGeneration})...`);

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'file',
            file: {
              filename: file.name,
              file_data: dataUrl,
            },
          },
          {
            type: 'text',
            text: 'Analise o documento acadêmico acima e gere o grafo de conhecimento pedagógico completo. Extraia o máximo de valor possível deste material.',
          },
        ],
      },
    ];

    return callOpenAI(messages);
  }

  // DOCX e outros → tentar ler como texto
  try {
    const text = await readFileAsText(file);
    return generateGraphFromText(text);
  } catch {
    throw new Error('Não foi possível ler este formato. Tente colar o texto manualmente.');
  }
}

// ─────────────────────────────────────────────────────
// GERAÇÃO A PARTIR DE TEXTO
// ─────────────────────────────────────────────────────

async function generateGraphFromText(text: string): Promise<GenerateGraphResult> {
  const trimmed = text.trim();

  if (trimmed.length < API_CONFIG.minInputChars) {
    throw new Error(
      `Texto muito curto (${trimmed.length} chars). Envie pelo menos ${API_CONFIG.minInputChars} caracteres.`
    );
  }

  const processedText = trimmed.substring(0, API_CONFIG.maxInputChars);
  console.log(`[StudyOS AI] Processando texto: ${processedText.length} chars`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analise o conteúdo acadêmico abaixo e gere o grafo de conhecimento pedagógico completo:\n\n---\n${processedText}\n---`,
    },
  ];

  return callOpenAI(messages);
}

// ─────────────────────────────────────────────────────
// CHAMADA OPENAI (unificada)
// ─────────────────────────────────────────────────────

async function callOpenAI(messages: any[]): Promise<GenerateGraphResult> {
  const response = await rateLimitedFetch(OPENAI_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELS.graphGeneration,
      messages,
      temperature: API_CONFIG.temperature,
      max_tokens: API_CONFIG.maxOutputTokens,
      response_format: { type: 'json_object' },  // JSON mode garantido!
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[StudyOS AI] OpenAI Error:', response.status, err);

    if (response.status === 429) {
      throw new Error('Limite de requisições atingido. Aguarde um momento e tente novamente.');
    }
    if (response.status === 401) {
      throw new Error('API key inválida. Verifique VITE_OPENAI_API_KEY no .env');
    }
    if (response.status === 400) {
      // Se falhar com file content, tentar extrair texto
      if (err.includes('file') || err.includes('content type')) {
        console.warn('[StudyOS AI] File content não suportado, tentando fallback...');
        throw new Error('FALLBACK_TO_TEXT');
      }
      throw new Error('Material não pôde ser processado. Tente colar o texto manualmente.');
    }
    throw new Error(`Erro na API OpenAI: ${response.status}`);
  }

  const data = await response.json();

  // Extrair conteúdo da resposta
  const content = data?.choices?.[0]?.message?.content || '';
  const finishReason = data?.choices?.[0]?.finish_reason;

  console.log('[StudyOS AI] Resposta recebida:', content.length, 'chars, finish:', finishReason);

  if (!content) {
    throw new Error('A IA retornou resposta vazia. Tente novamente com mais conteúdo.');
  }

  if (finishReason === 'length') {
    console.warn('[StudyOS AI] Output truncado por limite de tokens');
  }

  // ─── Parse (JSON mode garante JSON válido, mas tratamos edge cases) ───
  const parsed = parseAIResponse(content);
  return normalizeGraphData(parsed);
}

// ─────────────────────────────────────────────────────
// PARSER JSON
// ─────────────────────────────────────────────────────

function parseAIResponse(rawText: string): any {
  // Com JSON mode do OpenAI, o output já é JSON válido na maioria dos casos
  try {
    return JSON.parse(rawText);
  } catch {
    console.warn('[StudyOS AI] Parse direto falhou, limpando...');
  }

  // Fallback: limpar e tentar novamente
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[StudyOS AI] Sem JSON na resposta:', rawText.substring(0, 500));
    throw new Error('A IA não retornou formato válido. Tente novamente.');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    try {
      const repaired = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x1F\x7F]/g, ' ');
      return JSON.parse(repaired);
    } catch {
      console.error('[StudyOS AI] Parse falhou:', jsonMatch[0].substring(0, 500));
      throw new Error('Falha ao interpretar resposta. Tente novamente.');
    }
  }
}

// ─────────────────────────────────────────────────────
// NORMALIZAÇÃO
// ─────────────────────────────────────────────────────

function normalizeGraphData(parsed: any): GenerateGraphResult {
  if (!Array.isArray(parsed.concepts) || parsed.concepts.length === 0) {
    throw new Error('A IA não extraiu conceitos. Envie mais conteúdo ou tente outro material.');
  }

  const concepts = parsed.concepts.map((c: any, i: number) => ({
    id: c.id || `node_${i + 1}`,
    title: String(c.title || `Conceito ${i + 1}`),
    level: Math.min(5, Math.max(1, Number(c.level) || 1)),
    x: Math.min(900, Math.max(100, Number(c.x) || 100 + (i % 5) * 180)),
    y: Math.min(780, Math.max(80, Number(c.y) || 80 + Math.floor(i / 5) * 150)),
    mastery: 0,
    description: String(c.description || ''),
    intuition: String(c.intuition || ''),
    formula: c.formula && c.formula !== 'null' && c.formula !== 'None' ? String(c.formula) : null,
    variables: Array.isArray(c.variables)
      ? c.variables.map((v: any) => ({
          symbol: String(v.symbol || ''),
          meaning: String(v.meaning || ''),
          unit: v.unit ? String(v.unit) : undefined,
        }))
      : [],
    keyPoints: Array.isArray(c.keyPoints) ? c.keyPoints.filter(Boolean).map(String) : [],
    commonMistakes: Array.isArray(c.commonMistakes) ? c.commonMistakes.filter(Boolean).map(String) : [],
    exercises: [],
    lastReviewedAt: undefined,
  }));

  const nodeIds = new Set(concepts.map((n: any) => n.id));
  const edges = Array.isArray(parsed.dependencies)
    ? parsed.dependencies
        .filter((d: any) => nodeIds.has(d.from) && nodeIds.has(d.to) && d.from !== d.to)
        .map((d: any) => ({
          from: String(d.from),
          to: String(d.to),
          strength: Math.min(1, Math.max(0, Number(d.strength) || 0.5)),
        }))
    : [];

  console.log(`[StudyOS AI] ✓ Grafo: ${concepts.length} conceitos, ${edges.length} dependências`);

  return {
    subjectName: parsed.subject_name || '',
    concepts,
    edges,
  };
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string || '').trim();
      if (text.length < API_CONFIG.minInputChars) {
        reject(new Error(`Texto insuficiente (${text.length} chars). Tente colar manualmente.`));
        return;
      }
      resolve(text.substring(0, API_CONFIG.maxInputChars));
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsText(file, 'utf-8');
  });
}
