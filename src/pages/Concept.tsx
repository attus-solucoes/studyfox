import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const concept = {
  title: 'Coeficiente de Performance (COP)',
  level: 2,
  mastery: 0.72,
  intuition: 'Um ar-condicionado com COP = 3 entrega 3 kW de frescor para cada 1 kW de eletricidade. Você não cria frio — você move calor. E mover é muito mais eficiente que criar.',
  formula: 'COP = (h1 - h4) / (h2 - h1)',
  vars: [
    'h1 = entalpia saída evaporador [kJ/kg]',
    'h2 = entalpia saída compressor [kJ/kg]',
    'h4 = entalpia saída válvula = h3 [kJ/kg]',
  ],
  description: 'O COP mede a eficiência do sistema: razão entre o calor retirado do espaço refrigerado e o trabalho elétrico consumido pelo compressor.',
};

export default function Concept() {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(1);

  const check = () => {
    const val = parseFloat(answer);
    if (Math.abs(val - 3.21) <= 0.05) {
      setResult('correct');
    } else {
      setResult('wrong');
    }
  };

  const retry = () => {
    setResult(null);
    setAnswer('');
    setAttempts(a => a + 1);
  };

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
            <span className="font-body text-xs text-muted">RAC / COP</span>
            <div className="w-20 h-0.5 bg-line">
              <div className="h-full bg-lime" style={{ width: '72%' }} />
            </div>
            <span className="font-body text-[11px] text-muted">72%</span>
          </div>

          <h1 className="font-display font-bold text-[28px] text-ink mt-2">{concept.title}</h1>

          {/* Intuition */}
          <div className="border-l-2 border-lime bg-white p-5 rounded-r-lg">
            <span className="font-body text-[10px] text-muted uppercase tracking-wide">💡 Intuição</span>
            <p className="font-body text-[15px] text-ink leading-relaxed mt-2">{concept.intuition}</p>
          </div>

          {/* Concept */}
          <div className="border-l-2 border-ink bg-white p-5 rounded-r-lg">
            <span className="font-body text-[10px] text-muted uppercase tracking-wide">▸ Conceito</span>
            <p className="font-body text-sm text-graphite leading-relaxed mt-2">{concept.description}</p>
          </div>

          {/* Formula */}
          <div className="bg-ink rounded-lg p-5">
            <span className="font-body text-[10px] text-muted uppercase tracking-wide">∑ Fórmula</span>
            <p className="font-mono text-[15px] text-lime mt-2">{concept.formula}</p>
            {concept.vars.map(v => (
              <p key={v} className="font-mono text-[11px] text-muted mt-1">{v}</p>
            ))}
          </div>

          {/* Prerequisites */}
          <div className="bg-white border border-line rounded-lg p-4">
            <span className="font-body text-[10px] text-muted uppercase tracking-wide">Você precisava saber</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Ciclo Ideal', 'Diagrama P-h', 'Transf. Calor'].map(p => (
                <span key={p} className="font-body text-xs border border-ink px-3 py-1 rounded cursor-pointer hover:bg-ink hover:text-lime transition-fast">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Exercise */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-4">
            <AnimatePresence mode="wait">
              {result === 'correct' ? (
                <motion.div
                  key="correct"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-lime rounded-lg p-5"
                >
                  <p className="font-display font-extrabold text-2xl text-ink">✓ Correto.</p>
                   <p className="font-mono text-xs text-ink mt-1 mb-4">
                     COP = (390−255)/(432−390) = 135/42 ≈ 3,21
                   </p>
                   <div>
                     <p className="font-body text-[11px] text-muted mb-1">72% → 79%</p>
                     <div className="w-full h-1 bg-ink/20">
                      <motion.div
                        className="h-full bg-ink"
                        initial={{ width: '72%' }}
                        animate={{ width: '79%' }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      />
                    </div>
                  </div>
                   <button className="w-full bg-ink text-lime font-body font-semibold text-[13px] py-2.5 rounded-md mt-3 hover:bg-graphite transition-fast">
                     próximo exercício →
                   </button>
                </motion.div>
              ) : result === 'wrong' ? (
                <motion.div
                  key="wrong"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-ember rounded-lg p-5"
                >
                   <p className="font-display font-bold text-xl text-white mb-2">✗ Não desta vez.</p>
                   <p className="font-body text-[13px] text-white/80 mb-3">
                    Verifique qual entalpia representa cada ponto do ciclo.
                  </p>
                  <button
                    onClick={retry}
                    className="font-body text-[13px] text-white underline mt-3 block"
                  >
                    tentar de novo
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="exercise"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border-[1.5px] border-ink rounded-lg p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-[10px] text-muted uppercase tracking-wide">⚡ Exercício</span>
                    <button className="text-muted hover:text-ink transition-fast">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <p className="font-body text-[13px] text-muted mt-1">— — — · ·</p>

                  <p className="font-body text-sm text-ink leading-relaxed mt-3">
                    Um sistema de refrigeração opera com R-134a. Dados do ciclo:
                  </p>

                   <div className="bg-paper border border-line rounded p-3 mt-2 mb-3">
                     <p className="font-mono text-xs text-graphite">h1 = 390 kJ/kg   (saída evaporador)</p>
                     <p className="font-mono text-xs text-graphite">h2 = 432 kJ/kg   (saída compressor)</p>
                     <p className="font-mono text-xs text-graphite">h4 = 255 kJ/kg   (saída válvula)</p>
                   </div>

                   <p className="font-body font-semibold text-sm text-ink mb-3">Calcule o COP do ciclo.</p>

                  {/* Hint */}
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
                           <p className="font-body text-[13px] text-graphite">
                              Use COP = (h1−h4)/(h2−h1). Identifique cada entalpia no enunciado.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Input */}
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
                     <button
                       onClick={check}
                       disabled={!answer}
                       className="w-full bg-ink text-lime font-display font-bold text-[13px] tracking-wide py-3 rounded-md mt-3 hover:bg-graphite transition-fast disabled:opacity-40"
                     >
                       VERIFICAR →
                     </button>
                   </div>
                   <p className="font-body text-[11px] text-muted mt-2 text-center">tentativa {attempts}</p>
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
