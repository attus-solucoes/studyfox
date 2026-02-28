import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Course, Subject, GraphNode, Exercise } from '@/types/course';

// ═══════════════════════════════════════════════════════
// STUDYOS — CONTEXTO GLOBAL DA APLICAÇÃO
// ═══════════════════════════════════════════════════════

interface AppContextType {
  courses: Course[];
  addCourse: (course: Course) => void;
  addSubject: (courseId: string, subject: Subject) => void;
  updateSubject: (courseId: string, subjectId: string, updates: Partial<Subject>) => void;
  deleteSubject: (courseId: string, subjectId: string) => void;
  getSubject: (subjectId: string) => { course: Course; subject: Subject } | null;

  // ─── Novos métodos para nós/conceitos ─────────────
  getNode: (nodeId: string) => { course: Course; subject: Subject; node: GraphNode } | null;
  updateNode: (subjectId: string, nodeId: string, updates: Partial<GraphNode>) => void;
  updateNodeMastery: (subjectId: string, nodeId: string, correct: boolean) => void;
  addExercisesToNode: (subjectId: string, nodeId: string, exercises: Exercise[]) => void;
  getPrerequisites: (subjectId: string, nodeId: string) => GraphNode[];
  getDependents: (subjectId: string, nodeId: string) => GraphNode[];
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'studyos_courses';

// ─── Normalizar nós (backward compatibility) ────────
function normalizeNode(node: any): GraphNode {
  return {
    ...node,
    variables: node.variables || [],
    keyPoints: node.keyPoints || [],
    commonMistakes: node.commonMistakes || [],
    exercises: node.exercises || [],
    lastReviewedAt: node.lastReviewedAt || undefined,
  };
}

function normalizeSubject(subject: any): Subject {
  return {
    ...subject,
    nodes: (subject.nodes || []).map(normalizeNode),
    edges: subject.edges || [],
    rawText: subject.rawText || undefined,
  };
}

function normalizeCourse(course: any): Course {
  return {
    ...course,
    subjects: (course.subjects || []).map(normalizeSubject),
  };
}

function loadCourses(): Course[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return raw.map(normalizeCourse);
  } catch {
    return [];
  }
}

// ─── Constantes de Mastery ──────────────────────────
const MASTERY_GAIN = 0.12;     // Ganho por acerto (diminishing returns)
const MASTERY_PENALTY = 0.04;  // Penalidade por erro
const MASTERY_MIN = 0;
const MASTERY_MAX = 1;

// ═══════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════

