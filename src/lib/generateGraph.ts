// ═══════════════════════════════════════════════════════
// STUDYOS — GERADOR DE GRAFO DE CONHECIMENTO (OpenAI)
// Motor Multi-Pass: Estrutura → Capítulos → Conexões
// ═══════════════════════════════════════════════════════

import {
  MODELS,
  API_CONFIG,
  callOpenAIProxy,
  fileToBase64DataUrl,
  validateFile,
} from '@/lib/gemini';

// ─────────────────────────────────────────────────────
// TIPOS
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

export interface ProgressInfo {
  step: string;
  current: number;
  total: number;
  detail?: string;
}

export type ProgressCallback = (info: ProgressInfo) => void;

interface ChapterInfo {
  id: string;
  title: string;
  topics: string[];
}

// ─────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────

const BASE_ROLE = `Você é o StudyOS AI — um professor universitário expert, pesquisador e designer instrucional de excelência.

CONTEXTO: Estudantes de universidades federais brasileiras frequentemente recebem materiais precários: professores que não explicam direito, apostilas incompletas, listas sem gabarito. Seu trabalho é COMPENSAR essas lacunas.`;

const STRUCTURE_PROMPT = `${BASE_ROLE}

# TAREFA
Analise o material acadêmico e extraia a ESTRUTURA de capítulos/seções/tópicos.

# REGRAS
- Identifique TODOS os capítulos, seções ou grandes temas do material
- Se não houver capítulos explícitos, divida por temas lógicos
- Liste os tópicos principais de cada capítulo
- Retorne APENAS JSON válido

# OUTPUT (JSON)
{
  "subject_name": "Nome da Matéria/Disciplina",
  "chapters": [
    {
      "id": "ch_1",
      "title": "Nome do Capítulo/Seção",
      "topics": ["Tópico 1", "Tópico 2", "Tópico 3"]
    }
  ]
}

Extraia entre 3 e 12 capítulos. Se o material for curto, extraia pelo menos 2-3 seções temáticas.`;

function buildChapterPrompt(chapter: ChapterInfo, chapterIndex: number, totalChapters: number): string {
  return `${BASE_ROLE}

# TAREFA
Extraia conceitos PROFUNDOS do capítulo "${chapter.title}" (capítulo ${chapterIndex + 1} de ${totalChapters}).
Tópicos deste capítulo: ${chapter.topics.join(', ')}

# GUARDRAILS
G1. IDIOMA: Português Brasileiro
G2. FIDELIDADE: Nunca invente informações que contradizem o material
G3. COMPLEMENTAÇÃO: Quando o material for insuficiente, complemente com conhecimento enciclopédico. Use [+] em descrições expandidas além do material
G4. PRECISÃO: Fórmulas e definições DEVEM ser tecnicamente corretas
G5. JSON PURO: Retorne APENAS JSON válido
G6. VOLUME: Extraia entre 5 e 15 conceitos deste capítulo — PROFUNDIDADE sobre quantidade
G7. COMPLETUDE: Cada conceito DEVE ter TODOS os campos preenchidos substancialmente
G8. AUTOCONTIDO: Cada descrição completa o suficiente para entender SEM consultar outro material
G9. SEM SUPERFICIALIDADE: Descrições de uma linha são PROIBIDAS. Mínimo 3 frases por description

# CADEIA DE RACIOCÍNIO
1. Liste os conceitos do capítulo (incluindo pré-requisitos implícitos)
2. Organize por ordem de aprendizado (level 1=base, 5=avançado)
3. Para cada: como um professor EXCELENTE explicaria?
4. Para cada: quais erros reais alunos cometem em provas?
5. Para cada: o que cairia em avaliação?

# OUTPUT (JSON)
{
  "concepts": [
    {
      "id": "ch${chapterIndex + 1}_node_1",
      "title": "Nome do Conceito",
      "level": 1,
      "description": "Explicação completa, profunda e didática. Mínimo 3 frases. Inclua definição, significado e importância.",
      "intuition": "Analogia poderosa usando cotidiano brasileiro que o aluno NUNCA esqueça.",
      "formula": "F = ma (ou null se não houver)",
      "variables": [
        { "symbol": "F", "meaning": "Força resultante", "unit": "N" }
      ],
      "keyPoints": [
        "Ponto que cairia em prova — seja específico",
        "Detalhe que diferencia nota 7 de nota 10"
      ],
      "commonMistakes": [
        "Erro real e específico que alunos cometem"
      ]
    }
  ],
  "internal_dependencies": [
    { "from": "ch${chapterIndex + 1}_node_1", "to": "ch${chapterIndex + 1}_node_3", "strength": 0.9 }
  ]
}`;
}

