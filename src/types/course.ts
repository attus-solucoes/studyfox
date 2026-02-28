// ═══════════════════════════════════════════════════════
// STUDYOS — TIPOS DO SISTEMA DE CONHECIMENTO
// ═══════════════════════════════════════════════════════

// ─── Variável de Fórmula ────────────────────────────
export interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit?: string;
}

// ─── Exercício Gerado pela IA ───────────────────────
export interface Exercise {
  id: string;
  question: string;
  type: 'numeric' | 'multiple_choice' | 'true_false';
  answer: string;
  tolerance?: number;        // Para respostas numéricas
  options?: string[];        // Para múltipla escolha (4 alternativas)
  hint: string;
  solution: string;          // Resolução passo a passo
  difficulty: number;        // 1-5
}

// ─── Nó do Grafo (Conceito) ─────────────────────────
export interface GraphNode {
  id: string;
  title: string;
  level: number;             // 1-5 (1 = base, 5 = avançado)
  x: number;                 // Posição no canvas (100-900)
  y: number;                 // Posição no canvas (80-780)
  mastery: number;           // 0-1 (domínio do conceito)
  description: string;       // Explicação completa e autocontida
  intuition: string;         // Analogia intuitiva do cotidiano
  formula: string | null;    // Fórmula matemática se houver
  variables: FormulaVariable[];   // Variáveis da fórmula explicadas
  keyPoints: string[];            // Pontos-chave (o que cai na prova)
  commonMistakes: string[];       // Erros comuns de alunos
  exercises: Exercise[];          // Exercícios gerados pela IA
  lastReviewedAt?: string;        // Última revisão (ISO string)
}

// ─── Aresta do Grafo (Dependência) ──────────────────
export interface GraphEdge {
  from: string;              // ID do nó fonte
  to: string;                // ID do nó destino
  strength: number;          // 0-1 (força da dependência)
}

// ─── Matéria ────────────────────────────────────────
export interface Subject {
  id: string;
  courseId: string;
  name: string;
  semester: string;
  status: 'empty' | 'processing' | 'ready' | 'error';
  progress: number;          // 0-100
  nodes: GraphNode[];
  edges: GraphEdge[];
  rawText?: string;          // Material original enviado
  createdAt: string;
}

// ─── Curso ──────────────────────────────────────────
export interface Course {
  id: string;
  name: string;
  institution: string;
  createdAt: string;
  subjects: Subject[];
}
