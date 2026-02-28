import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { RefreshCw, Loader2, ChevronRight, BookOpen, Lightbulb, AlertTriangle, Target, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { generateExercisesForConcept } from '@/lib/generateExercises';
import type { Exercise } from '@/types/course';

// ═══════════════════════════════════════════════════════
// STUDYOS — PÁGINA DE ESTUDO DE CONCEITO
// Dinâmica: conectada a dados reais + exercícios AI
// ═══════════════════════════════════════════════════════

export default function Concept() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getNode,
    getPrerequisites,
    getDependents,
    updateNodeMastery,
    addExercisesToNode,
  } = useApp();

  // ─── Dados do conceito ────────────────────────────
  const result = id ? getNode(id) : null;

  // ─── Estado de exercícios ─────────────────────────
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [exerciseResult, setExerciseResult] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prevMastery, setPrevMastery] = useState<number | null>(null);

  // ─── Conceito não encontrado ──────────────────────
  if (!result) {
    return (
      <div className="p-8 text-center">
        <p className="text-3xl mb-3">🦊</p>
        <p className="font-body font-semibold text-base text-ink">Conceito não encontrado.</p>
        <Link to="/home" className="font-body text-sm text-muted hover:text-ink mt-2 inline-block">← Voltar</Link>
      </div>
    );
  }

  const { course, subject, node } = result;
  const prerequisites = getPrerequisites(subject.id, node.id);
  const dependents = getDependents(subject.id, node.id);
  const exercises = node.exercises || [];
  const currentExercise: Exercise | undefined = exercises[currentExerciseIndex];

  // ─── Gerar exercícios ─────────────────────────────
  const handleGenerateExercises = async () => {
    setIsGenerating(true);
    try {
      const prereqNames = prerequisites.map(p => p.title);
      const newExercises = await generateExercisesForConcept(node, prereqNames);
      addExercisesToNode(subject.id, node.id, newExercises);
      setCurrentExerciseIndex(exercises.length); // Ir para o primeiro novo
      toast.success(`✓ ${newExercises.length} exercícios gerados!`);
    } catch (err: any) {
      console.error('[StudyOS] Exercise generation error:', err);
      toast.error(err?.message || 'Erro ao gerar exercícios.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Verificar resposta ───────────────────────────
  const checkAnswer = () => {
    if (!currentExercise) return;

    let isCorrect = false;

    switch (currentExercise.type) {
      case 'numeric': {
        const numAnswer = parseFloat(answer.replace(',', '.'));
        const numCorrect = parseFloat(currentExercise.answer);
        const tolerance = currentExercise.tolerance || 0.05;
        isCorrect = !isNaN(numAnswer) && Math.abs(numAnswer - numCorrect) <= tolerance;
        break;
      }
      case 'multiple_choice': {
        isCorrect = selectedOption?.toUpperCase() === currentExercise.answer.toUpperCase();
        break;
      }
      case 'true_false': {
        isCorrect = answer.toLowerCase() === currentExercise.answer.toLowerCase();
        break;
      }
    }

    setPrevMastery(node.mastery);
    updateNodeMastery(subject.id, node.id, isCorrect);
    setExerciseResult(isCorrect ? 'correct' : 'wrong');
  };

  // ─── Próximo exercício ────────────────────────────
  const nextExercise = () => {
    setExerciseResult(null);
    setAnswer('');
    setSelectedOption(null);
    setShowHint(false);
    setShowSolution(false);
    setAttempts(1);
    setPrevMastery(null);

    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Gerar mais exercícios automaticamente
      handleGenerateExercises();
    }
  };

  // ─── Retry ────────────────────────────────────────
  const retry = () => {
    setExerciseResult(null);
    setAnswer('');
    setSelectedOption(null);
    setShowSolution(false);
    setAttempts(a => a + 1);
  };

  // ─── Mastery display ──────────────────────────────
  const masteryPercent = Math.round(node.mastery * 100);
  const newMasteryPercent = prevMastery !== null ? Math.round(node.mastery * 100) : null;
  const oldMasteryPercent = prevMastery !== null ? Math.round(prevMastery * 100) : null;

  // ─── Can submit ───────────────────────────────────
  const canSubmit = currentExercise?.type === 'multiple_choice'
    ? !!selectedOption
    : answer.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6 lg:p-8 max-w-6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ═══════════════════════════════════════════ */}
        {/* LEFT COLUMN — Conteúdo do Conceito         */}
        {/* ═══════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-3">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/subject/${subject.id}`)}
              className="font-body text-xs text-muted hover:text-ink transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              {subject.name}
            </button>
            <span className="text-muted">/</span>
            <span className="font-body text-xs text-ink">{node.title}</span>
            <div className="w-20 h-0.5 bg-line">
              <div className="h-full bg-lime transition-all duration-500" style={{ width: `${masteryPercent}%` }} />
            </div>
            <span className="font-body text-[11px] text-muted">{masteryPercent}%</span>
          </div>

          <h1 className="font-display font-bold text-[28px] text-ink mt-2">{node.title}</h1>
          <span className="inline-block font-body text-[10px] text-muted bg-paper border border-line px-2 py-0.5 rounded">
            Nível {node.level}/5
          </span>

          {/* Intuição */}
          {node.intuition && (
            <div className="border-l-2 border-lime bg-white p-5 rounded-r-lg">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide flex items-center gap-1">
                <Lightbulb size={10} /> Intuição
              </span>
              <p className="font-body text-[15px] text-ink leading-relaxed mt-2">{node.intuition}</p>
            </div>
          )}

          {/* Conceito / Descrição */}
          <div className="border-l-2 border-ink bg-white p-5 rounded-r-lg">
            <span className="font-body text-[10px] text-muted uppercase tracking-wide flex items-center gap-1">
              <BookOpen size={10} /> Conceito
            </span>
            <p className="font-body text-sm text-graphite leading-relaxed mt-2 whitespace-pre-line">{node.description}</p>
          </div>

          {/* Fórmula */}
          {node.formula && (
            <div className="bg-ink rounded-lg p-5">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">∑ Fórmula</span>
              <p className="font-mono text-[15px] text-lime mt-2">{node.formula}</p>
              {node.variables && node.variables.length > 0 && node.variables.map((v, i) => (
                <p key={i} className="font-mono text-[11px] text-muted mt-1">
                  {v.symbol} = {v.meaning}{v.unit ? ` (${v.unit})` : ''}
                </p>
              ))}
            </div>
          )}

          {/* Key Points */}
          {node.keyPoints && node.keyPoints.length > 0 && (
            <div className="bg-white border border-line rounded-lg p-4">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide flex items-center gap-1">
                <Target size={10} /> Pontos-chave (o que cai na prova)
              </span>
              <ul className="mt-2 space-y-1.5">
                {node.keyPoints.map((kp, i) => (
                  <li key={i} className="font-body text-[13px] text-ink flex items-start gap-2">
                    <span className="text-lime mt-0.5">▸</span>
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Erros Comuns */}
          {node.commonMistakes && node.commonMistakes.length > 0 && (
            <div className="bg-ember/5 border border-ember/20 rounded-lg p-4">
              <span className="font-body text-[10px] text-ember uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle size={10} /> Erros comuns
              </span>
              <ul className="mt-2 space-y-1.5">
                {node.commonMistakes.map((cm, i) => (
                  <li key={i} className="font-body text-[13px] text-graphite flex items-start gap-2">
                    <span className="text-ember mt-0.5">✗</span>
                    <span>{cm}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pré-requisitos */}
          {prerequisites.length > 0 && (
            <div className="bg-white border border-line rounded-lg p-4">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">Você precisava saber</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {prerequisites.map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/concept/${p.id}`)}
                    className="font-body text-xs border border-ink px-3 py-1 rounded cursor-pointer hover:bg-ink hover:text-lime transition-all duration-150 flex items-center gap-1"
                  >
                    {p.title}
                    <span className="text-[10px] text-muted ml-1">{Math.round(p.mastery * 100)}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dependentes (o que vem depois) */}
          {dependents.length > 0 && (
            <div className="bg-white border border-line rounded-lg p-4">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">Próximos conceitos</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {dependents.map(d => (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/concept/${d.id}`)}
                    className="font-body text-xs border border-line px-3 py-1 rounded cursor-pointer hover:border-ink transition-all duration-150 text-muted hover:text-ink flex items-center gap-1"
                  >
                    {d.title} <ChevronRight size={10} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* RIGHT COLUMN — Exercícios AI               */}
        {/* ═══════════════════════════════════════════ */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-4">
            <AnimatePresence mode="wait">
              {/* SEM EXERCÍCIOS — Gerar */}
              {exercises.length === 0 && !isGenerating && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border-[1.5px] border-dashed border-line rounded-lg p-6 text-center"
                >
                  <p className="text-2xl mb-2">🎯</p>
                  <p className="font-body font-semibold text-sm text-ink mb-1">Pronto para praticar?</p>
                  <p className="font-body text-xs text-muted mb-4">
                    A IA vai gerar exercícios personalizados para este conceito, com resolução completa.
                  </p>
                  <button
                    onClick={handleGenerateExercises}
                    className="bg-ink text-lime font-display font-bold text-[13px] tracking-wide px-6 py-3 rounded-md hover:bg-graphite transition-all duration-150"
                  >
                    Gerar exercícios com IA →
                  </button>
                </motion.div>
              )}

              {/* GERANDO */}
              {isGenerating && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border-[1.5px] border-ink rounded-lg p-6 text-center"
                >
                  <Loader2 size={24} className="mx-auto text-ink animate-spin mb-3" />
                  <p className="font-body font-semibold text-sm text-ink">IA gerando exercícios...</p>
                  <p className="font-body text-xs text-muted mt-1">Com resolução passo a passo</p>
                </motion.div>
              )}

              {/* EXERCÍCIO ATIVO */}
              {!isGenerating && currentExercise && exerciseResult === null && (
                <motion.div
                  key={`exercise-${currentExerciseIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border-[1.5px] border-ink rounded-lg p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-[10px] text-muted uppercase tracking-wide">
                      ⚡ Exercício {currentExerciseIndex + 1}/{exercises.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] text-muted">
                        Dif. {'●'.repeat(currentExercise.difficulty)}{'○'.repeat(5 - currentExercise.difficulty)}
                      </span>
                      <button
                        onClick={handleGenerateExercises}
                        className="text-muted hover:text-ink transition-colors"
                        title="Gerar novos exercícios"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="font-body text-sm text-ink leading-relaxed mt-3 whitespace-pre-line">
                    {currentExercise.question}
                  </p>

                  {/* Input baseado no tipo */}
                  <div className="mt-4">
                    {currentExercise.type === 'numeric' && (
                      <>
                        <label className="font-body text-[10px] text-muted uppercase tracking-widest mb-1 block">Resposta</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={answer}
                          onChange={e => setAnswer(e.target.value)}
                          className="w-full bg-white border-[1.5px] border-line rounded-md p-3 font-body text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-colors mt-1"
                          placeholder="Ex: 3.14"
                          onKeyDown={e => e.key === 'Enter' && canSubmit && checkAnswer()}
                        />
                      </>
                    )}

                    {currentExercise.type === 'multiple_choice' && currentExercise.options && (
                      <div className="space-y-2">
                        {currentExercise.options.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i); // A, B, C, D
                          const isSelected = selectedOption === letter;
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedOption(letter)}
                              className={`w-full text-left p-3 rounded-md border-[1.5px] font-body text-sm transition-all duration-150 ${
                                isSelected
                                  ? 'border-ink bg-ink/5 text-ink'
                                  : 'border-line text-graphite hover:border-ink/30'
                              }`}
                            >
                              <span className="font-semibold mr-2">{letter}.</span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {currentExercise.type === 'true_false' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setAnswer('true')}
                          className={`flex-1 p-3 rounded-md border-[1.5px] font-body text-sm font-semibold transition-all duration-150 ${
                            answer === 'true'
                              ? 'border-ink bg-ink/5 text-ink'
                              : 'border-line text-graphite hover:border-ink/30'
                          }`}
                        >
                          Verdadeiro
                        </button>
                        <button
                          onClick={() => setAnswer('false')}
                          className={`flex-1 p-3 rounded-md border-[1.5px] font-body text-sm font-semibold transition-all duration-150 ${
                            answer === 'false'
                              ? 'border-ink bg-ink/5 text-ink'
                              : 'border-line text-graphite hover:border-ink/30'
                          }`}
                        >
                          Falso
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dica */}
                  <div className="mt-3">
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="font-body text-xs text-muted hover:text-ink transition-colors"
                    >
                      💡 dica {showHint ? '↑' : '↓'}
                    </button>
                    <AnimatePresence>
                      {showHint && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-paper border border-line p-3 rounded mt-1">
                            <p className="font-body text-[13px] text-graphite">{currentExercise.hint}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Botão verificar */}
                  <button
                    onClick={checkAnswer}
                    disabled={!canSubmit}
                    className="w-full bg-ink text-lime font-display font-bold text-[13px] tracking-wide py-3 rounded-md mt-3 hover:bg-graphite transition-all duration-150 disabled:opacity-40"
                  >
                    VERIFICAR →
                  </button>
                  <p className="font-body text-[11px] text-muted mt-2 text-center">tentativa {attempts}</p>
                </motion.div>
              )}

              {/* CORRETO */}
              {exerciseResult === 'correct' && currentExercise && (
                <motion.div
                  key="correct"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-lime rounded-lg p-5"
                >
                  <p className="font-display font-extrabold text-2xl text-ink">✓ Correto!</p>

                  {/* Resolução */}
                  <div className="bg-ink/10 rounded p-3 mt-3">
                    <p className="font-body text-[10px] text-ink/60 uppercase tracking-wide mb-1">Resolução</p>
                    <p className="font-body text-[13px] text-ink leading-relaxed whitespace-pre-line">
                      {currentExercise.solution}
                    </p>
                  </div>

                  {/* Mastery update */}
                  {oldMasteryPercent !== null && newMasteryPercent !== null && (
                    <div className="mt-3">
                      <p className="font-body text-[11px] text-ink/60 mb-1">{oldMasteryPercent}% → {newMasteryPercent}%</p>
                      <div className="w-full h-1 bg-ink/20 rounded-full">
                        <motion.div
                          className="h-full bg-ink rounded-full"
                          initial={{ width: `${oldMasteryPercent}%` }}
                          animate={{ width: `${newMasteryPercent}%` }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={nextExercise}
                    className="w-full bg-ink text-lime font-body font-semibold text-[13px] py-2.5 rounded-md mt-3 hover:bg-graphite transition-all duration-150"
                  >
                    próximo exercício →
                  </button>
                </motion.div>
              )}

              {/* ERRADO */}
              {exerciseResult === 'wrong' && currentExercise && (
                <motion.div
                  key="wrong"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-ember rounded-lg p-5"
                >
                  <p className="font-display font-bold text-xl text-white mb-2">✗ Não desta vez.</p>

                  {/* Mostrar/esconder resolução */}
                  <button
                    onClick={() => setShowSolution(!showSolution)}
                    className="font-body text-[13px] text-white/80 underline mb-2"
                  >
                    {showSolution ? 'Esconder' : 'Ver'} resolução completa
                  </button>

                  <AnimatePresence>
                    {showSolution && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white/10 rounded p-3 mt-1 mb-2">
                          <p className="font-body text-[13px] text-white/90 leading-relaxed whitespace-pre-line">
                            {currentExercise.solution}
                          </p>
                          <p className="font-body text-[12px] text-white/70 mt-2">
                            Resposta correta: <span className="font-semibold text-white">{currentExercise.answer}</span>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={retry}
                      className="flex-1 font-body text-[13px] text-white border border-white/30 py-2 rounded-md hover:bg-white/10 transition-colors"
                    >
                      Tentar de novo
                    </button>
                    <button
                      onClick={nextExercise}
                      className="flex-1 font-body text-[13px] text-white border border-white/30 py-2 rounded-md hover:bg-white/10 transition-colors"
                    >
                      Próximo →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lista de exercícios (mini nav) */}
            {exercises.length > 1 && exerciseResult === null && !isGenerating && (
              <div className="flex items-center gap-1 mt-3 justify-center">
                {exercises.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentExerciseIndex(i);
                      setAnswer('');
                      setSelectedOption(null);
                      setExerciseResult(null);
                      setShowHint(false);
                      setAttempts(1);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentExerciseIndex ? 'bg-ink' : 'bg-line hover:bg-muted'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