function buildConnectionsPrompt(allConcepts: { id: string; title: string; chapter: string }[]): string {
  const conceptList = allConcepts.map(c => `- ${c.id}: "${c.title}" (${c.chapter})`).join('\n');

  return `${BASE_ROLE}

# TAREFA
Analise os conceitos abaixo (extraídos de diferentes capítulos) e identifique DEPENDÊNCIAS ENTRE CAPÍTULOS.

# CONCEITOS
${conceptList}

# REGRAS
- Identifique APENAS dependências ENTRE capítulos diferentes (cross-chapter)
- Se conceito B de capítulo 3 requer conceito A de capítulo 1, crie edge A→B
- Strength: 0.9 = essencial, 0.5 = útil saber, 0.3 = tangencial
- Retorne APENAS JSON válido

# OUTPUT (JSON)
{
  "cross_dependencies": [
    { "from": "ch1_node_2", "to": "ch3_node_1", "strength": 0.8 }
  ]
}`;
}

const SINGLE_PASS_PROMPT = `${BASE_ROLE}

# TAREFA
Transforme o material acadêmico em um grafo de conhecimento pedagógico completo e profundo.

# GUARDRAILS
G1. IDIOMA: Português Brasileiro natural e acessível
G2. FIDELIDADE: Nunca invente informações que CONTRADIZEM o material fonte
G3. COMPLEMENTAÇÃO: Quando insuficiente, complemente com conhecimento enciclopédico. Use [+] em descrições expandidas
G4. ORDEM PEDAGÓGICA: Conceitos ordenados por dependência — nível 1 = fundamentos, nível 5 = avançado
G5. PRECISÃO: Fórmulas e definições tecnicamente corretas
G6. JSON PURO: Retorne APENAS JSON válido
G7. VOLUME: Extraia entre 12 e 25 conceitos — PROFUNDIDADE sobre quantidade
G8. COMPLETUDE: Cada conceito com TODOS os campos preenchidos substancialmente
G9. AUTOCONTIDO: Descrições completas sem consultar outro material
G10. SEM SUPERFICIALIDADE: Mínimo 3 frases por description e 2 por intuition

# CADEIA DE RACIOCÍNIO
1. Identifique matéria e área de conhecimento
2. Liste TODOS os conceitos (incluindo pré-requisitos implícitos)
3. Organize árvore de dependências
4. Para cada: como um professor EXCELENTE explicaria?
5. Para cada: erros REAIS em provas?
6. Para cada: pontos de avaliação?

# TRATAMENTO DE MATERIAL PRECÁRIO
- Lista de tópicos → Desenvolva cada tópico profundamente
- Texto mal formatado → Identifique conceitos e reconstrua
- Muito curto → Use tópicos como semente e expanda
- Referências de livros → Desenvolva o conteúdo esperado
- Slides com bullets → Crie narrativa pedagógica coesa

# OUTPUT (JSON)
{
  "subject_name": "Nome da Matéria",
  "concepts": [
    {
      "id": "node_1",
      "title": "Nome do Conceito",
      "level": 1,
      "x": 200, "y": 100,
      "description": "Explicação completa e profunda. Mínimo 3 frases.",
      "intuition": "Analogia memorável do cotidiano brasileiro.",
      "formula": "F = ma (ou null)",
      "variables": [{ "symbol": "F", "meaning": "Força resultante", "unit": "N" }],
      "keyPoints": ["O que cairia na prova"],
      "commonMistakes": ["Erro real de alunos"]
    }
  ],
  "dependencies": [
    { "from": "node_1", "to": "node_3", "strength": 0.9 }
  ]
}

LAYOUT: x entre 100-900, y entre 80-780. Level 1 no topo (y baixo), level 5 embaixo.`;

// ─────────────────────────────────────────────────────
// INTERFACE PÚBLICA
// ─────────────────────────────────────────────────────

export async function generateGraph(
  input: GenerateGraphInput,
  onProgress?: ProgressCallback
): Promise<GenerateGraphResult> {
  if (input.file) {
    return generateGraphFromFile(input.file, onProgress);
  }

  if (input.text) {
    return generateGraphFromText(input.text, onProgress);
  }

  throw new Error('Nenhum input fornecido (arquivo ou texto)');
}

