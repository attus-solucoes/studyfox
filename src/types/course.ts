export interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit: string;
}

export interface Exercise {
  id: string;
  type: 'numeric' | 'multiple_choice';
  question: string;
  data?: string[];
  options?: string[];
  correctAnswer: string;
  hint?: string;
  resolution?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  level: number;
  x: number;
  y: number;
  mastery: number;
  description: string;
  intuition: string;
  formula: string | null;
  variables?: FormulaVariable[];
  keyPoints?: string[];
  commonMistakes?: string[];
  exercises?: Exercise[];
}

export interface GraphEdge {
  from: string;
  to: string;
  strength: number;
}

export interface Subject {
  id: string;
  courseId: string;
  name: string;
  semester: string;
  status: 'empty' | 'processing' | 'ready' | 'error';
  progress: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  institution: string;
  createdAt: string;
  subjects: Subject[];
}
