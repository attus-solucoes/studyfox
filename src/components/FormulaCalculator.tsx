import { useState, useMemo } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { evaluate } from 'mathjs';
import type { FormulaVariable } from '@/types/course';

interface FormulaCalculatorProps {
  formula: string;
  variables: FormulaVariable[];
}

/**
 * Converte fórmula legível (ex: "Q_total = Q_transmissao + Q_produtos")
 * em expressão avaliável pelo mathjs, isolando a incógnita.
 */
function parseFormula(formula: string): { lhs: string; rhs: string } | null {
  // Limpa LaTeX superficial
  let clean = formula
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\{|\}/g, '')
    .replace(/\^/g, '**')
    .replace(/_/g, '_');

  const eqIdx = clean.indexOf('=');
  if (eqIdx === -1) return null;

  const lhs = clean.slice(0, eqIdx).trim();
  const rhs = clean.slice(eqIdx + 1).trim();
  return { lhs, rhs };
}

function buildScope(
  variables: FormulaVariable[],
  values: Record<string, string>,
  unknownSymbol: string
): Record<string, number> | null {
  const scope: Record<string, number> = {};
  for (const v of variables) {
    if (v.symbol === unknownSymbol) continue;
    const val = parseFloat(values[v.symbol]?.replace(',', '.') || '');
    if (isNaN(val)) return null;
    scope[v.symbol] = val;
  }
  return scope;
}

export default function FormulaCalculator({ formula, variables }: FormulaCalculatorProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [unknown, setUnknown] = useState(variables[0]?.symbol || '');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseFormula(formula), [formula]);

  if (variables.length < 2 || !parsed) return null;

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    const scope = buildScope(variables, values, unknown);
    if (!scope) {
      setError('Preencha todos os valores conhecidos.');
      return;
    }

    try {
      const { lhs, rhs } = parsed;

      // Se a incógnita está no lhs, avaliar rhs
      if (lhs.includes(unknown)) {
        // Tentar avaliar rhs diretamente
        const res = evaluate(rhs, scope);
        setResult(typeof res === 'number' ? Math.round(res * 10000) / 10000 : res);
      } else {
        // Incógnita está no rhs — avaliar lhs
        const res = evaluate(lhs, scope);
        setResult(typeof res === 'number' ? Math.round(res * 10000) / 10000 : res);
      }
    } catch (e: any) {
      setError('Não foi possível calcular. Verifique a fórmula.');
      console.warn('[FormulaCalculator]', e?.message);
    }
  };

  const handleClear = () => {
    setValues({});
    setResult(null);
    setError(null);
  };

  const unknownVar = variables.find((v) => v.symbol === unknown);

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Calculator size={12} /> Calculadora
        </span>
        <button
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Limpar"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Seleção da incógnita */}
      <div className="mb-3">
        <label className="font-body text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
          Calcular
        </label>
        <select
          value={unknown}
          onChange={(e) => {
            setUnknown(e.target.value);
            setResult(null);
          }}
          className="w-full bg-background border border-border rounded px-3 py-1.5 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {variables.map((v) => (
            <option key={v.symbol} value={v.symbol}>
              {v.symbol} — {v.meaning}
            </option>
          ))}
        </select>
      </div>

      {/* Inputs das variáveis conhecidas */}
      <div className="space-y-2">
        {variables
          .filter((v) => v.symbol !== unknown)
          .map((v) => (
            <div key={v.symbol}>
              <label className="font-body text-[10px] text-muted-foreground block mb-0.5">
                {v.symbol}{v.unit ? ` (${v.unit})` : ''}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={values[v.symbol] || ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [v.symbol]: e.target.value }))
                }
                placeholder={v.meaning}
                className="w-full bg-background border border-border rounded px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
      </div>

      {/* Botão calcular */}
      <button
        onClick={handleCalculate}
        className="w-full mt-3 bg-accent text-accent-foreground font-display font-bold text-[13px] tracking-wide py-2.5 rounded-md hover:brightness-95 transition-all duration-150"
      >
        Calcular
      </button>

      {/* Resultado */}
      {result !== null && (
        <div className="mt-3 bg-accent/10 border border-accent/30 rounded-md p-3 text-center">
          <span className="font-body text-[10px] text-muted-foreground uppercase tracking-widest">Resultado</span>
          <p className="font-display font-bold text-2xl text-foreground mt-1">
            {unknownVar?.symbol} = {result}
            {unknownVar?.unit && (
              <span className="text-sm font-normal text-muted-foreground ml-1.5">{unknownVar.unit}</span>
            )}
          </p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <p className="mt-2 font-body text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