// Backward compat export
export { generateGraphFromText };

// ─────────────────────────────────────────────────────
// GERAÇÃO A PARTIR DE ARQUIVO
// ─────────────────────────────────────────────────────

async function generateGraphFromFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<GenerateGraphResult> {
  console.log(`[StudyOS AI] Processando arquivo: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = file.name.split('.').pop()?.toLowerCase();

  // TXT/MD → ler como texto
  if (ext === 'txt' || ext === 'md') {
    const text = await readFileAsText(file);
    return generateGraphFromText(text, onProgress);
  }

  // PDF → Decidir single-pass ou multi-pass
  if (ext === 'pdf') {
    const sizeMB = file.size / (1024 * 1024);
    // PDFs > ~1MB (~15+ páginas) usam multi-pass
    const useMultiPass = sizeMB > 0.5;

    if (useMultiPass) {
      console.log(`[StudyOS AI] PDF grande (${sizeMB.toFixed(1)}MB) → Multi-Pass Deep Extraction`);
      return multiPassPDF(file, onProgress);
    } else {
      console.log(`[StudyOS AI] PDF pequeno → Single Pass`);
      return singlePassPDF(file, onProgress);
    }
  }

  // DOCX e outros
  try {
    const text = await readFileAsText(file);
    return generateGraphFromText(text, onProgress);
  } catch {
    throw new Error('Não foi possível ler este formato. Tente colar o texto manualmente.');
  }
}

// ─────────────────────────────────────────────────────
// MULTI-PASS DEEP EXTRACTION (PDFs grandes)
// ─────────────────────────────────────────────────────

async function multiPassPDF(
  file: File,
  onProgress?: ProgressCallback
): Promise<GenerateGraphResult> {
  const dataUrl = await fileToBase64DataUrl(file);

  // ═══ PASS 1: Extrair estrutura ═══
  onProgress?.({ step: 'Analisando estrutura do material...', current: 1, total: 4, detail: 'Identificando capítulos e tópicos' });
  console.log('[StudyOS AI] Pass 1: Extraindo estrutura...');

  const structureMessages: any[] = [
    { role: 'system', content: STRUCTURE_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'file', file: { filename: file.name, file_data: dataUrl } },
        { type: 'text', text: 'Analise a estrutura completa deste material acadêmico. Identifique todos os capítulos, seções e tópicos.' },
      ],
    },
  ];

  const structureData = await callOpenAI(structureMessages, API_CONFIG.structureOutputTokens);
  const chapters: ChapterInfo[] = structureData.chapters || [];

  if (chapters.length === 0) {
    console.warn('[StudyOS AI] Nenhum capítulo detectado, fallback para single pass');
    return singlePassPDF(file, onProgress);
  }

  console.log(`[StudyOS AI] ${chapters.length} capítulos detectados:`, chapters.map(c => c.title));
  const subjectName = structureData.subject_name || '';

  // ═══ PASS 2: Extração profunda por capítulo ═══
  const totalSteps = chapters.length + 3; // structure + N chapters + connections + assembly
  const allConcepts: any[] = [];
  const allInternalEdges: any[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    onProgress?.({
      step: `Processando capítulo ${i + 1} de ${chapters.length}`,
      current: i + 2,
      total: totalSteps,
      detail: chapter.title,
    });

    console.log(`[StudyOS AI] Pass 2.${i + 1}: Capítulo "${chapter.title}"...`);

    try {
      const chapterPrompt = buildChapterPrompt(chapter, i, chapters.length);
      const chapterMessages: any[] = [
        { role: 'system', content: chapterPrompt },
        {
          role: 'user',
          content: [
            { type: 'file', file: { filename: file.name, file_data: dataUrl } },
            {
              type: 'text',
              text: `Foque EXCLUSIVAMENTE no capítulo "${chapter.title}" deste material. Tópicos a cobrir: ${chapter.topics.join(', ')}. Extraia conceitos profundos com explicações completas, fórmulas, pontos-chave e erros comuns.`,
            },
          ],
        },
      ];

      const chapterData = await callOpenAI(chapterMessages, API_CONFIG.chapterOutputTokens);
      const concepts = chapterData.concepts || [];
      const internalDeps = chapterData.internal_dependencies || [];

      // Tag each concept with chapter info
      concepts.forEach((c: any) => {
        c._chapter = chapter.title;
        c._chapterIndex = i;
      });

      allConcepts.push(...concepts);
      allInternalEdges.push(...internalDeps);

      console.log(`[StudyOS AI] ✓ Cap. ${i + 1}: ${concepts.length} conceitos`);
    } catch (err: any) {
      console.error(`[StudyOS AI] ✗ Cap. ${i + 1} falhou:`, err?.message);
      // Continue with other chapters even if one fails
    }
  }

  if (allConcepts.length === 0) {
    console.warn('[StudyOS AI] Nenhum conceito extraído dos capítulos, fallback');
    return singlePassPDF(file, onProgress);
  }

  // ═══ PASS 3: Conexões entre capítulos ═══
  onProgress?.({
    step: 'Conectando conceitos entre capítulos...',
    current: chapters.length + 2,
    total: totalSteps,
    detail: `${allConcepts.length} conceitos encontrados`,
  });

  console.log(`[StudyOS AI] Pass 3: Conectando ${allConcepts.length} conceitos...`);

  let crossEdges: any[] = [];
  try {
    const conceptSummaries = allConcepts.map((c: any) => ({
      id: c.id,
      title: c.title,
      chapter: c._chapter || 'unknown',
    }));

    const connectMessages = [
      { role: 'system', content: buildConnectionsPrompt(conceptSummaries) },
      {
        role: 'user',
        content: `Identifique as dependências entre conceitos de capítulos DIFERENTES. Quais conceitos de capítulos anteriores são pré-requisitos para conceitos em capítulos posteriores?`,
      },
    ];

    const connectData = await callOpenAI(connectMessages, API_CONFIG.structureOutputTokens);
    crossEdges = connectData.cross_dependencies || [];
    console.log(`[StudyOS AI] ✓ ${crossEdges.length} conexões cross-chapter`);
  } catch (err: any) {
    console.warn('[StudyOS AI] Conexões cross-chapter falharam:', err?.message);
  }

  // ═══ PASS 4: Assembly ═══
  onProgress?.({
    step: 'Montando grafo final...',
    current: totalSteps,
    total: totalSteps,
    detail: `${allConcepts.length} conceitos, ${allInternalEdges.length + crossEdges.length} conexões`,
  });

  console.log('[StudyOS AI] Pass 4: Montando grafo final...');

  return assembleMultiPassGraph(subjectName, allConcepts, allInternalEdges, crossEdges, chapters);
}

// ─────────────────────────────────────────────────────
// ASSEMBLY DO GRAFO MULTI-PASS
// ─────────────────────────────────────────────────────

function assembleMultiPassGraph(
  subjectName: string,
  allConcepts: any[],
  internalEdges: any[],
  crossEdges: any[],
  chapters: ChapterInfo[]
): GenerateGraphResult {
  // Normalizar conceitos com posição auto-calculada
  const concepts = allConcepts.map((c: any, globalIndex: number) => {
    const chapterIndex = c._chapterIndex || 0;
    const chapConcepts = allConcepts.filter((x: any) => x._chapterIndex === chapterIndex);
    const localIndex = chapConcepts.indexOf(c);

    // Layout: capítulos em faixas horizontais, conceitos dentro organizados por nível
    const level = Math.min(5, Math.max(1, Number(c.level) || 1));
    const xSpread = 800; // 100 to 900
    const ySpread = 700; // 80 to 780
    const chapCount = chapters.length || 1;

    // X baseado no nível + spread dentro do nível
    const levelConcepts = chapConcepts.filter((x: any) => (x.level || 1) === level);
    const levelIndex = levelConcepts.indexOf(c);
    const levelCount = Math.max(1, levelConcepts.length);
    const x = Math.round(100 + (levelIndex / levelCount) * xSpread + (Math.random() * 40 - 20));

    // Y baseado no nível (nível 1 no topo, nível 5 embaixo) + offset por capítulo
    const baseY = 80 + ((level - 1) / 4) * ySpread;
    const chapterOffset = (chapterIndex / chapCount) * 30 - 15; // Sutil
    const y = Math.round(baseY + chapterOffset + (Math.random() * 20 - 10));

    return {
      id: c.id || `node_${globalIndex + 1}`,
      title: String(c.title || `Conceito ${globalIndex + 1}`),
      level: level,
      x: Math.min(900, Math.max(100, x)),
      y: Math.min(780, Math.max(80, y)),
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
    };
  });

  // Merge all edges
  const nodeIds = new Set(concepts.map((n: any) => n.id));
  const allEdges = [...internalEdges, ...crossEdges];
  const edges = allEdges
    .filter((d: any) => nodeIds.has(d.from) && nodeIds.has(d.to) && d.from !== d.to)
    .map((d: any) => ({
      from: String(d.from),
      to: String(d.to),
      strength: Math.min(1, Math.max(0, Number(d.strength) || 0.5)),
    }));

  // Deduplicate edges
  const edgeSet = new Set<string>();
  const uniqueEdges = edges.filter((e: any) => {
    const key = `${e.from}->${e.to}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    return true;
  });

  console.log(`[StudyOS AI] ✓ Grafo final: ${concepts.length} conceitos, ${uniqueEdges.length} dependências`);

  return { subjectName, concepts, edges: uniqueEdges };
}