export function AppProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(loadCourses);

  // Persistir no localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

  // ─── Cursos ─────────────────────────────────────────

  const addCourse = useCallback((course: Course) => {
    setCourses(prev => [...prev, course]);
  }, []);

  // ─── Matérias ───────────────────────────────────────

  const addSubject = useCallback((courseId: string, subject: Subject) => {
    setCourses(prev =>
      prev.map(c => c.id === courseId
        ? { ...c, subjects: [...c.subjects, normalizeSubject(subject)] }
        : c
      )
    );
  }, []);

  const updateSubject = useCallback((courseId: string, subjectId: string, updates: Partial<Subject>) => {
    setCourses(prev =>
      prev.map(c =>
        c.id === courseId
          ? {
              ...c,
              subjects: c.subjects.map(s =>
                s.id === subjectId
                  ? normalizeSubject({ ...s, ...updates })
                  : s
              ),
            }
          : c
      )
    );
  }, []);

  const deleteSubject = useCallback((courseId: string, subjectId: string) => {
    setCourses(prev =>
      prev.map(c =>
        c.id === courseId
          ? { ...c, subjects: c.subjects.filter(s => s.id !== subjectId) }
          : c
      )
    );
  }, []);

  const getSubject = useCallback((subjectId: string): { course: Course; subject: Subject } | null => {
    for (const course of courses) {
      const subject = course.subjects.find(s => s.id === subjectId);
      if (subject) return { course, subject };
    }
    return null;
  }, [courses]);

  // ─── Nós / Conceitos ───────────────────────────────

  const getNode = useCallback((nodeId: string): { course: Course; subject: Subject; node: GraphNode } | null => {
    for (const course of courses) {
      for (const subject of course.subjects) {
        const node = subject.nodes.find(n => n.id === nodeId);
        if (node) return { course, subject, node: normalizeNode(node) };
      }
    }
    return null;
  }, [courses]);

  const updateNode = useCallback((subjectId: string, nodeId: string, updates: Partial<GraphNode>) => {
    setCourses(prev =>
      prev.map(c => ({
        ...c,
        subjects: c.subjects.map(s =>
          s.id === subjectId
            ? {
                ...s,
                nodes: s.nodes.map(n =>
                  n.id === nodeId ? normalizeNode({ ...n, ...updates }) : n
                ),
              }
            : s
        ),
      }))
    );
  }, []);

  const updateNodeMastery = useCallback((subjectId: string, nodeId: string, correct: boolean) => {
    setCourses(prev =>
      prev.map(c => ({
        ...c,
        subjects: c.subjects.map(s => {
          if (s.id !== subjectId) return s;

          const updatedNodes = s.nodes.map(n => {
            if (n.id !== nodeId) return n;

            let newMastery: number;
            if (correct) {
              // Diminishing returns: quanto mais perto de 1, menor o ganho
              newMastery = n.mastery + (MASTERY_MAX - n.mastery) * MASTERY_GAIN;
            } else {
              // Penalidade proporcional ao mastery atual
              newMastery = n.mastery - n.mastery * MASTERY_PENALTY;
            }

            newMastery = Math.min(MASTERY_MAX, Math.max(MASTERY_MIN, newMastery));

            return {
              ...n,
              mastery: Math.round(newMastery * 100) / 100, // 2 casas decimais
              lastReviewedAt: new Date().toISOString(),
            };
          });

          // Recalcular progresso da matéria
          const totalMastery = updatedNodes.reduce((sum, n) => sum + n.mastery, 0);
          const progress = updatedNodes.length > 0
            ? Math.round((totalMastery / updatedNodes.length) * 100)
            : 0;

          return { ...s, nodes: updatedNodes, progress };
        }),
      }))
    );
  }, []);

  const addExercisesToNode = useCallback((subjectId: string, nodeId: string, exercises: Exercise[]) => {
    setCourses(prev =>
      prev.map(c => ({
        ...c,
        subjects: c.subjects.map(s =>
          s.id === subjectId
            ? {
                ...s,
                nodes: s.nodes.map(n =>
                  n.id === nodeId
                    ? { ...n, exercises: [...(n.exercises || []), ...exercises] }
                    : n
                ),
              }
            : s
        ),
      }))
    );
  }, []);

  // ─── Pré-requisitos e Dependentes ─────────────────

  const getPrerequisites = useCallback((subjectId: string, nodeId: string): GraphNode[] => {
    for (const course of courses) {
      const subject = course.subjects.find(s => s.id === subjectId);
      if (!subject) continue;

      // Edges onde TO === nodeId (quem aponta para mim são meus pré-requisitos)
      const prereqIds = subject.edges
        .filter(e => e.to === nodeId)
        .map(e => e.from);

      return subject.nodes
        .filter(n => prereqIds.includes(n.id))
        .map(normalizeNode);
    }
    return [];
  }, [courses]);

  const getDependents = useCallback((subjectId: string, nodeId: string): GraphNode[] => {
    for (const course of courses) {
      const subject = course.subjects.find(s => s.id === subjectId);
      if (!subject) continue;

      // Edges onde FROM === nodeId (quem eu aponto são meus dependentes)
      const depIds = subject.edges
        .filter(e => e.from === nodeId)
        .map(e => e.to);

      return subject.nodes
        .filter(n => depIds.includes(n.id))
        .map(normalizeNode);
    }
    return [];
  }, [courses]);

  // ─── Provider ─────────────────────────────────────

  return (
    <AppContext.Provider
      value={{
        courses,
        addCourse,
        addSubject,
        updateSubject,
        deleteSubject,
        getSubject,
        getNode,
        updateNode,
        updateNodeMastery,
        addExercisesToNode,
        getPrerequisites,
        getDependents,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
