import { useState, useEffect, useRef, useMemo } from 'react';
import { PencilRuler, X, Play, Pause, RotateCcw, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FormulaCalculator from '@/components/FormulaCalculator';
import FormulaRenderer from '@/components/FormulaRenderer';
import { FORMULA_BANK, AREA_LABELS, type FormulaEntry } from '@/lib/formulaBank';
import type { GraphNode } from '@/types/course';

interface ConceptToolboxProps {
  node: GraphNode;
}

// ─── Pomodoro Timer ─────────────────────────────────

function PomodoroTimer() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <span
        className={`font-display font-bold text-[42px] tabular-nums ${
          running ? 'text-accent' : 'text-foreground'
        }`}
      >
        {mins}:{secs}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="bg-foreground text-accent font-display font-bold text-xs tracking-wide px-4 py-2 rounded-md hover:bg-muted-foreground transition-colors duration-[120ms] flex items-center gap-1.5"
        >
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? 'Pausar' : 'Iniciar'}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setSeconds(25 * 60);
          }}
          className="border border-border text-muted-foreground hover:text-foreground px-3 py-2 rounded-md transition-colors duration-[120ms]"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Formula Bank Tab ───────────────────────────────

const AREA_FILTERS: Array<{ value: FormulaEntry['area'] | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'thermodynamics', label: 'Termodic' },
  { value: 'fluids', label: 'Fluidos' },
  { value: 'heat_transfer', label: 'Calor' },
  { value: 'strength', label: 'Resist' },
  { value: 'mechanics', label: 'Mecânica' },
];

interface FormulaBankTabProps {
  onSelectFormula?: (entry: FormulaEntry) => void;
}

function FormulaBankTab({ onSelectFormula }: FormulaBankTabProps) {
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<FormulaEntry['area'] | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return FORMULA_BANK.filter((f) => {
      if (areaFilter !== 'all' && f.area !== areaFilter) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        f.tags.join(' ').toLowerCase().includes(q) ||
        AREA_LABELS[f.area].toLowerCase().includes(q)
      );
    });
  }, [search, areaFilter]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar fórmula..."
          className="w-full font-body text-xs bg-secondary border border-border rounded-md pl-8 pr-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Area chips */}
      <div className="flex flex-wrap gap-1">
        {AREA_FILTERS.map((af) => (
          <button
            key={af.value}
            onClick={() => setAreaFilter(af.value)}
            className={`font-body text-[10px] px-2 py-1 rounded-full border transition-colors duration-[120ms] ${
              areaFilter === af.value
                ? 'bg-foreground text-accent border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
            }`}
          >
            {af.label}
          </button>
        ))}
      </div>

      {/* Formula list */}
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <p className="font-body text-xs text-muted-foreground text-center py-4">
            Nenhuma fórmula encontrada.
          </p>
        )}

        {filtered.map((entry) => {
          const isExpanded = expandedId === entry.id;

          return (
            <div
              key={entry.id}
              className="border border-border rounded-lg overflow-hidden transition-colors duration-[120ms] hover:border-foreground/30"
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[11px] font-semibold text-foreground leading-tight">
                    {entry.title}
                  </p>
                  <div className="mt-1.5 scale-90 origin-left">
                    <FormulaRenderer
                      formula={entry.formula_latex}
                      displayMode={false}
                      className="text-foreground"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <span className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">
                    {AREA_LABELS[entry.area]}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-muted-foreground transition-transform duration-150 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 border-t border-border pt-2.5 space-y-2.5">
                      {/* Variables */}
                      <div>
                        <p className="font-body text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
                          Variáveis
                        </p>
                        <div className="space-y-0.5">
                          {entry.variables.map((v, i) => (
                            <div key={i} className="font-body text-[11px] text-foreground flex gap-1.5">
                              <span className="font-semibold shrink-0">{v.symbol}</span>
                              <span className="text-muted-foreground">—</span>
                              <span>{v.meaning}</span>
                              <span className="text-muted-foreground ml-auto shrink-0">[{v.unit}]</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* When to use */}
                      <div>
                        <p className="font-body text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
                          Quando usar
                        </p>
                        <p className="font-body text-[11px] text-foreground leading-relaxed">
                          {entry.when_to_use}
                        </p>
                      </div>

                      {/* Source */}
                      {entry.source && (
                        <p className="font-body text-[10px] text-muted-foreground italic">
                          📚 {entry.source}
                        </p>
                      )}

                      {/* Calculate button */}
                      {onSelectFormula && (
                        <button
                          onClick={() => onSelectFormula(entry)}
                          className="w-full bg-foreground text-accent font-display font-bold text-[10px] uppercase tracking-wider py-2 rounded-md hover:bg-muted-foreground transition-colors duration-[120ms]"
                        >
                          Calcular →
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────

export default function ConceptToolbox({ node }: ConceptToolboxProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'calc' | 'pomo' | 'formulas'>('calc');
  const [bankFormula, setBankFormula] = useState<FormulaEntry | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasFormula = !!(node.formula && node.variables && node.variables.length >= 2);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelectFormula = (entry: FormulaEntry) => {
    setBankFormula(entry);
    setTab('calc');
  };

  // Build calculator variables from bank formula or node
  const calcFormula = bankFormula ? bankFormula.formula_latex : node.formula;
  const calcVariables = bankFormula
    ? bankFormula.variables.map((v) => ({ symbol: v.symbol, meaning: v.meaning, unit: v.unit }))
    : node.variables;
  const calcReady = !!(calcFormula && calcVariables && calcVariables.length >= 2);

  const tabs = [
    { id: 'calc' as const, label: 'Calculadora' },
    { id: 'pomo' as const, label: 'Timer de estudo' },
    { id: 'formulas' as const, label: '📐 Fórmulas' },
  ];

  return (
    <div className="fixed bottom-20 right-6 z-40" ref={panelRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-14 right-0 w-[340px] bg-background border border-border rounded-xl shadow-xl overflow-hidden mb-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-display font-bold text-sm text-foreground">✏️ Estojo</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-[120ms]"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 font-body text-[10px] uppercase tracking-widest py-2.5 transition-colors duration-[120ms] ${
                    tab === t.id
                      ? 'text-foreground border-b-2 border-accent'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {tab === 'calc' ? (
                calcReady ? (
                  <>
                    {bankFormula && (
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-body text-[10px] text-muted-foreground">
                          📐 {bankFormula.title}
                        </p>
                        <button
                          onClick={() => setBankFormula(null)}
                          className="font-body text-[9px] text-muted-foreground hover:text-foreground uppercase tracking-wide"
                        >
                          Usar do conceito
                        </button>
                      </div>
                    )}
                    <FormulaCalculator formula={calcFormula!} variables={calcVariables!} />
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-2">📐</p>
                    <p className="font-body text-sm text-muted-foreground">
                      Nenhuma fórmula neste conceito — use o timer para cronometrar seu estudo.
                    </p>
                  </div>
                )
              ) : tab === 'pomo' ? (
                <PomodoroTimer />
              ) : (
                <FormulaBankTab onSelectFormula={handleSelectFormula} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Abrir estojo"
        className="bg-foreground text-accent rounded-full p-3 shadow-lg hover:bg-muted-foreground transition-colors duration-[120ms]"
      >
        <PencilRuler size={20} />
      </button>
    </div>
  );
}