// ─────────────────────────────────────────────────────
// SINGLE PASS (PDFs pequenos e textos)
// ─────────────────────────────────────────────────────

async function singlePassPDF(
  file: File,
  onProgress?: ProgressCallback
): Promise<GenerateGraphResult> {
  const dataUrl = await fileToBase64DataUrl(file);

  onProgress?.({ step: 'Analisando material...', current: 1, total: 2, detail: file.name });
  console.log(`[StudyOS AI] Single pass: ${file.name} (${MODELS.graphGeneration})`);

  const messages: any[] = [
    { role: 'system', content: SINGLE_PASS_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'file', file: { filename: file.name, file_data: dataUrl } },
        { type: 'text', text: 'Analise o documento acadêmico acima e gere o grafo de conhecimento pedagógico completo. Extraia o máximo de valor possível deste material.' },
      ],
    },
  ];

  const parsed = await callOpenAI(messages, API_CONFIG.maxOutputTokens);
  onProgress?.({ step: 'Montando grafo...', current: 2, total: 2 });
  return normalizeGraphData(parsed);
}

async function generateGraphFromText(
  text: string,
  onProgress?: ProgressCallback
): Promise<GenerateGraphResult> {
  const trimmed = text.trim();

  if (trimmed.length < API_CONFIG.minInputChars) {
    throw new Error(
      `Texto muito curto (${trimmed.length} chars). Envie pelo menos ${API_CONFIG.minInputChars} caracteres.`
    );
  }

  const processedText = trimmed.substring(0, API_CONFIG.maxInputChars);

  // Textos grandes: multi-pass via chunking
  if (processedText.length > API_CONFIG.multiPassThresholdChars) {
    console.log(`[StudyOS AI] Texto grande (${processedText.length} chars) → Multi-pass`);
    return multiPassText(processedText, onProgress);
  }

  onProgress?.({ step: 'Analisando material...', current: 1, total: 2, detail: `${processedText.length} caracteres` });
  console.log(`[StudyOS AI] Single pass texto: ${processedText.length} chars`);

  const messages = [
    { role: 'system', content: SINGLE_PASS_PROMPT },
    {
      role: 'user',
      content: `Analise o conteúdo acadêmico abaixo e gere o grafo de conhecimento pedagógico completo:\n\n---\n${processedText}\n---`,
    },
  ];

  const parsed = await callOpenAI(messages, API_CONFIG.maxOutputTokens);
  onProgress?.({ step: 'Montando grafo...', current: 2, total: 2 });
  return normalizeGraphData(parsed);
}

