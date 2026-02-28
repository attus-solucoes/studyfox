import katex from 'katex';

interface FormulaRendererProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * Converte fórmula texto-puro para LaTeX básico:
 * - Q_total → Q_{total}
 * - x^2 → x^{2}
 */
function autoLatex(raw: string): string {
  const hasLatex = /[\\{}]/.test(raw);
  if (hasLatex) return raw;

  let tex = raw;
  // subscripts: X_abc → X_{abc} (mas não toca se já tem {})
  tex = tex.replace(/([A-Za-z])_([A-Za-zÀ-ú0-9]+)/g, '$1_{$2}');
  // superscripts: x^2 → x^{2}
  tex = tex.replace(/\^([A-Za-z0-9]+)/g, '^{$1}');
  return tex;
}

export default function FormulaRenderer({ formula, displayMode = true, className = '' }: FormulaRendererProps) {
  try {
    const tex = autoLatex(formula);
    const html = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      trust: true,
    });

    return (
      <div
        className={`overflow-x-auto ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    // Fallback: monospace text
    return (
      <pre className={`font-mono text-sm ${className}`}>
        {formula}
      </pre>
    );
  }
}
