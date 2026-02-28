import { useState, useEffect, useRef } from 'react';
import { Wrench, X, Play, Pause, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FormulaCalculator from '@/components/FormulaCalculator';
import type { GraphNode } from '@/types/course';

interface ConceptToolboxProps {
  node: GraphNode;
}

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

export default function ConceptToolbox({ node }: ConceptToolboxProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'calc' | 'pomo'>('calc');
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

  return (
    <div className="fixed bottom-20 right-6 z-40" ref={panelRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-14 right-0 w-[320px] bg-background border border-border rounded-xl shadow-xl overflow-hidden mb-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-display font-bold text-sm text-foreground">🧰 Ferramentas</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-[120ms]"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setTab('calc')}
                className={`flex-1 font-body text-[10px] uppercase tracking-widest py-2.5 transition-colors duration-[120ms] ${
                  tab === 'calc'
                    ? 'text-foreground border-b-2 border-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Calculadora
              </button>
              <button
                onClick={() => setTab('pomo')}
                className={`flex-1 font-body text-[10px] uppercase tracking-widest py-2.5 transition-colors duration-[120ms] ${
                  tab === 'pomo'
                    ? 'text-foreground border-b-2 border-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pomodoro
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {tab === 'calc' ? (
                hasFormula ? (
                  <FormulaCalculator formula={node.formula!} variables={node.variables!} />
                ) : (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-2">📐</p>
                    <p className="font-body text-sm text-muted-foreground">
                      Este conceito não tem fórmula para calcular
                    </p>
                  </div>
                )
              ) : (
                <PomodoroTimer />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="bg-foreground text-accent rounded-full p-3 shadow-lg hover:bg-muted-foreground transition-colors duration-[120ms]"
      >
        <Wrench size={20} />
      </button>
    </div>
  );
}
