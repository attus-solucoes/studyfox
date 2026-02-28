import { motion } from 'framer-motion';
import { User, Palette, Database, Info, ChevronRight, Download, HardDrive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Config() {
  const { user } = useAuth();
  const { courses } = useApp();

  const totalNodes = courses.flatMap(c => c.subjects.flatMap(s => s.nodes)).length;
  const totalSubjects = courses.flatMap(c => c.subjects).length;

  return (
    <motion.div className="p-6 lg:p-8 max-w-3xl" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="font-display font-extrabold text-[40px] text-ink">Configurações</h1>
        <p className="font-body text-sm text-muted">Perfil, preferências e dados</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={item} className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <User size={14} className="text-muted" />
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">Perfil</span>
        </div>
        <div className="bg-white border border-line rounded-lg p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-lime text-sm">
                {user?.initials || '??'}
              </span>
            </div>
            <div>
              <p className="font-body font-semibold text-[15px] text-ink">{user?.name || 'Usuário'}</p>
              <p className="font-body text-[13px] text-muted">{user?.email || 'email@exemplo.com'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div variants={item} className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={14} className="text-muted" />
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">Preferências</span>
        </div>
        <div className="bg-white border border-line rounded-lg divide-y divide-line">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-body font-semibold text-[14px] text-ink">Tema</p>
              <p className="font-body text-[12px] text-muted">Modo claro ativado</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-5 rounded-full bg-line relative">
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-ink transition-all" />
              </div>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-body font-semibold text-[14px] text-ink">Modelo de IA</p>
              <p className="font-body text-[12px] text-muted">Usado para gerar grafos e exercícios</p>
            </div>
            <span className="font-mono text-[12px] text-muted bg-paper border border-line px-2.5 py-1 rounded">
              gemini-2.0-flash
            </span>
          </div>
        </div>
      </motion.div>

      {/* Data */}
      <motion.div variants={item} className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Database size={14} className="text-muted" />
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">Dados</span>
        </div>
        <div className="bg-white border border-line rounded-lg divide-y divide-line">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive size={16} className="text-muted" />
              <div>
                <p className="font-body font-semibold text-[14px] text-ink">Armazenamento</p>
                <p className="font-body text-[12px] text-muted">
                  {courses.length} curso{courses.length !== 1 ? 's' : ''} · {totalSubjects} matéria{totalSubjects !== 1 ? 's' : ''} · {totalNodes} conceito{totalNodes !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <span className="font-body text-[11px] text-muted">localStorage</span>
          </div>
          <div className="p-4">
            <button className="flex items-center gap-2 font-body text-[13px] text-muted hover:text-ink transition-all duration-[120ms]">
              <Download size={14} />
              Exportar dados
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* About */}
      <motion.div variants={item} className="mt-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-muted" />
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">Sobre</span>
        </div>
        <div className="bg-white border border-line rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">🦊</span>
            <div>
              <p className="font-display font-bold text-[16px] text-ink">StudyOS</p>
              <p className="font-mono text-[11px] text-muted">v0.1 beta</p>
            </div>
          </div>
          <p className="font-body text-[13px] text-muted">
            Feito com IA para estudantes universitários. Transforme qualquer material em um grafo de conhecimento interativo.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
