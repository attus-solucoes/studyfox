import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

const metrics = [
  { value: '11', label: 'CONCEITOS ESTUDADOS', delta: '+3 essa semana', positive: true },
  { value: '47', label: 'EXERCÍCIOS FEITOS', delta: '+12 essa semana', positive: true },
  { value: '73%', label: 'TAXA DE ACERTO', delta: 'meta: 80%', positive: false },
];

const subjects = [
  { id: 'rac', name: 'Refrigeração (RAC)', concepts: 42, mastery: 18 },
  { id: 'thermo', name: 'Termodinâmica', concepts: 35, mastery: 5 },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Home() {
  const { user } = useAuth();

  return (
    <motion.div
      className="p-6 lg:p-8 max-w-5xl"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <h1 className="font-display font-extrabold text-[40px] text-ink">Bom dia.</h1>
        <p className="font-body text-sm text-muted">
          Continue de onde parou, {user?.name || '🦊'}
        </p>
      </motion.div>

      {/* Metrics */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border border-line rounded-lg p-5">
            <p className="font-display font-extrabold text-[40px] text-ink leading-none">{m.value}</p>
            <p className="font-body text-[11px] text-muted uppercase tracking-wide mt-1">{m.label}</p>
            <p className={`font-body text-xs mt-1 ${m.positive ? 'text-lime' : 'text-muted'}`}>
              {m.delta}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Subjects */}
      <motion.div variants={item} className="mt-8">
        <span className="font-body text-[10px] text-muted uppercase tracking-widest">Suas matérias</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {subjects.map(s => (
            <div key={s.id} className="bg-white border border-line rounded-lg p-5">
              <p className="font-body font-semibold text-[15px] text-ink">{s.name}</p>
              <p className="font-body text-xs text-muted mt-0.5">
                {s.concepts} conceitos · {s.mastery}% dominado
              </p>
              <div className="w-full h-0.5 bg-line mt-3">
                <div className="h-full bg-lime" style={{ width: `${s.mastery}%` }} />
              </div>
              <Link
                to={`/subject/${s.id}`}
                className="inline-block font-body text-[13px] text-muted hover:text-ink transition-fast mt-3"
              >
                Continuar →
              </Link>
            </div>
          ))}

          {/* Add Subject */}
          <div className="border-[1.5px] border-dashed border-line rounded-lg p-5 flex items-center justify-center hover:border-ink hover:text-ink transition-fast cursor-pointer text-muted">
            <span className="font-body text-sm">+ Nova matéria</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