// ─────────────────────────────────────────────────────
// MULTI-PASS PARA TEXTOS GRANDES
// ─────────────────────────────────────────────────────

async function multiPassText(
  fullText: string,
  onProgress?: ProgressCallback
): Promise<GenerateGraphResult> {
  // Pass 1: Extrair estrutura
  onProgress?.({ step: 'Analisando estrutura do material...', current: 1, total: 4, detail: 'Identificando seções' });

  const structureMessages = [
    { role: 'system', content: STRUCTURE_PROMPT },
    {
      role: 'user',
      content: `Analise a estrutura deste material acadêmico:\n\n---\n${fullText.substring(0, 30000)}\n---`,
    },
  ];

  const structureData = await callOpenAI(structureMessages, API_CONFIG.structureOutputTokens);
  const chapters: ChapterInfo[] = structureData.chapters || [];

  if (chapters.length === 0) {
    // Fallback single pass
    const messages = [
      { role: 'system', content: SINGLE_PASS_PROMPT },
      { role: 'user', content: `Analise:\n\n---\n${fullText}\n---` },
    ];
    const parsed = await callOpenAI(messages, API_CONFIG.maxOutputTokens);
    return normalizeGraphData(parsed);
  }

  const subjectName = structureData.subject_name || '';
  const totalSteps = chapters.length + 3;
  const allConcepts: any[] = [];
  const allInternalEdges: any[] = [];

  // Pass 2: Capítulo por capítulo
  // Dividir texto em chunks estimados por capítulo
  const chunkSize = Math.ceil(fullText.length / chapters.length);

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    onProgress?.({
      step: `Processando seção ${i + 1} de ${chapters.length}`,
      current: i + 2,
      total: totalSteps,
      detail: chapter.title,
    });

    // Estimar chunk de texto para este capítulo
    const startPos = Math.max(0, i * chunkSize - 500); // overlap
    const endPos = Math.min(fullText.length, (i + 1) * chunkSize + 500);
    const chapterText = fullText.substring(startPos, endPos);

    try {
      const chapterPrompt = buildChapterPrompt(chapter, i, chapters.length);
      const chapterMessages = [
        { role: 'system', content: chapterPrompt },
        {
          role: 'user',
          content: `Foque no capítulo "${chapter.title}". Texto relevante:\n\n---\n${chapterText}\n---`,
        },
      ];

      const chapterData = await callOpenAI(chapterMessages, API_CONFIG.chapterOutputTokens);
      const concepts = chapterData.concepts || [];
      const internalDeps = chapterData.internal_dependencies || [];

      concepts.forEach((c: any) => {
        c._chapter = chapter.title;
        c._chapterIndex = i;
      });

      allConcepts.push(...concepts);
      allInternalEdges.push(...internalDeps);
      console.log(`[StudyOS AI] ✓ Seção ${i + 1}: ${concepts.length} conceitos`);
    } catch (err: any) {
      console.error(`[StudyOS AI] ✗ Seção ${i + 1} falhou:`, err?.message);
    }
  }

  // Pass 3: Conexões
  onProgress?.({
    step: 'Conectando conceitos...',
    current: chapters.length + 2,
    total: totalSteps,
    detail: `${allConcepts.length} conceitos`,
  });

  let crossEdges: any[] = [];
  if (allConcepts.length > 3) {
    try {
      const conceptSummaries = allConcepts.map((c: any) => ({
        id: c.id, title: c.title, chapter: c._chapter || '',
      }));
      const connectMessages = [
        { role: 'system', content: buildConnectionsPrompt(conceptSummaries) },
        { role: 'user', content: 'Identifique dependências entre conceitos de seções diferentes.' },
      ];
      const connectData = await callOpenAI(connectMessages, API_CONFIG.structureOutputTokens);
      crossEdges = connectData.cross_dependencies || [];
    } catch {
      console.warn('[StudyOS AI] Cross-connections falhou');
    }
  }

  // Assembly
  onProgress?.({ step: 'Montando grafo final...', current: totalSteps, total: totalSteps });
  return assembleMultiPassGraph(subjectName, allConcepts, allInternalEdges, crossEdges, chapters);
}

