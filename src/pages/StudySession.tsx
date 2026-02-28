import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, SkipForward, Loader2, Trophy, Zap, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { generateExercisesForConcept } from '@/lib/generateExercises';
import type { GraphNode, Exercise } from '@/types/course';

// ═══════════════════════════════════════════════════════
// SESSÃO DE ESTUDO DIÁRIA
// ═══════════════════════════════════════════════════════

interface StudyItem {
  node: GraphNode;
  subjectId: string;
  subjectName: string;
  source: 'review' | 'weak' | 'new';
}

const MAX_SESSION = 15;
const POMODORO_SECONDS = 25 * 60;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function StudySession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courses, getPrerequisites, updateNodeMastery, addExercisesToNode } = useApp();

  const [queue, setQueue] = useState<StudyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'study' | 'exercise' | 'result' | 'done'>('study');

  // Exercise state
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [exerciseResult, setExerciseResult] = useState<'correct' | 'wrong' | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  // Session stats
  const [sessionStart] = useState(() => new Date().toISOString());
  const [totalExercises, setTotalExercises] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [masteryGained, setMasteryGained] = useState(0);

  // Pomodoro
  const [timer, setTimer] = useState(POMODORO_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timer > 0) {
      intervalRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            setTimerRunning(false);
            toast.info('⏰ Pomodoro finalizado! Faça uma pausa.');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning, timer]);

  // Build study queue on mount
  useEffect(() => {
    buildQueue();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildQueue = async () => {
    setLoading(true);
    const items: StudyItem[] = [];

    // 1. Fetch review_queue from Supabase
    if (user) {
      try {
        const today = new Date().toISOString();
        const { data: reviewItems } = await supabase
          .from('review_queue')
          .select('node_id, subject_id')
          .eq('user_id', user.id)
          .lte('next_review', today)
          .order('next_review', { ascending: true })
          .limit(10);

        if (reviewItems) {
          for (const ri of reviewItems) {
            const found = findNode(ri.node_id, ri.subject_id);
            if (found) {
              items.push({ ...found, source: 'review' });
            }
          }
        }
      } catch (err) {
        console.warn('[StudySession] Failed to fetch review queue:', err);
      }
    }

    const addedIds = new Set(items.map(i => i.node.id));

    // 2. Add weak nodes (mastery < 0.3)
    for (const course of courses) {
      for (const subject of course.subjects) {
        if (subject.status !== 'ready') continue;
        for (const node of subject.nodes) {
          if (addedIds.has(node.id)) continue;
          if (node.mastery > 0 && node.mastery < 0.3) {
            items.push({ node, subjectId: subject.id, subjectName: subject.name, source: 'weak' });
            addedIds.add(node.id);
          }
          if (items.length >= MAX_SESSION) break;
        }
        if (items.length >= MAX_SESSION) break;
      }
      if (items.length >= MAX_SESSION) break;
    }

    // 3. Add up to 3 new unlocked nodes (mastery=0, prereqs met)
    let newCount = 0;
    for (const course of courses) {
      for (const subject of course.subjects) {
        if (subject.status !== 'ready') continue;
        for (const node of subject.nodes) {
          if (addedIds.has(node.id) || node.mastery > 0) continue;
          if (newCount >= 3 || items.length >= MAX_SESSION) break;

          // Check prerequisites
          const prereqEdges = subject.edges.filter(e => e.to === node.id);
          const allMet = prereqEdges.length === 0 || prereqEdges.every(e => {
            const prereq = subject.nodes.find(n => n.id === e.from);
            return prereq && prereq.mastery >= 0.5;
          });

          if (allMet) {
            items.push({ node, subjectId: subject.id, subjectName: subject.name, source: 'new' });
            addedIds.add(node.id);
            newCount++;
          }
        }
      }
    }

    setQueue(items);
    setLoading(false);
    if (items.length > 0) setTimerRunning(true);
  };

  const findNode = (nodeId: string, subjectId: string): Omit<StudyItem, 'source'> | null => {
    for (const course of courses) {
      const subject = course.subjects.find(s => s.id === subjectId);
      if (!subject) continue;
      const node = subject.nodes.find(n => n.id === nodeId);
      if (node) return { node, subjectId: subject.id, subjectName: subject.name };
    }
    return null;
  };

  const current = queue[currentIndex];

  // Generate a quick exercise
  const handleGenerateExercise = async () => {
    if (!current) return;
    setIsGenerating(true);
    try {
      const prereqs = getPrerequisites(current.subjectId, current.node.id);
      const prereqNames = prereqs.map(p => p.title);
      const exercises = await generateExercisesForConcept(current.node, prereqNames);
      if (exercises.length > 0) {
        addExercisesToNode(current.subjectId, current.node.id, exercises);
        setExercise(exercises[0]);
        setPhase('exercise');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar exercício');
    } finally {
      setIsGenerating(false);
    }
  };

  // Check answer
  const checkAnswer = () => {
    if (!exercise) return;
    let isCorrect = false;

    switch (exercise.type) {
      case 'numeric': {
        const numA = parseFloat(answer.replace(',', '.'));
        const numC = parseFloat(exercise.answer);
        const tol = exercise.tolerance || 0.05;
        isCorrect = !isNaN(numA) && Math.abs(numA - numC) <= tol;
        break;
      }
      case 'multiple_choice':
        isCorrect = selectedOption?.toUpperCase() === exercise.answer.toUpperCase();
        break;
      case 'true_false':
        isCorrect = answer.toLowerCase() === exercise.answer.toLowerCase();
        break;
    }

    const prevMastery = current.node.mastery;
    updateNodeMastery(current.subjectId, current.node.id, isCorrect);
    setExerciseResult(isCorrect ? 'correct' : 'wrong');
    setTotalExercises(t => t + 1);
    if (isCorrect) setCorrectCount(c => c + 1);

    // Estimate mastery delta
    if (isCorrect) {
      const gain = (1 - prevMastery) * 0.12;
      setMasteryGained(m => m + gain);
    }
  };

  // Next concept
  const goNext = () => {
    setPhase('study');
    setExercise(null);
    setExerciseResult(null);
    setAnswer('');
    setSelectedOption(null);
    setShowSolution(false);

    if (currentIndex < queue.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      finishSession();
    }
  };

  // Skip with small penalty
  const handleSkip = () => {
    updateNodeMastery(current.subjectId, current.node.id, false);
    goNext();
  };

  // Finish session
  const finishSession = async () => {
    setTimerRunning(false);
    setPhase('done');

    if (user) {
      try {
        await supabase.from('study_sessions').insert({
          user_id: user.id,
          subject_id: queue[0]?.subjectId || crypto.randomUUID(),
          started_at: sessionStart,
          ended_at: new Date().toISOString(),
          exercises_done: totalExercises,
          correct: correctCount,
          mastery_delta: Math.round(masteryGained * 100) / 100,
        });
      } catch (err) {
        console.warn('[StudySession] Failed to save session:', err);
      }
    }
  };

  const canSubmit = exercise?.type === 'multiple_choice' ? !!selectedOption : answer.trim().length > 0;
  const progressPct = queue.length > 0 ? ((currentIndex + (phase === 'done' ? 1 : 0)) / queue.length) * 100 : 0;

  // ─── LOADING ─────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-muted-foreground mb-4" />
        <p className="font-body text-sm text-muted-foreground">Montando sua sessão de hoje...</p>
      </div>
    );
  }

  // ─── EMPTY QUEUE ─────────────────────────────────
  if (queue.length === 0 && phase !== 'done') {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-16">
        <p className="text-4xl mb-3">✅</p>
        <h2 className="font-display font-bold text-2xl text-foreground">Você está em dia!</h2>
        <p className="font-body text-sm text-muted-foreground mt-2">
          Nenhum conceito para revisar hoje. Volte amanhã ou adicione novas matérias.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="mt-6 bg-accent text-accent-foreground font-display font-bold text-[13px] px-6 py-3 rounded-md hover:brightness-95 transition-all"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  // ─── DONE ────────────────────────────────────────
  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 max-w-lg mx-auto mt-8"
      >
        <div className="text-center mb-6">
          <Trophy size={48} className="mx-auto text-accent mb-3" />
          <h2 className="font-display font-bold text-3xl text-foreground">Sessão concluída!</h2>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex justify-between">
            <span className="font-body text-sm text-muted-foreground">Conceitos revisados</span>
            <span className="font-display font-bold text-foreground">{queue.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-sm text-muted-foreground">Exercícios feitos</span>
            <span className="font-display font-bold text-foreground">{totalExercises}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-sm text-muted-foreground">Acertos</span>
            <span className="font-display font-bold text-accent">
              {correctCount}/{totalExercises} ({totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-sm text-muted-foreground">Mastery ganho</span>
            <span className="font-display font-bold text-accent">+{Math.round(masteryGained * 100)}%</span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/progress')}
            className="flex-1 bg-accent text-accent-foreground font-display font-bold text-[13px] py-3 rounded-md hover:brightness-95 transition-all"
          >
            Ver progresso →
          </button>
          <button
            onClick={() => navigate('/home')}
            className="flex-1 border border-border text-foreground font-display font-bold text-[13px] py-3 rounded-md hover:bg-secondary transition-all"
          >
            Início
          </button>
        </div>
      </motion.div>
    );
  }

  // ─── ACTIVE SESSION ──────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
          <Zap size={20} className="text-accent" />
          Sessão de hoje · {queue.length} conceitos
        </h1>
        <button
          onClick={() => setTimerRunning(r => !r)}
          className={`font-mono text-lg px-3 py-1 rounded-md border transition-all ${
            timer <= 300 && timer > 0 ? 'border-destructive text-destructive' : 'border-border text-foreground'
          }`}
        >
          <Clock size={14} className="inline mr-1.5" />
          {formatTime(timer)}
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="font-body text-[11px] text-muted-foreground shrink-0">
          {currentIndex + 1} de {queue.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* STUDY PHASE */}
        {phase === 'study' && current && (
          <motion.div
            key={`study-${currentIndex}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Source badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-body text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                current.source === 'review' ? 'bg-amber-100 text-amber-700' :
                current.source === 'weak' ? 'bg-red-50 text-red-600' :
                'bg-accent/20 text-accent-foreground'
              }`}>
                {current.source === 'review' ? '🔄 Revisão' : current.source === 'weak' ? '⚠ Ponto fraco' : '✨ Novo'}
              </span>
              <span className="font-body text-[11px] text-muted-foreground">{current.subjectName}</span>
            </div>

            {/* Concept card */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-display font-bold text-2xl text-foreground mb-1">{current.node.title}</h2>
              <span className="font-body text-[11px] text-muted-foreground">
                Nível {current.node.level} · Domínio {Math.round(current.node.mastery * 100)}%
              </span>

              {current.node.intuition && (
                <div className="mt-4 border-l-2 border-accent pl-4">
                  <p className="font-body text-sm text-foreground leading-relaxed">{current.node.intuition}</p>
                </div>
              )}

              {current.node.description && (
                <p className="font-body text-sm text-muted-foreground leading-relaxed mt-3 line-clamp-4">
                  {current.node.description}
                </p>
              )}

              {current.node.keyPoints && current.node.keyPoints.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {current.node.keyPoints.slice(0, 3).map((kp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent text-xs mt-0.5 shrink-0">▸</span>
                      <span className="font-body text-[13px] text-foreground">{kp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleGenerateExercise}
                disabled={isGenerating}
                className="flex-1 bg-foreground text-accent font-display font-bold text-[13px] tracking-wide py-3 rounded-md hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Gerando...
                  </>
                ) : (
                  'Estudei — Gerar exercício →'
                )}
              </button>
              <button
                onClick={handleSkip}
                className="px-4 border border-border text-muted-foreground font-body text-sm rounded-md hover:bg-secondary transition-all flex items-center gap-1"
                title="Pular (pequena penalidade)"
              >
                <SkipForward size={14} /> Pular
              </button>
            </div>
          </motion.div>
        )}

        {/* EXERCISE PHASE */}
        {phase === 'exercise' && exercise && (
          <motion.div
            key={`exercise-${currentIndex}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-card border-[1.5px] border-foreground rounded-lg p-5">
              <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">
                ⚡ Exercício rápido
              </span>

              <p className="font-body text-sm text-foreground leading-relaxed mt-3 whitespace-pre-line">
                {exercise.question}
              </p>

              {exerciseResult === null && (
                <div className="mt-4">
                  {exercise.type === 'numeric' && (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Sua resposta numérica"
                      className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  )}

                  {exercise.type === 'multiple_choice' && exercise.options && (
                    <div className="space-y-2">
                      {exercise.options.map((opt, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isSelected = selectedOption === letter;
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedOption(letter)}
                            className={`w-full text-left px-4 py-2.5 rounded-md border font-body text-sm transition-all ${
                              isSelected
                                ? 'border-foreground bg-foreground/5 text-foreground font-semibold'
                                : 'border-border text-foreground hover:border-foreground/40'
                            }`}
                          >
                            <span className="font-mono text-xs mr-2">{letter})</span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {exercise.type === 'true_false' && (
                    <div className="flex gap-3">
                      {['Verdadeiro', 'Falso'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setAnswer(opt.toLowerCase())}
                          className={`flex-1 px-4 py-2.5 rounded-md border font-body text-sm transition-all ${
                            answer.toLowerCase() === opt.toLowerCase()
                              ? 'border-foreground bg-foreground/5 font-semibold'
                              : 'border-border hover:border-foreground/40'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={checkAnswer}
                    disabled={!canSubmit}
                    className="w-full mt-4 bg-accent text-accent-foreground font-display font-bold text-[13px] py-3 rounded-md hover:brightness-95 transition-all disabled:opacity-40"
                  >
                    Verificar
                  </button>
                </div>
              )}

              {/* Result */}
              {exerciseResult && (
                <div className="mt-4">
                  <div className={`px-4 py-3 rounded-md border ${
                    exerciseResult === 'correct'
                      ? 'bg-accent/10 border-accent/30'
                      : 'bg-destructive/10 border-destructive/30'
                  }`}>
                    <p className="font-display font-bold text-sm">
                      {exerciseResult === 'correct' ? '✓ Correto!' : '✗ Incorreto'}
                    </p>
                    {exerciseResult === 'wrong' && (
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        Resposta correta: {exercise.answer}
                      </p>
                    )}
                  </div>

                  {!showSolution && (
                    <button
                      onClick={() => setShowSolution(true)}
                      className="font-body text-xs text-muted-foreground hover:text-foreground mt-2 underline"
                    >
                      Ver resolução
                    </button>
                  )}

                  {showSolution && exercise.solution && (
                    <div className="mt-3 bg-secondary/50 rounded-md p-3">
                      <p className="font-body text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Resolução</p>
                      <p className="font-body text-sm text-foreground whitespace-pre-line">{exercise.solution}</p>
                    </div>
                  )}

                  <button
                    onClick={goNext}
                    className="w-full mt-4 bg-foreground text-accent font-display font-bold text-[13px] py-3 rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    Próximo conceito <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
