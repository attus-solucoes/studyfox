import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { GraphNode, Exercise } from '@/types/course';

function ResolutionText({ text }: { text: string }) {
  return (
    <div className="font-body text-[13px] text-ink/80 mt-1">
      {text.split('\n').map((line, i) => (
        <span key={i}>
          {line}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

export default function Concept() {
  const { id } = useParams<{ id: string }>();
  const { courses } = useApp();

  const nodeData = useMemo(() => {
    for (const c of courses) {
      for (const s of c.subjects) {
        const node = s.nodes.find(n => n.id === id);
        if (node) return { course: c, subject: s, node };
      }
    }
    return null;
  }, [courses, id]);

  // Fallback static data for demo
  const concept: GraphNode = nodeData?.node || {
    id: id || 'demo',
    title: 'Conceito não encontrado',
    level: 0,
    x: 0, y: 0,
    mastery: 0,
    description: '',
    intuition: '',
    formula: null,
  };

  const exercises: Exercise[] = concept.exercises || [];
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(1);

  const currentExercise = exercises[exerciseIdx] || null;
  const totalExercises = exercises.length;

  const check = () => {
    if (!currentExercise) return;
    if (currentExercise.type === 'multiple_choice') {
      if (selectedOption === currentExercise.correctAnswer) {
        setResult('correct');
      } else {
        setResult('wrong');
      }
    } else {
      const val = parseFloat(answer);
      const correct = parseFloat(currentExercise.correctAnswer);
      if (!isNaN(val) && !isNaN(correct) && Math.abs(val - correct) <= Math.abs(correct) * 0.02 + 0.05) {
        setResult('correct');
      } else {
        setResult('wrong');
      }
    }
  };

  const retry = () => {
    setResult(null);
    setAnswer('');
    setSelectedOption(null);
    setAttempts(a => a + 1);
  };

  const nextExercise = () => {
    if (exerciseIdx < totalExercises - 1) {
      setExerciseIdx(i => i + 1);
      setResult(null);
      setAnswer('');
      setSelectedOption(null);
      setShowHint(false);
      setAttempts(1);
    }
  };

  const breadcrumb = nodeData
    ? `${nodeData.course.name} / ${nodeData.subject.name}`
    : 'Conceito';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6 lg:p-8 max-w-6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3">
            <span className="font-body text-xs text-muted">{breadcrumb}</span>
            <div className="w-20 h-0.5 bg-line rounded-full overflow-hidden">
              <div className="h-full bg-lime rounded-full" style={{ width: `${Math.round(concept.mastery * 100)}%` }} />
            </div>
            <span className="font-body text-[11px] text-muted">{Math.round(concept.mastery * 100)}%</span>
          </div>

          <h1 className="font-display font-bold text-[28px] text-ink mt-2">{concept.title}</h1>

          {/* Intuition */}
          {concept.intuition && (
            <div className="border-l-2 border-lime bg-white p-5 rounded-r-lg">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">💡 Intuição</span>
              <p className="font-body text-[15px] text-ink leading-relaxed mt-2">{concept.intuition}</p>
            </div>
          )}

          {/* Description */}
          {concept.description && (
            <div className="border-l-2 border-ink bg-white p-5 rounded-r-lg">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">▸ Conceito</span>
              <p className="font-body text-sm text-graphite leading-relaxed mt-2">{concept.description}</p>
            </div>
          )}

          {/* Formula */}
          {concept.formula && (
            <div className="bg-ink rounded-lg p-5">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">∑ Fórmula</span>
              <p className="font-mono text-[15px] text-lime mt-2">{concept.formula}</p>
              {concept.variables?.map((v, i) => (
                <div key={i} className="flex items-baseline gap-2 mt-1">
                  <span className="font-mono text-[12px] text-lime">{v.symbol}</span>
                  <span className="font-mono text-[11px] text-muted">= {v.meaning} [{v.unit}]</span>
                </div>
              ))}
            </div>
          )}

          {/* Key Points */}
          {concept.keyPoints && concept.keyPoints.length > 0 && (
            <div className="bg-white border border-line rounded-lg p-4">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">Pontos-chave</span>
              <ul className="mt-2 space-y-1.5">
                {concept.keyPoints.map((kp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-lime text-xs mt-0.5 shrink-0">▸</span>
                    <span className="font-body text-sm text-ink">{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Mistakes */}
          {concept.commonMistakes && concept.commonMistakes.length > 0 && (
            <div className="bg-white border border-line rounded-lg p-4">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">Erros comuns</span>
              <ul className="mt-2 space-y-1.5">
                {concept.commonMistakes.map((cm, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-ember text-xs mt-0.5 shrink-0">✗</span>
                    <span className="font-body text-sm text-ink">{cm}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prerequisites */}
          {nodeData && (
            <div className="bg-white border border-line rounded-lg p-4">
              <span className="font-body text-[10px] text-muted uppercase tracking-wide">Você precisava saber</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {nodeData.subject.edges
                  .filter(e => e.to === concept.id)
                  .map(e => nodeData.subject.nodes.find(n => n.id === e.from))
                  .filter(Boolean)
                  .map(n => (
                    <Link
                      key={n!.id}
                      to={`/concept/${n!.id}`}
                      className="font-body text-xs border border-ink px-3 py-1 rounded cursor-pointer hover:bg-ink hover:text-lime transition-all duration-[120ms]"
                    >
                      {n!.title}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Exercise */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-4">
            {currentExercise ? (
              <AnimatePresence mode="wait">
                {result === 'correct' ? (
                  <motion.div
                    key={`correct-${exerciseIdx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-lime rounded-lg p-5"
                  >
                    <p className="font-display font-extrabold text-2xl text-ink">✓ Correto.</p>
                    {currentExercise.resolution && (
                      <div className="mt-2 mb-3">
                        <ResolutionText text={currentExercise.resolution} />
                      </div>
                    )}
                    <div>
                      <p className="font-body text-[11px] text-ink/60 mb-1">
                        Exercício {exerciseIdx + 1}/{totalExercises}
                      </p>
                      <div className="w-full h-1 bg-ink/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-ink rounded-full"
                          initial={{ width: `${((exerciseIdx) / totalExercises) * 100}%` }}
                          animate={{ width: `${((exerciseIdx + 1) / totalExercises) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        />
                      </div>
                    </div>
                    {exerciseIdx < totalExercises - 1 ? (
                      <button
                        onClick={nextExercise}
                        className="w-full bg-ink text-lime font-body font-semibold text-[13px] py-2.5 rounded-md mt-3 hover:bg-graphite transition-all duration-[120ms]"
                      >
                        próximo exercício →
                      </button>
                    ) : (
                      <p className="font-body text-[13px] text-ink/70 text-center mt-3">
                        🎉 Todos os exercícios concluídos!
                      </p>
                    )}
                  </motion.div>
                ) : result === 'wrong' ? (
                  <motion.div
                    key={`wrong-${exerciseIdx}-${attempts}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-ember rounded-lg p-5"
                  >
                    <p className="font-display font-bold text-xl text-white mb-2">✗ Não desta vez.</p>
                    {currentExercise.resolution && (
                      <div className="text-white/80 mb-3">
                        <ResolutionText text={currentExercise.resolution} />
                      </div>
                    )}
                    <button
                      onClick={retry}
                      className="font-body text-[13px] text-white underline mt-3 block"
                    >
                      tentar de novo
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`exercise-${exerciseIdx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white border-[1.5px] border-ink rounded-lg p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-body text-[10px] text-muted uppercase tracking-wide">⚡ Exercício</span>
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[11px] text-muted">
                          {exerciseIdx + 1}/{totalExercises}
                        </span>
                        <button className="text-muted hover:text-ink transition-fast">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress dots */}
                    <div className="flex gap-1 mt-2">
                      {exercises.map((_, i) => (
                        <div
                          key={i}
                          className={`h-0.5 flex-1 rounded-full ${
                            i < exerciseIdx ? 'bg-lime' : i === exerciseIdx ? 'bg-ink' : 'bg-line'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="font-body text-sm text-ink leading-relaxed mt-3">
                      {currentExercise.question}
                    </p>

                    {currentExercise.data && currentExercise.data.length > 0 && (
                      <div className="bg-paper border border-line rounded p-3 mt-2 mb-3">
                        {currentExercise.data.map((d, i) => (
                          <p key={i} className="font-mono text-xs text-graphite">{d}</p>
                        ))}
                      </div>
                    )}

                    {/* Multiple choice options */}
                    {currentExercise.type === 'multiple_choice' && currentExercise.options ? (
                      <div className="space-y-2 mt-3 mb-3">
                        {currentExercise.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedOption(opt)}
                            className={`w-full text-left font-body text-sm p-3 rounded-md border-[1.5px] transition-all duration-[120ms] ${
                              selectedOption === opt
                                ? 'border-lime bg-lime/10 text-ink'
                                : 'border-line text-graphite hover:border-ink'
                            }`}
                          >
                            <span className="font-mono text-xs text-muted mr-2">
                              {String.fromCharCode(65 + i)}.
                            </span>
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3">
                        <label className="font-body text-[10px] text-muted uppercase tracking-widest mb-1 block">Resposta</label>
                        <input
                          type="number"
                          step="0.01"
                          value={answer}
                          onChange={e => setAnswer(e.target.value)}
                          className="w-full bg-white border-[1.5px] border-line rounded-md p-3 font-body text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-fast mt-1"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {/* Hint */}
                    {currentExercise.hint && (
                      <div className="mt-2">
                        <button
                          onClick={() => setShowHint(!showHint)}
                          className="font-body text-xs text-muted hover:text-ink transition-fast"
                        >
                          dica {showHint ? '↑' : '↓'}
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
                    )}

                    <button
                      onClick={check}
                      disabled={currentExercise.type === 'multiple_choice' ? !selectedOption : !answer}
                      className="w-full bg-ink text-lime font-display font-bold text-[13px] tracking-wide py-3 rounded-md mt-3 hover:bg-graphite transition-all duration-[120ms] disabled:opacity-40"
                    >
                      VERIFICAR →
                    </button>
                    <p className="font-body text-[11px] text-muted mt-2 text-center">tentativa {attempts}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="bg-white border border-line rounded-lg p-6 text-center">
                <p className="text-2xl mb-2">📚</p>
                <p className="font-body text-sm text-muted">Nenhum exercício disponível para este conceito.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