// ─────────────────────────────────────────────────────
// CHAMADA OPENAI (unificada)
// ─────────────────────────────────────────────────────

async function callOpenAI(messages: any[], maxTokens: number): Promise<any> {
  const data = await callOpenAIProxy({
    messages,
    model: MODELS.graphGeneration,
    temperature: API_CONFIG.temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });

  const content = data?.choices?.[0]?.message?.content || '';
  const finishReason = data?.choices?.[0]?.finish_reason;

  console.log('[StudyOS AI] Resposta:', content.length, 'chars, finish:', finishReason);

  if (!content) throw new Error('IA retornou resposta vazia.');
  if (finishReason === 'length') console.warn('[StudyOS AI] Output truncado por limite de tokens');

  return parseAIResponse(content);
}

// ─────────────────────────────────────────────────────
// PARSER JSON
// ─────────────────────────────────────────────────────

function parseAIResponse(rawText: string): any {
  try {
    return JSON.parse(rawText);
  } catch {
    console.warn('[StudyOS AI] Parse direto falhou, limpando...');
  }

  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[StudyOS AI] Sem JSON:', rawText.substring(0, 500));
    throw new Error('IA não retornou formato válido. Tente novamente.');
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
      throw new Error('Falha ao interpretar resposta. Tente novamente.');
    }
  }
}

// ─────────────────────────────────────────────────────
// NORMALIZAÇÃO (single-pass)
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
  return { subjectName: parsed.subject_name || '', concepts, edges };
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
