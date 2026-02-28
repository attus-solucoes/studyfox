import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Dumbbell, Target, TrendingUp, Flame, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { GraphNode } from '@/types/course';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 500;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}{suffix}</>;
}

export default function Progress() {
  const navigate = useNavigate();
  const { courses } = useApp();

  const allNodes = useMemo(() =>
    courses.flatMap(c => c.subjects.filter(s => s.status === 'ready').flatMap(s => s.nodes)),
    [courses]
  );

  const allEdges = useMemo(() =>
    courses.flatMap(c => c.subjects.filter(s => s.status === 'ready').flatMap(s => s.edges)),
    [courses]
  );

  const stats = useMemo(() => {
    const total = allNodes.length;
    const mastered = allNodes.filter(n => n.mastery >= 0.7).length;
    const totalExercises = allNodes.reduce((sum, n) => sum + (n.exercises?.length || 0), 0);
    return { total, mastered, totalExercises };
  }, [allNodes]);

  // Heatmap: last 35 days (5 weeks × 7 days)
  const heatmap = useMemo(() => {
    const days: { date: Date; count: number }[] = [];
    const now = new Date();
    for (let i = 34; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayStr = d.toISOString().slice(0, 10);
      const count = allNodes.filter(n => n.lastReviewedAt?.startsWith(dayStr)).length;
      days.push({ date: d, count });
    }
    return days;
  }, [allNodes]);

  const maxActivity = Math.max(1, ...heatmap.map(d => d.count));

  // Distribution per subject
  const subjectDistribution = useMemo(() => {
    return courses.flatMap(c =>
      c.subjects.filter(s => s.status === 'ready' && s.nodes.length > 0).map(s => {
        const total = s.nodes.length;
        const mastered = s.nodes.filter(n => n.mastery >= 0.7).length;
        const inProgress = s.nodes.filter(n => n.mastery > 0 && n.mastery < 0.7).length;
        const notStarted = total - mastered - inProgress;
        return { name: s.name, total, mastered, inProgress, notStarted, courseName: c.name };
      })
    ).sort((a, b) => (b.mastered / b.total) - (a.mastered / a.total));
  }, [courses]);

  // Recommendations
  const recommendations = useMemo(() => {
    const toReview: (GraphNode & { subjectName: string })[] = [];
    const nextSteps: (GraphNode & { subjectName: string })[] = [];

    courses.forEach(c => c.subjects.filter(s => s.status === 'ready').forEach(s => {
      s.nodes.forEach(n => {
        if (n.mastery < 0.7) {
          toReview.push({ ...n, subjectName: s.name });
        }
        if (n.mastery === 0) {
          // Check if prerequisites have mastery >= 0.5
          const prereqIds = s.edges.filter(e => e.to === n.id).map(e => e.from);
          const prereqsMet = prereqIds.length === 0 || prereqIds.every(pid => {
            const prereq = s.nodes.find(node => node.id === pid);
            return prereq && prereq.mastery >= 0.5;
          });
          if (prereqsMet && prereqIds.length > 0) {
            nextSteps.push({ ...n, subjectName: s.name });
          }
        }
      });
    }));

    // Sort toReview by lastReviewedAt (oldest first, null first)
    toReview.sort((a, b) => {
      if (!a.lastReviewedAt && !b.lastReviewedAt) return 0;
      if (!a.lastReviewedAt) return -1;
      if (!b.lastReviewedAt) return 1;
      return new Date(a.lastReviewedAt).getTime() - new Date(b.lastReviewedAt).getTime();
    });

    return { toReview: toReview.slice(0, 3), nextSteps: nextSteps.slice(0, 3) };
  }, [courses]);

  const metrics = [
    { icon: Brain, label: 'CONCEITOS TOTAIS', value: stats.total },
    { icon: Target, label: 'DOMINADOS (≥70%)', value: stats.mastered },
    { icon: Dumbbell, label: 'EXERCÍCIOS FEITOS', value: stats.totalExercises },
    { icon: TrendingUp, label: 'TAXA DE ACERTO', value: -1 },
  ];

  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <motion.div className="p-6 lg:p-8 max-w-5xl" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="font-display font-extrabold text-[40px] text-ink">Progresso</h1>
        <p className="font-body text-sm text-muted">{courses.length} curso{courses.length !== 1 ? 's' : ''} · {stats.total} conceitos mapeados</p>
      </motion.div>

      {/* Metrics */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className="bg-white border border-line rounded-lg p-5 hover:border-ink/20 transition-all duration-[120ms] relative overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <Icon size={16} className="text-muted/40 absolute top-4 right-4" />
              <p className="font-display font-extrabold text-[48px] text-ink leading-none">
                {m.value === -1 ? '—' : <AnimatedNumber value={m.value} />}
              </p>
              <p className="font-body text-[11px] text-muted uppercase tracking-wide mt-1">{m.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Heatmap */}
      <motion.div variants={item} className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={14} className="text-muted" />
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">Atividade — últimas 5 semanas</span>
        </div>
        <div className="bg-white border border-line rounded-lg p-4">
          <div className="flex gap-0.5 mb-1">
            {dayLabels.map((d, i) => (
              <span key={i} className="w-5 text-center font-body text-[9px] text-muted">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {heatmap.map((day, i) => {
              const intensity = day.count === 0 ? 0 : day.count / maxActivity;
              return (
                <div
                  key={i}
                  className="w-5 h-5 rounded-[3px] relative group cursor-default"
                  style={{
                    backgroundColor: day.count === 0
                      ? '#E2DDD6'
                      : `rgba(191, 255, 0, ${Math.max(0.2, intensity)})`,
                  }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-ink text-white font-body text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {day.count} conceito{day.count !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2 justify-end">
            <span className="font-body text-[9px] text-muted">Menos</span>
            {[0, 0.2, 0.5, 0.8, 1].map((v, i) => (
              <div key={i} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: v === 0 ? '#E2DDD6' : `rgba(191, 255, 0, ${v})` }} />
            ))}
            <span className="font-body text-[9px] text-muted">Mais</span>
          </div>
        </div>
      </motion.div>

      {/* Distribution by Subject */}
      {subjectDistribution.length > 0 && (
        <motion.div variants={item} className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-muted" />
            <span className="font-body text-[10px] text-muted uppercase tracking-widest">Distribuição por matéria</span>
          </div>
          <div className="space-y-3">
            {subjectDistribution.map(s => (
              <div key={s.name} className="bg-white border border-line rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-body font-semibold text-[14px] text-ink">{s.name}</p>
                    <p className="font-body text-[11px] text-muted">{s.courseName}</p>
                  </div>
                  <span className="font-body text-[11px] text-muted">{s.total} conceitos</span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-line">
                  {s.mastered > 0 && (
                    <div className="h-full bg-lime" style={{ width: `${(s.mastered / s.total) * 100}%` }} />
                  )}
                  {s.inProgress > 0 && (
                    <div className="h-full bg-ink" style={{ width: `${(s.inProgress / s.total) * 100}%` }} />
                  )}
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="font-body text-[10px] text-muted flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-lime inline-block" />
                    Dominado {Math.round((s.mastered / s.total) * 100)}%
                  </span>
                  <span className="font-body text-[10px] text-muted flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-ink inline-block" />
                    Em progresso {Math.round((s.inProgress / s.total) * 100)}%
                  </span>
                  <span className="font-body text-[10px] text-muted flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-line inline-block" />
                    Não iniciado {Math.round((s.notStarted / s.total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div variants={item} className="mt-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🦊</span>
          <span className="font-body text-[10px] text-ink uppercase tracking-widest">Recomenda</span>
        </div>
        <h2 className="font-display font-bold text-[22px] text-ink mt-1 mb-3">Onde focar agora</h2>

        {recommendations.toReview.length === 0 && recommendations.nextSteps.length === 0 ? (
          <div className="bg-white border border-line rounded-lg p-6 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-body text-sm text-muted">Nenhuma recomendação — adicione matérias e gere grafos para começar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {recommendations.toReview.map(n => (
              <div
                key={n.id}
                onClick={() => navigate(`/concept/${n.id}`)}
                className="bg-white border border-line rounded-lg p-4 border-l-2 border-l-ember cursor-pointer hover:border-ink/20 transition-all duration-[120ms] group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-body text-[10px] uppercase tracking-wide border border-ember text-ember px-1.5 py-0.5 rounded">REVISAR</span>
                  <span className="font-body text-[10px] text-muted">{n.subjectName}</span>
                </div>
                <p className="font-body font-semibold text-[15px] text-ink">{n.title}</p>
                <p className="font-body text-[13px] text-muted mt-0.5 line-clamp-1">{n.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-body text-[11px] text-muted">Domínio: {Math.round(n.mastery * 100)}%</span>
                  {n.lastReviewedAt && (
                    <span className="font-body text-[11px] text-muted flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(n.lastReviewedAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {recommendations.nextSteps.map(n => (
              <div
                key={n.id}
                onClick={() => navigate(`/concept/${n.id}`)}
                className="bg-white border border-line rounded-lg p-4 border-l-2 border-l-lime cursor-pointer hover:border-ink/20 transition-all duration-[120ms] group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-body text-[10px] uppercase tracking-wide border border-lime text-lime px-1.5 py-0.5 rounded">PRÓXIMO</span>
                  <span className="font-body text-[10px] text-muted">{n.subjectName}</span>
                </div>
                <p className="font-body font-semibold text-[15px] text-ink">{n.title}</p>
                <p className="font-body text-[13px] text-muted mt-0.5 line-clamp-1">{n.description}</p>
                <button className="font-body text-[13px] mt-2 bg-ink text-lime px-3 py-1.5 rounded-md hover:bg-graphite transition-all duration-[120ms]">
                  Começar →
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
