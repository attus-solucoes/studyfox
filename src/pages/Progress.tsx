import { motion } from 'framer-motion';

const metrics = [
  { value: '11', label: 'CONCEITOS ESTUDADOS' },
  { value: '47', label: 'EXERCÍCIOS' },
  { value: '73%', label: 'ACERTO' },
  { value: '🔥 5', label: 'DIAS' },
];

const heatmapData = Array.from({ length: 30 }, () => Math.random());

const distribution = [
  { label: 'Não estudado', pct: 52, color: '#E2DDD6' },
  { label: 'Iniciado', pct: 20, color: '#111110' },
  { label: 'Em progresso', pct: 18, color: '#BFFF00' },
  { label: 'Dominado', pct: 10, color: '#BFFF00' },
];

const recs = [
  { type: 'review', badge: 'REVISAR', title: 'Ciclo Ideal', desc: 'Conceito fundamental com baixo domínio. Revise antes de avançar.', borderColor: 'border-ember', badgeColor: 'text-ember border-ember' },
  { type: 'next', badge: 'PRÓXIMO', title: 'Compressores', desc: 'Pré-requisitos completos. Pronto para estudar.', borderColor: 'border-lime', badgeColor: 'text-lime border-lime' },
  { type: 'decay', badge: 'REVISAR EM BREVE', title: 'Condensadores', desc: 'Estudado há 12 dias. Risco de esquecimento.', borderColor: 'border-muted', badgeColor: 'text-muted border-muted' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Progress() {
  return (
    <motion.div className="p-6 lg:p-8 max-w-5xl" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="font-display font-extrabold text-[40px] text-ink">Progresso</h1>
        <p className="font-body text-sm text-muted">RAC · 18 dias estudando</p>
      </motion.div>

      {/* Metrics */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border border-line rounded-lg p-5">
            <p className="font-display font-extrabold text-[40px] text-ink leading-none">{m.value}</p>
            <p className="font-body text-[11px] text-muted uppercase tracking-wide mt-1">{m.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Heatmap */}
      <motion.div variants={item} className="mt-6">
        <span className="font-body text-[10px] text-muted uppercase tracking-widest">Atividade — 30 dias</span>
        <div className="flex gap-1 mt-2 flex-wrap">
          {heatmapData.map((v, i) => (
            <div
              key={i}
              className="w-5 h-5"
              style={{
                backgroundColor: v < 0.1 ? '#E2DDD6' : '#BFFF00',
                opacity: v < 0.1 ? 1 : v < 0.3 ? 0.3 : v < 0.6 ? 0.6 : 1,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Distribution */}
      <motion.div variants={item} className="mt-6">
        <span className="font-body text-[10px] text-muted uppercase tracking-widest">Distribuição</span>
        <div className="space-y-3 mt-2">
          {distribution.map(d => (
            <div key={d.label}>
              <div className="flex justify-between">
                <span className="font-body text-[13px] text-ink">{d.label}</span>
                <span className="font-body text-[13px] text-muted">{d.pct}%</span>
              </div>
              <div className="w-full h-2 bg-line mt-1">
                <div className="h-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div variants={item} className="mt-6">
        <span className="font-body text-[10px] text-ink uppercase tracking-widest">🦊 Recomenda</span>
        <h2 className="font-display font-bold text-[22px] text-ink mt-1">Onde focar agora</h2>
        <div className="grid grid-cols-1 gap-3 mt-3">
          {recs.map(r => (
            <div key={r.title} className={`bg-white border border-line rounded-lg p-4 border-l-2 ${r.borderColor}`}>
              <span className={`font-body text-[10px] uppercase tracking-wide border px-1.5 py-0.5 rounded ${r.badgeColor}`}>
                {r.badge}
              </span>
              <p className="font-body font-semibold text-[15px] text-ink mt-2">{r.title}</p>
              <p className="font-body text-[13px] text-muted mt-0.5">{r.desc}</p>
              <button className={`font-body text-[13px] mt-2 transition-fast ${
                r.type === 'next'
                  ? 'bg-ink text-lime px-3 py-1.5 rounded-md hover:bg-graphite'
                  : 'text-ink border border-ink px-3 py-1.5 rounded-md hover:bg-ink hover:text-lime'
              }`}>
                {r.type === 'next' ? 'Começar →' : 'Revisar →'}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
