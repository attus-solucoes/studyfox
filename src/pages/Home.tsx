import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { Course } from '@/types/course';

const metrics = [
  { value: '11', label: 'CONCEITOS ESTUDADOS', delta: '+3 essa semana', positive: true },
  { value: '47', label: 'EXERCÍCIOS FEITOS', delta: '+12 essa semana', positive: true },
  { value: '73%', label: 'TAXA DE ACERTO', delta: 'meta: 80%', positive: false },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Home() {
  const { user } = useAuth();
  const { courses, addCourse } = useApp();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseInstitution, setCourseInstitution] = useState('');

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
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {metrics.map(m => (
            <div key={m.label} className="bg-white border border-line rounded-lg p-5">
              <p className="font-display font-extrabold text-[40px] text-ink leading-none">{m.value}</p>
              <p className="font-body text-[11px] text-muted uppercase tracking-wide mt-1">{m.label}</p>
              <p className={`font-body text-xs mt-1 ${m.positive ? 'text-lime' : 'text-muted'}`}>{m.delta}</p>
            </div>
          ))}
        </motion.div>

        {/* Courses */}
        <motion.div variants={item} className="mt-8">
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">SEUS CURSOS</span>

          {courses.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-line rounded-lg p-8 text-center mt-3">
              <p className="text-3xl mb-3">🦊</p>
              <p className="font-body font-semibold text-base text-ink">Nenhum curso ainda.</p>
              <p className="font-body text-sm text-muted mb-4">Adicione seu primeiro curso para começar.</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-ink text-lime font-body font-semibold text-[13px] px-6 py-2.5 rounded-md hover:bg-graphite transition-all duration-[120ms]"
              >
                Criar primeiro curso →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {courses.map(c => {
                const avgProgress = c.subjects.length
                  ? Math.round(c.subjects.reduce((a, s) => a + s.progress, 0) / c.subjects.length)
                  : 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/course/${c.id}`)}
                    className="bg-white border border-line rounded-lg p-5 cursor-pointer hover:border-ink transition-all duration-150"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-body font-semibold text-[15px] text-ink">{c.name}</p>
                      <span className="font-body text-[10px] text-muted border border-line px-2 py-0.5 rounded">
                        {c.subjects.length} matéria{c.subjects.length !== 1 ? 's' : ''}
                      </span>
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
                    <div className="w-full h-0.5 bg-line mt-3">
                      <div className="h-full bg-lime transition-all duration-500" style={{ width: `${avgProgress}%` }} />
                    </div>
                    <p className="font-body text-[13px] text-muted hover:text-ink transition-fast mt-3">
                      Ver matérias →
                    </p>
                  </div>
                );
              })}

              {/* Add course card */}
              <div
                onClick={() => setShowModal(true)}
                className="border-[1.5px] border-dashed border-line rounded-lg p-5 flex items-center justify-center hover:border-ink hover:text-ink transition-fast cursor-pointer text-muted"
              >
                <span className="font-body text-sm">+ Novo curso</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Modal: Novo Curso */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="absolute inset-0 bg-ink/60" onClick={() => setShowModal(false)} />
            <motion.div
              className="relative bg-white border border-line rounded-lg p-6 w-full max-w-md shadow-lg z-10"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
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
                className="bg-ink text-lime font-display font-bold text-[13px] tracking-wide w-full py-3 rounded-md hover:bg-graphite transition-all duration-[120ms] disabled:opacity-40"
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
