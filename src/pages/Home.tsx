import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, BookOpen, Target, Zap } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Course } from '@/types/course';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const metricIcons = [Brain, BookOpen, Target];

export default function Home() {
  const { user } = useAuth();
  const { courses, addCourse } = useApp();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseInstitution, setCourseInstitution] = useState('');

  const globalStats = useMemo(() => {
    let totalConcepts = 0;
    let masteredConcepts = 0;
    let reviewCount = 0;
    for (const c of courses) {
      for (const s of c.subjects) {
        if (s.status !== 'ready') continue;
        totalConcepts += s.nodes.length;
        masteredConcepts += s.nodes.filter(n => n.mastery >= 0.7).length;
        // Weak nodes + new unlocked nodes as rough review count
        for (const n of s.nodes) {
          if (n.mastery > 0 && n.mastery < 0.3) reviewCount++;
          if (n.mastery === 0) {
            const prereqEdges = s.edges.filter(e => e.to === n.id);
            const allMet = prereqEdges.length === 0 || prereqEdges.every(e => {
              const prereq = s.nodes.find(pn => pn.id === e.from);
              return prereq && prereq.mastery >= 0.5;
            });
            if (allMet) reviewCount++;
          }
        }
      }
    }
    return { totalConcepts, masteredConcepts, reviewCount };
  }, [courses]);

  const metrics = [
    { value: String(globalStats.totalConcepts), label: 'CONCEITOS NO GRAFO', delta: `${globalStats.masteredConcepts} dominados`, positive: globalStats.masteredConcepts > 0 },
    { value: String(courses.length), label: 'CURSOS ATIVOS', delta: `${courses.reduce((a, c) => a + c.subjects.length, 0)} matérias`, positive: courses.length > 0 },
    { value: globalStats.totalConcepts > 0 ? Math.round((globalStats.masteredConcepts / globalStats.totalConcepts) * 100) + '%' : '—', label: 'DOMÍNIO GERAL', delta: 'meta: 80%', positive: false },
  ];

  const handleCreate = () => {
    if (!courseName.trim()) return;
    const id = crypto.randomUUID();
    const newCourse: Course = {
      id,
      name: courseName.trim(),
      institution: courseInstitution.trim(),
      createdAt: new Date().toISOString(),
      subjects: [],
    };
    addCourse(newCourse);
    setCourseName('');
    setCourseInstitution('');
    setShowModal(false);
    navigate(`/course/${id}`);
  };

  return (
    <>
      <motion.div className="p-6 lg:p-8 max-w-5xl" variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={item} className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-[40px] text-ink">Bom dia.</h1>
            <p className="font-body text-sm text-muted">
              Continue de onde parou, {user?.name || '🦊'}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 border-[1.5px] border-ink font-body font-semibold text-[13px] text-ink px-4 py-2 rounded-md hover:bg-ink hover:text-lime transition-all duration-[120ms]"
          >
            Novo curso +
          </button>
        </motion.div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {metrics.map((m, i) => {
            const Icon = metricIcons[i];
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="bg-white border border-line rounded-lg p-5 relative hover:border-ink/20 transition-all duration-[120ms]"
              >
                <Icon size={16} className="absolute top-4 right-4 text-muted/40" strokeWidth={1.5} />
                <p className="font-display font-extrabold text-[48px] text-ink leading-none">{m.value}</p>
                <p className="font-body text-[11px] text-muted uppercase tracking-wide mt-1">{m.label}</p>
                <p className={`font-body text-xs mt-1 ${m.positive ? 'text-[#BFFF00]' : 'text-muted'}`}>{m.delta}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Daily Session Card */}
        {globalStats.totalConcepts > 0 && (
          <motion.div variants={item} className="mt-6">
            <div
              onClick={() => globalStats.reviewCount > 0 ? navigate('/study') : undefined}
              className={`relative overflow-hidden rounded-lg p-5 border transition-all duration-[120ms] ${
                globalStats.reviewCount > 0
                  ? 'bg-ink border-ink cursor-pointer hover:opacity-95'
                  : 'bg-white border-line'
              }`}
            >
              <Zap
                size={80}
                className={`absolute -right-4 -top-4 ${
                  globalStats.reviewCount > 0 ? 'text-lime/10' : 'text-muted/5'
                }`}
                strokeWidth={1}
              />
              {globalStats.reviewCount > 0 ? (
                <div className="relative z-10">
                  <p className="font-display font-bold text-lg text-lime">
                    Você tem {globalStats.reviewCount} conceitos para revisar hoje
                  </p>
                  <p className="font-body text-xs text-white/50 mt-1">
                    Sessão estimada: ~{Math.min(25, globalStats.reviewCount * 2)} min
                  </p>
                  <span className="inline-block mt-3 font-display font-bold text-[13px] text-ink bg-lime px-5 py-2 rounded-md">
                    Começar sessão →
                  </span>
                </div>
              ) : (
                <div className="relative z-10">
                  <p className="font-display font-bold text-lg text-ink flex items-center gap-2">
                    ✅ Você está em dia!
                  </p>
                  <p className="font-body text-xs text-muted mt-1">
                    Nenhum conceito para revisar agora. Continue assim!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Courses */}
        <motion.div variants={item} className="mt-8">
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">SEUS CURSOS</span>

          {courses.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-line rounded-lg p-10 text-center mt-3">
              <motion.p
                className="text-4xl mb-4"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                🦊
              </motion.p>
              <p className="font-display font-bold text-xl text-ink">Comece sua jornada.</p>
              <p className="font-body text-sm text-muted mb-6 max-w-sm mx-auto">
                Crie seu primeiro curso, adicione uma matéria e cole o conteúdo da apostila. A IA gera o grafo de conceitos pra você.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-lime text-ink font-display font-bold text-[14px] tracking-wide px-8 py-3 rounded-md hover:brightness-95 transition-all duration-[120ms] shadow-[0_0_20px_rgba(191,255,0,0.3)]"
              >
                Criar primeiro curso →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {courses.map((c, ci) => {
                const totalNodes = c.subjects.reduce((a, s) => a + s.nodes.length, 0);
                const avgProgress = c.subjects.length
                  ? Math.round(c.subjects.reduce((a, s) => a + s.progress, 0) / c.subjects.length)
                  : 0;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: ci * 0.06 }}
                    onClick={() => navigate(`/course/${c.id}`)}
                    className="bg-white border border-line rounded-lg p-5 cursor-pointer hover:border-ink/20 hover:-translate-y-px hover:shadow-sm transition-all duration-[120ms] group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-body font-semibold text-[15px] text-ink">{c.name}</p>
                      <div className="flex items-center gap-2">
                        {totalNodes > 0 && (
                          <motion.span
                            className="font-mono text-[10px] text-lime bg-ink px-2 py-0.5 rounded"
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.4, delay: ci * 0.06 + 0.3 }}
                          >
                            {totalNodes} conceitos
                          </motion.span>
                        )}
                        <span className="font-body text-[10px] text-muted border border-line px-2 py-0.5 rounded">
                          {c.subjects.length} matéria{c.subjects.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    {c.institution && (
                      <p className="font-body text-xs text-muted">{c.institution}</p>
                    )}
                    {c.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.subjects.slice(0, 3).map(s => (
                          <span key={s.id} className="font-body text-[11px] text-graphite border border-line px-2 py-0.5 rounded">
                            {s.name}
                          </span>
                        ))}
                        {c.subjects.length > 3 && (
                          <span className="font-body text-[11px] text-muted">+{c.subjects.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="w-full h-1 bg-line mt-3 rounded-full overflow-hidden">
                      <div className="h-full bg-lime rounded-full transition-all duration-500" style={{ width: `${avgProgress}%` }} />
                    </div>
                    <p className="font-body text-[13px] text-muted hover:text-ink transition-fast mt-3 inline-flex items-center gap-1">
                      Ver matérias <span className="inline-block transition-transform duration-[120ms] group-hover:translate-x-1">→</span>
                    </p>
                  </motion.div>
                );
              })}

              {/* Add course card */}
              <div
                onClick={() => setShowModal(true)}
                className="border-[1.5px] border-dashed border-line rounded-lg p-5 flex items-center justify-center hover:border-ink/20 hover:text-ink transition-all duration-[120ms] cursor-pointer text-muted"
              >
                <span className="font-body text-sm">+ Novo curso</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-ink/60" onClick={() => setShowModal(false)} />
            <motion.div
              className="relative bg-white border border-line rounded-lg p-6 w-full max-w-md shadow-lg z-10"
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-xl text-ink">Novo curso</h2>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-ink transition-fast">
                  <X size={16} />
                </button>
              </div>

              <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">NOME DO CURSO</label>
              <input
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="Ex: Engenharia Mecânica"
                className="w-full bg-white border-[1.5px] border-line focus:border-ink font-body text-sm text-ink p-3 rounded-md outline-none mb-4"
                autoFocus
              />

              <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">INSTITUIÇÃO</label>
              <input
                value={courseInstitution}
                onChange={e => setCourseInstitution(e.target.value)}
                placeholder="Ex: UFSC"
                className="w-full bg-white border-[1.5px] border-line focus:border-ink font-body text-sm text-ink p-3 rounded-md outline-none mb-6"
              />

              <button
                onClick={handleCreate}
                disabled={!courseName.trim()}
                className="bg-ink text-lime font-display font-bold text-[13px] tracking-wide w-full py-3 rounded-md hover:bg-graphite transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Criar curso →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
