import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { ProgressInfo } from '@/lib/generateGraph';

const MOTIVATIONAL_PHRASES = [
  'A IA está lendo cada linha do seu material',
  'Gerando explicações que seu professor não deu',
  'Criando exercícios com gabarito completo',
  'Mapeando o que você precisa aprender primeiro',
];

interface Props {
  progress: ProgressInfo | null;
  visible: boolean;
}

export default function GraphGenerationOverlay({ progress, visible }: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [showLongWarning, setShowLongWarning] = useState(false);

  // Rotate motivational phrases every 8s
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setPhraseIndex(i => (i + 1) % MOTIVATIONAL_PHRASES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [visible]);

  // Show long-wait warning after 60s
  useEffect(() => {
    if (!visible) {
      setShowLongWarning(false);
      return;
    }
    const timeout = setTimeout(() => setShowLongWarning(true), 60000);
    return () => clearTimeout(timeout);
  }, [visible, startTime]);

  // Map progress to a percentage for the bar
  const percent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 5;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />
          <motion.div
            className="relative bg-white border border-line rounded-xl p-8 w-full max-w-md shadow-xl z-10 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Animated fox */}
            <motion.p
              className="text-5xl mb-4"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              🦊
            </motion.p>

            {/* Current step */}
            <h2 className="font-display font-bold text-lg text-ink mb-1">
              {progress?.step || 'Preparando análise...'}
            </h2>

            {/* Step detail */}
            {progress?.detail && (
              <p className="font-body text-sm text-muted mb-4">{progress.detail}</p>
            )}
            {!progress?.detail && <div className="mb-4" />}

            {/* Progress bar — no numeric percentage */}
            <div className="w-full h-2 bg-line rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-lime rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {/* Time estimate */}
            <p className="font-body text-[11px] text-muted mb-3">
              ~2 minutos para PDFs grandes
            </p>

            {/* Motivational phrase */}
            <AnimatePresence mode="wait">
              <motion.p
                key={phraseIndex}
                className="font-body text-[13px] text-ink/70 italic"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
              >
                "{MOTIVATIONAL_PHRASES[phraseIndex]}"
              </motion.p>
            </AnimatePresence>

            {/* Long wait warning */}
            <AnimatePresence>
              {showLongWarning && (
                <motion.div
                  className="mt-4 bg-paper border border-line rounded-md p-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <p className="font-body text-[12px] text-muted">
                    📚 Material extenso detectado — pode levar até 3 minutos
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
